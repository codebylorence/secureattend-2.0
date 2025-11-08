using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class EnrollmentPage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService = new();

        // small in-memory fallback credential (replace in production)
        private const string FallbackAdminUser = "admin";
        private const string FallbackAdminPass = "secret123";

        public EnrollmentPage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService;

            // subscribe to service events
            _zkService.OnImageCaptured += ImgCaptured;
            _zkService.OnStatus += msg =>
            {
                Dispatcher.Invoke(() => StatusText.Text = msg);
                LogHelper.Write($"[ZK STATUS] {msg}");
            };

            // start locked: overlay visible and buttons disabled (XAML already sets this)
            SetControlsEnabled(false);
        }

        private void SetControlsEnabled(bool enabled)
        {
            ConnectBtn.IsEnabled = enabled;
            EnrollBtn.IsEnabled = enabled;
        }

        private void ImgCaptured(byte[] imgBytes)
        {
            Dispatcher.Invoke(() =>
            {
                try
                {
                    var bmp = ConvertToBitmapImage(imgBytes);
                    if (bmp != null)
                        FingerprintPreview.Source = bmp;
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"Image preview conversion failed: {ex.Message}");
                }
            });
        }

        private BitmapSource? ConvertToBitmapImage(byte[] rawImage)
        {
            int width = _zkService.SensorWidth;
            int height = _zkService.SensorHeight;
            int expected = _zkService.ExpectedImageSize;

            if (width <= 0 || height <= 0) return null;
            if (rawImage == null || rawImage.Length != expected) return null;

            int stride = width;
            var bmp = BitmapSource.Create(width, height, 96, 96,
                System.Windows.Media.PixelFormats.Gray8, null, rawImage, stride);
            bmp.Freeze();
            return bmp;
        }

        // ---------------- Admin overlay handlers ----------------

        private void AdminCancelBtn_Click(object sender, RoutedEventArgs e)
        {
            // Navigate back to AttendancePage instead of just clearing fields
            try
            {
                var attendancePage = new AttendancePage(_zkService);
                NavigationService?.Navigate(attendancePage);
                LogHelper.Write("[ADMIN] canceled login - returned to Attendance Page.");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"[ADMIN] cancel navigation failed: {ex.Message}");
            }
        }


        // Not async — no awaits inside
        private void AdminLoginBtn_Click(object sender, RoutedEventArgs e)
        {
            string username = AdminUsername.Text.Trim();
            string password = AdminPassword.Password;

            AdminLoginStatus.Visibility = Visibility.Collapsed;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                AdminLoginStatus.Text = "Please enter username and password.";
                AdminLoginStatus.Visibility = Visibility.Visible;
                return;
            }

            // Try to validate via DataService if available (non-breaking if not)
            bool ok = false;
            try
            {
                // If your DataService has a ValidateAdmin method (bool ValidateAdmin(user, pass)), it will be used.
                // Use reflection to avoid hard dependency; if present we call it.
                var validateMethod = _dataService?.GetType().GetMethod("ValidateAdmin");
                if (validateMethod != null)
                {
                    var result = validateMethod.Invoke(_dataService, new object[] { username, password });
                    if (result is bool b && b) ok = true;
                }
            }
            catch
            {
                // ignore reflection errors — fallback below
            }

            // fallback check if DataService didn't validate
            if (!ok)
            {
                // simple constant-time-ish comparison (not production-grade)
                ok = SecureEquals(username, FallbackAdminUser) && SecureEquals(password, FallbackAdminPass);
            }

            if (ok)
            {
                // hide overlay and enable controls
                AdminOverlay.Visibility = Visibility.Collapsed;
                SetControlsEnabled(true);

                // focus EmployeeIdInput for convenience
                EmployeeIdInput.Focus();
                StatusText.Text = "🔒 Admin authenticated. You may proceed.";
                LogHelper.Write("[ADMIN] login successful.");
            }
            else
            {
                AdminLoginStatus.Text = "Invalid username or password.";
                AdminLoginStatus.Visibility = Visibility.Visible;
                LogHelper.Write("[ADMIN] login failed for user: " + username);
            }
        }

        // constant-time string compare
        private static bool SecureEquals(string a, string b)
        {
            if (a == null || b == null) return false;
            if (a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++)
                diff |= a[i] ^ b[i];
            return diff == 0;
        }

        // ---------------- existing handlers (Connect / Enroll / Back) ----------------

        private void BackBtn_Click(object sender, RoutedEventArgs e)
        {
            NavigationService?.GoBack();
        }

        private void ConnectBtn_Click(object sender, RoutedEventArgs e)
        {
            ConnectBtn.IsEnabled = false;
            Task.Run(() =>
            {
                bool connected = _zkService.Initialize();
                Dispatcher.Invoke(() =>
                {
                    if (connected)
                    {
                        StatusText.Text = "✅ Device connected successfully.";
                        EnrollBtn.IsEnabled = true;
                        ConnectBtn.IsEnabled = false;
                    }
                    else
                    {
                        StatusText.Text = "❌ Failed to connect device.";
                        ConnectBtn.IsEnabled = true;
                    }
                });
            });
        }

        private async void EnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            string empId = EmployeeIdInput.Text.Trim();
            if (string.IsNullOrEmpty(empId))
            {
                StatusText.Text = "⚠️ Please enter Employee ID first.";
                return;
            }

            // ✅ Step 1: Check from Web API
            try
            {
                using var client = new HttpClient();
                string url = $"http://localhost:5000/employees/{empId}";
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    StatusText.Text = "❌ Employee does not exist in the system.";
                    return;
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = $"💥 Could not connect to server: {ex.Message}";
                return;
            }

            // ✅ Step 2: Check if already enrolled locally
            var existing = _dataService.GetAllEnrollments().Find(e => e.EmployeeId == empId);

            if (!string.IsNullOrEmpty(existing.EmployeeId))
            {
                StatusText.Text = "⚠️ Employee already enrolled.";
                return;
            }

            // ✅ Step 3: Proceed with fingerprint enrollment
            StatusText.Text = "🖐️ Please place your finger 3 times...";
            EnrollBtn.IsEnabled = false;

            try
            {
                string? template = await Task.Run(() => _zkService.EnrollFingerprint(empId));
                if (!string.IsNullOrEmpty(template))
                {
                    _dataService.SaveEnrollment(empId, template);
                    StatusText.Text = $"✅ Enrollment saved locally for {empId}";
                }
                else
                {
                    StatusText.Text = $"❌ Enrollment failed for {empId}";
                }
            }
            finally
            {
                EnrollBtn.IsEnabled = true;
            }
        }
    }
}
