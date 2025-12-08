using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using BiometricEnrollmentApp.Services;
using System.Collections.Generic;
using System.Linq;

namespace BiometricEnrollmentApp
{
    // Matches your API JSON: "employeeId", "fullname", "department"
    public record EmployeeDto(string employeeId, string fullname, string department);

    public partial class EnrollmentPage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService = new();

        private const string FallbackAdminUser = "admin";
        private const string FallbackAdminPass = "secret123";

        public EnrollmentPage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();

            // Hook SDK events
            _zkService.OnImageCaptured += ImgCaptured;
            _zkService.OnStatus += msg =>
            {
                Dispatcher.Invoke(() => StatusText.Text = msg);
                LogHelper.Write($"[ZK STATUS] {msg}");
            };

            SetControlsEnabled(false); // disabled until admin login

            // Auto-sync deleted employees every 5 minutes
            var syncTimer = new System.Timers.Timer(5 * 60 * 1000); // every 5 minutes
            syncTimer.Elapsed += async (_, _) => await SyncDeletionsFromServerAsync();
            syncTimer.Start();

            // Auto-init device & load templates on page load
            Loaded += EnrollmentPage_Loaded;
        }

        private void SetControlsEnabled(bool enabled)
        {
            // Enable enroll button for admin
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

        // Called when the page loads: ensure device initialized and load stored templates into SDK
        private void EnrollmentPage_Loaded(object? sender, RoutedEventArgs e)
        {
            // Apply blur effect to main content since overlay is visible by default
            var mainContent = this.FindName("MainContentGrid") as Grid;
            if (mainContent != null)
            {
                mainContent.Effect = new System.Windows.Media.Effects.BlurEffect { Radius = 10 };
            }
            
            // Load fingerprint records into the grid
            RefreshEnrollmentRecords();
            
            Task.Run(async () =>
            {
                try
                {
                    // Ensure device is initialized (idempotent)
                    if (_zkService.EnsureInitialized())
                    {
                        try
                        {
                            // Load stored templates into SDK memory (so identify works immediately)
                            _zkService.LoadEnrollmentsToSdk(_dataService);
                            Dispatcher.Invoke(() => StatusText.Text = "Device connected and templates loaded.");
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ LoadEnrollmentsToSdk error: {ex.Message}");
                            Dispatcher.Invoke(() => StatusText.Text = "Device connected (load templates failed).");
                        }

                        // Run initial sync on page load
                        try
                        {
                            await SyncDeletionsFromServerAsync();
                            // Refresh records after sync
                            Dispatcher.Invoke(() => RefreshEnrollmentRecords());
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ Initial sync failed: {ex.Message}");
                        }
                    }
                    else
                    {
                        Dispatcher.Invoke(() => StatusText.Text = "⚠️ Device not connected.");
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"⚠️ EnrollmentPage initialization failed: {ex.Message}");
                    Dispatcher.Invoke(() => StatusText.Text = $"Init error: {ex.Message}");
                }
            });
        }



        // ---------------- Admin overlay handlers ----------------

        private void AdminCancelBtn_Click(object sender, RoutedEventArgs e)
        {
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

            bool ok = false;
            try
            {
                var validateMethod = _dataService?.GetType().GetMethod("ValidateAdmin");
                if (validateMethod != null)
                {
                    var result = validateMethod.Invoke(_dataService, new object[] { username, password });
                    if (result is bool b && b) ok = true;
                }
            }
            catch { }

            if (!ok)
            {
                ok = SecureEquals(username, FallbackAdminUser) && SecureEquals(password, FallbackAdminPass);
            }

            if (ok)
            {
                AdminOverlay.Visibility = Visibility.Collapsed;
                
                // Remove blur effect from main content
                var mainContent = this.FindName("MainContentGrid") as Grid;
                if (mainContent != null)
                {
                    mainContent.Effect = null;
                }
                
                SetControlsEnabled(true);
                EmployeeIdInput.Focus();
                StatusText.Text = "🔒 Admin authenticated. You may proceed.";
                LogHelper.Write("[ADMIN] login successful.");
                // Do NOT call destructive sync automatically here.
            }
            else
            {
                AdminLoginStatus.Text = "Invalid username or password.";
                AdminLoginStatus.Visibility = Visibility.Visible;
                LogHelper.Write("[ADMIN] login failed for user: " + username);
            }
        }

        private static bool SecureEquals(string a, string b)
        {
            if (a == null || b == null) return false;
            if (a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++)
                diff |= a[i] ^ b[i];
            return diff == 0;
        }

        // ---------------- Settings handlers ----------------

        private void SettingsBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Load current setting
                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                int currentThreshold = settingsService.GetLateThresholdMinutes();
                LateThresholdInput.Text = currentThreshold.ToString();
                
                // Show overlay
                SettingsOverlay.Visibility = Visibility.Visible;
                SettingsStatus.Visibility = Visibility.Collapsed;
                LateThresholdInput.Focus();
                LateThresholdInput.SelectAll();
                
                LogHelper.Write($"⚙️ Settings opened (current threshold: {currentThreshold} min)");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error opening settings: {ex.Message}");
            }
        }

        private void SettingsCancelBtn_Click(object sender, RoutedEventArgs e)
        {
            SettingsOverlay.Visibility = Visibility.Collapsed;
            SettingsStatus.Visibility = Visibility.Collapsed;
            LogHelper.Write("⚙️ Settings cancelled");
        }

        private void SettingsSaveBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string input = LateThresholdInput.Text.Trim();
                
                if (!int.TryParse(input, out int minutes))
                {
                    SettingsStatus.Text = "❌ Please enter a valid number.";
                    SettingsStatus.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                    SettingsStatus.Visibility = Visibility.Visible;
                    return;
                }

                if (minutes < 0 || minutes > 60)
                {
                    SettingsStatus.Text = "❌ Value must be between 0 and 60 minutes.";
                    SettingsStatus.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                    SettingsStatus.Visibility = Visibility.Visible;
                    return;
                }

                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                bool success = settingsService.SetLateThresholdMinutes(minutes);

                if (success)
                {
                    SettingsStatus.Text = $"✅ Late threshold updated to {minutes} minutes!";
                    SettingsStatus.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(5, 150, 105));
                    SettingsStatus.Visibility = Visibility.Visible;
                    
                    LogHelper.Write($"✅ Late threshold updated to {minutes} minutes");
                    
                    // Close after 1.5 seconds
                    var timer = new System.Windows.Threading.DispatcherTimer();
                    timer.Interval = TimeSpan.FromSeconds(1.5);
                    timer.Tick += (s, args) =>
                    {
                        timer.Stop();
                        SettingsOverlay.Visibility = Visibility.Collapsed;
                        SettingsStatus.Visibility = Visibility.Collapsed;
                    };
                    timer.Start();
                }
                else
                {
                    SettingsStatus.Text = "❌ Failed to save settings.";
                    SettingsStatus.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                    SettingsStatus.Visibility = Visibility.Visible;
                }
            }
            catch (Exception ex)
            {
                SettingsStatus.Text = $"❌ Error: {ex.Message}";
                SettingsStatus.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                SettingsStatus.Visibility = Visibility.Visible;
                LogHelper.Write($"💥 Error saving settings: {ex.Message}");
            }
        }

        // ---------------- Main handlers ----------------

        private void BackBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                LogHelper.Write("📤 Navigating back to attendance page");
                // Navigate back to attendance page, which will restart continuous scanning
                NavigationService?.Navigate(new AttendancePage(_zkService));
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Navigation error: {ex.Message}");
                StatusText.Text = $"❌ Navigation error: {ex.Message}";
            }
        }

        // removed ConnectBtn_Click entirely (no connect button on page any more)

        private async void EnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            string empId = EmployeeIdInput.Text.Trim();
            if (string.IsNullOrEmpty(empId))
            {
                StatusText.Text = "⚠️ Please enter Employee ID first.";
                return;
            }

            // -------- Step 1: Get employee info (fullname + department) --------
            string name = string.Empty;
            string department = string.Empty;

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

                try
                {
                    var emp = await response.Content.ReadFromJsonAsync<EmployeeDto?>();
                    if (emp != null)
                    {
                        name = emp.fullname ?? string.Empty;
                        department = emp.department ?? string.Empty;
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"Could not parse employee JSON: {ex.Message}");
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = $"💥 Could not connect to server: {ex.Message}";
                return;
            }

            // -------- Step 2: Check if employee already has enrollment --------
            var allEnrollments = _dataService.GetAllEnrollments();
            var existingEnrollment = allEnrollments.FirstOrDefault(e => e.EmployeeId == empId);
            bool hasExisting = !string.IsNullOrEmpty(existingEnrollment.EmployeeId);
            
            if (hasExisting)
            {
                var result = MessageBox.Show(
                    $"Employee {empId} ({name}) already has a fingerprint enrolled.\n\n" +
                    "Do you want to re-enroll and replace the existing fingerprint?",
                    "Re-enrollment Confirmation",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (result != MessageBoxResult.Yes)
                {
                    StatusText.Text = "❌ Re-enrollment cancelled.";
                    return;
                }
                
                StatusText.Text = "🔄 Re-enrolling fingerprint...";
                LogHelper.Write($"Re-enrolling fingerprint for {empId} (replacing existing enrollment)");
            }
            else
            {
                StatusText.Text = "🆕 New enrollment...";
                LogHelper.Write($"New enrollment for {empId}");
            }

            // -------- Step 3: Proceed with enrollment --------
            StatusText.Text = "🖐️ Please place your finger 3 times...";
            EnrollBtn.IsEnabled = false;

            try
            {
                // perform enrollment (blocking on background thread)
                string? template = await Task.Run(() => _zkService.EnrollFingerprint(empId));
                if (!string.IsNullOrEmpty(template))
                {
                    // -------- Step 4: Confirmation dialog --------
                    StatusText.Text = "✅ Fingerprint captured successfully!";
                    
                    var confirmResult = MessageBox.Show(
                        $"Fingerprint captured successfully for Employee {empId} ({name}).\n\n" +
                        "Do you want to save this enrollment?\n\n" +
                        "Click 'Yes' to save or 'No' to cancel.",
                        "Confirm Enrollment",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (confirmResult != MessageBoxResult.Yes)
                    {
                        StatusText.Text = "❌ Enrollment cancelled by user.";
                        LogHelper.Write($"Enrollment cancelled by user for {empId}");
                        EnrollBtn.IsEnabled = true;
                        return;
                    }

                    // -------- Step 5: Save enrollment --------
                    StatusText.Text = "💾 Saving enrollment...";
                    
                    // If re-enrolling, delete the old enrollment first
                    if (hasExisting)
                    {
                        try
                        {
                            _dataService.DeleteEnrollment(empId);
                            LogHelper.Write($"Deleted old enrollment for {empId} before re-enrollment");
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ Failed to delete old enrollment: {ex.Message}");
                        }
                    }

                    // Save enrollment and get the inserted row id
                    long rowId = _data_service_save_enrollment(empId, template, name, department);

                    if (rowId > 0)
                    {
                        // Load the new template into SDK using row id as fid
                        try
                        {
                            var blob = Convert.FromBase64String(template);
                            bool loaded = _zkService.AddTemplateToSdk((int)rowId, blob);
                            if (!loaded)
                            {
                                LogHelper.Write($"⚠️ Enrollment saved but AddTemplateToSdk returned false for row {rowId}.");
                            }
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"💥 Failed to add template to SDK for row {rowId}: {ex.Message}");
                        }

                        string action = hasExisting ? "Re-enrolled" : "Enrolled";
                        StatusText.Text = $"✅ {action} successfully for {empId} (row {rowId})";
                        LogHelper.Write($"{action} for {empId} ({name}, {department}) -> row {rowId}");
                        
                        // Refresh the enrollment records grid
                        RefreshEnrollmentRecords();
                    }
                    else
                    {
                        StatusText.Text = $"❌ Failed to save enrollment for {empId}";
                        LogHelper.Write($"❌ SaveEnrollment returned {rowId} for {empId}");
                    }
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

        // ---------------- Safe sync helpers ----------------

        /// <summary>
        /// Non-destructive check: queries server and logs which local enrollments are missing on server.
        /// Useful to run on a timer for monitoring but does NOT delete anything.
        /// </summary>
        private async Task SafeSyncCheckAsync()
        {
            try
            {
                using var client = new HttpClient();
                string url = "http://localhost:5000/employees";
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>(url);
                if (employees == null || employees.Count == 0) return;

                var apiIds = employees.Select(e => e.employeeId).ToHashSet();
                var local = _data_service_get().GetAllEnrollments();
                var missing = local.Where(l => !apiIds.Contains(l.EmployeeId)).Select(l => l.EmployeeId).ToList();
                if (missing.Count > 0)
                {
                    LogHelper.Write($"⚠️ Sync check found {missing.Count} local employees missing on server: {string.Join(',', missing)} (no deletion performed).");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Safe sync check failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Sync with server: deletes local enrollments for employees that no longer exist on server.
        /// Creates a backup before deletion and only runs if server connection is successful.
        /// Runs automatically every 5 minutes.
        /// </summary>
        private async Task SyncDeletionsFromServerAsync()
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10); // 10 second timeout
                string url = "http://localhost:5000/employees";
                
                // Try to fetch employees from server
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>(url);

                // Guard: if the API returned null or an empty list, skip deletion entirely.
                if (employees == null)
                {
                    LogHelper.Write("⚠️ Sync aborted: server returned null for employees list.");
                    return;
                }

                if (employees.Count == 0)
                {
                    // Defensive: server returned empty list -> do not delete local records.
                    LogHelper.Write("⚠️ Sync aborted: server returned an empty employees list. No deletions performed.");
                    return;
                }

                // Get active employees only (exclude inactive)
                var activeEmployeeIds = employees
                    .Where(e => e.employeeId != null)
                    .Select(e => e.employeeId)
                    .ToHashSet();
                
                var local = _dataService.GetAllEnrollments();

                // Find enrollments that need to be deleted (not in server list)
                var toDelete = local.Where(enroll => !activeEmployeeIds.Contains(enroll.EmployeeId)).ToList();

                if (toDelete.Count == 0)
                {
                    LogHelper.Write("✅ Sync check: All local enrollments match server. No deletions needed.");
                    return;
                }

                // Safety check: only abort if ALL records would be deleted
                if (toDelete.Count == local.Count && local.Count > 0)
                {
                    LogHelper.Write($"⚠️ Sync aborted: Would delete ALL {local.Count} enrollments. Server might be returning wrong data.");
                    return;
                }

                // Make a backup of the DB before any destructive operation
                try
                {
                    var dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
                    if (File.Exists(dbPath))
                    {
                        var backupPath = dbPath + ".bak." + DateTime.Now.ToString("yyyyMMddHHmmss");
                        File.Copy(dbPath, backupPath);
                        LogHelper.Write($"🗄️ Backup created before sync: {backupPath}");
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"⚠️ Failed to create DB backup before sync: {ex.Message} — aborting deletion for safety.");
                    return;
                }

                // Delete enrollments for employees no longer on server
                int deleted = 0;
                foreach (var enroll in toDelete)
                {
                    try
                    {
                        LogHelper.Write($"🗑️ Deleting enrollment for {enroll.EmployeeId} ({enroll.Name}) - not found on server");
                        _dataService.DeleteEnrollment(enroll.EmployeeId);
                        deleted++;
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"❌ Failed to delete enrollment for {enroll.EmployeeId}: {ex.Message}");
                    }
                }

                if (deleted > 0)
                {
                    LogHelper.Write($"✅ Sync complete: {deleted} enrollment(s) deleted from local database.");
                    
                    // Reload templates into SDK after deletion
                    try
                    {
                        _zkService.LoadEnrollmentsToSdk(_dataService);
                        LogHelper.Write("🔄 Templates reloaded into SDK after sync.");
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ Failed to reload templates after sync: {ex.Message}");
                    }
                }
            }
            catch (HttpRequestException ex)
            {
                // Server not reachable - this is expected when offline, don't spam logs
                LogHelper.Write($"ℹ️ Sync skipped: Server not reachable ({ex.Message})");
            }
            catch (TaskCanceledException)
            {
                LogHelper.Write("ℹ️ Sync skipped: Server request timed out");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Sync error: {ex.Message}");
            }
        }

        // small wrapper for DataService.SaveEnrollment so we can centralize logging or adjust behavior
        private long _data_service_save_enrollment(string employeeId, string templateBase64, string? name, string? department)
        {
            try
            {
                var id = _dataService.SaveEnrollment(employeeId, templateBase64, name, department);
                return id;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 _data_service_save_enrollment error: {ex.Message}");
                return -1;
            }
        }

        // helper to centralize use of data service (keeps future refactors simple)
        private DataService _data_service_get() => _dataService;

        // Refresh the enrollment records grid
        private void RefreshEnrollmentRecords()
        {
            try
            {
                var enrollments = _dataService.GetAllEnrollments();
                var rows = enrollments.Select(e => new
                {
                    EmployeeId = e.EmployeeId,
                    Name = e.Name ?? "N/A",
                    Department = e.Department ?? "N/A",
                    CreatedAt = "Enrolled"
                }).ToList();

                var grid = this.FindName("EnrollmentsGrid") as DataGrid;
                if (grid != null)
                {
                    grid.ItemsSource = rows;
                    LogHelper.Write($"📋 Loaded {rows.Count} enrollment records");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Failed to load enrollment records: {ex.Message}");
                StatusText.Text = $"Failed to load records: {ex.Message}";
            }
        }

        // Refresh button click handler
        private void RefreshRecordsBtn_Click(object sender, RoutedEventArgs e)
        {
            RefreshEnrollmentRecords();
            StatusText.Text = "✅ Records refreshed";
        }

        // Delete enrollment button click handler
        private void DeleteEnrollmentBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (sender is Button btn && btn.Tag is string employeeId)
                {
                    // Confirm deletion
                    var result = MessageBox.Show(
                        $"Are you sure you want to delete the fingerprint record for Employee ID: {employeeId}?",
                        "Confirm Deletion",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Warning);

                    if (result == MessageBoxResult.Yes)
                    {
                        _dataService.DeleteEnrollment(employeeId);
                        LogHelper.Write($"🗑️ Deleted enrollment for {employeeId}");
                        
                        // Reload templates into SDK after deletion
                        try
                        {
                            _zkService.LoadEnrollmentsToSdk(_dataService);
                            LogHelper.Write("🔄 Templates reloaded into SDK after deletion");
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ Failed to reload templates: {ex.Message}");
                        }
                        
                        // Refresh the grid
                        RefreshEnrollmentRecords();
                        StatusText.Text = $"✅ Deleted fingerprint for {employeeId}";
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Delete enrollment error: {ex.Message}");
                StatusText.Text = $"❌ Delete failed: {ex.Message}";
                MessageBox.Show($"Failed to delete enrollment: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
