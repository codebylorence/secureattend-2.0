using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Windows;
using BiometricEnrollmentApp.Services;


namespace BiometricEnrollmentApp
{
    public partial class MainWindow : Window
    {
        private readonly ZKTecoService _zkService = new();
        private readonly DataService _dataService = new();

        public MainWindow()
        {
            InitializeComponent();

            _zkService.OnStatus += msg =>
            {
                Dispatcher.Invoke(() => StatusText.Text = msg);
            };
        }

        private void ConnectBtn_Click(object sender, RoutedEventArgs e)
        {
            LogHelper.Write("🔌 User clicked Connect Device");

            if (_zkService.Initialize())
            {
                StatusText.Text = "✅ Device connected successfully.";
                LogHelper.Write("✅ Device connected successfully.");
                EnrollBtn.IsEnabled = true;
            }
            else
            {
                StatusText.Text = "❌ Failed to connect device.";
                LogHelper.Write("❌ Failed to connect device.");
            }
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
            var existing = _dataService.GetAllEnrollments()
                .Find(e => e.EmployeeId == empId);
            if (existing.EmployeeId != null)
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
