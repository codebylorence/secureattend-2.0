using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AdminSettingsPage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private readonly SettingsService _settingsService;

        public AdminSettingsPage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();
            _settingsService = new SettingsService();

            Loaded += AdminSettingsPage_Loaded;
        }

        private void AdminSettingsPage_Loaded(object sender, RoutedEventArgs e)
        {
            LoadSystemInformation();
            CheckDeviceStatus();
            LoadAttendanceSettings();
            LoadAdminAccountInfo();
        }

        private void LoadAttendanceSettings()
        {
            try
            {
                // Load current settings
                LateThresholdInput.Text = _settingsService.GetLateThresholdMinutes().ToString();
                ClockInGraceInput.Text = _settingsService.GetClockInGracePeriodMinutes().ToString();
                ClockOutGraceInput.Text = _settingsService.GetClockOutGracePeriodMinutes().ToString();
                EarlyClockInBufferInput.Text = _settingsService.GetEarlyClockInBufferHours().ToString();
                
                // Load API URL
                ServerUrlTextBox.Text = _settingsService.GetApiBaseUrl();
                
                // Load clock-out confirmation setting
                ClockOutConfirmationCheckBox.IsChecked = LoadClockOutConfirmationSetting();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Error loading attendance settings: {ex.Message}");
                MessageBox.Show($"Error loading attendance settings: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private void SaveAttendanceSettingsBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Validate inputs
                if (!int.TryParse(LateThresholdInput.Text.Trim(), out int lateThreshold) || lateThreshold < 0 || lateThreshold > 120)
                {
                    MessageBox.Show("Late threshold must be a number between 0 and 120 minutes.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    LateThresholdInput.Focus();
                    return;
                }

                if (!int.TryParse(ClockInGraceInput.Text.Trim(), out int clockInGrace) || clockInGrace < 0 || clockInGrace > 60)
                {
                    MessageBox.Show("Clock-in grace period must be a number between 0 and 60 minutes.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    ClockInGraceInput.Focus();
                    return;
                }

                if (!int.TryParse(ClockOutGraceInput.Text.Trim(), out int clockOutGrace) || clockOutGrace < 0 || clockOutGrace > 60)
                {
                    MessageBox.Show("Clock-out grace period must be a number between 0 and 60 minutes.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    ClockOutGraceInput.Focus();
                    return;
                }

                if (!int.TryParse(EarlyClockInBufferInput.Text.Trim(), out int earlyBuffer) || earlyBuffer < 0 || earlyBuffer > 12)
                {
                    MessageBox.Show("Early clock-in buffer must be a number between 0 and 12 hours.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    EarlyClockInBufferInput.Focus();
                    return;
                }

                // Save settings
                bool success = true;
                success &= _settingsService.SetLateThresholdMinutes(lateThreshold);
                success &= _settingsService.SetClockInGracePeriodMinutes(clockInGrace);
                success &= _settingsService.SetClockOutGracePeriodMinutes(clockOutGrace);
                success &= _settingsService.SetEarlyClockInBufferHours(earlyBuffer);
                success &= SaveClockOutConfirmationSetting(ClockOutConfirmationCheckBox.IsChecked == true);

                if (success)
                {
                    MessageBox.Show("Attendance settings saved successfully!", "Settings Saved", MessageBoxButton.OK, MessageBoxImage.Information);
                    LogHelper.Write($"✅ Attendance settings updated - Late: {lateThreshold}min, Clock-in Grace: {clockInGrace}min, Clock-out Grace: {clockOutGrace}min, Early Buffer: {earlyBuffer}h, Clock-out Confirmation: {ClockOutConfirmationCheckBox.IsChecked == true}");
                    
                    // Clear configuration cache so new settings take effect immediately
                    ClearConfigurationCache();
                }
                else
                {
                    MessageBox.Show("Failed to save some settings. Please check the logs for details.", "Save Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error saving attendance settings: {ex.Message}");
                MessageBox.Show($"Error saving attendance settings: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void LoadSystemInformation()
        {
            try
            {
                // Build date
                var buildDate = File.GetCreationTime(System.Reflection.Assembly.GetExecutingAssembly().Location);
                BuildDateText.Text = buildDate.ToString("yyyy-MM-dd HH:mm:ss");

                // Database path
                var dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
                DatabasePathText.Text = dbPath;

                // Database info
                if (File.Exists(dbPath))
                {
                    var fileInfo = new FileInfo(dbPath);
                    DatabaseInfoText.Text = $"Size: {fileInfo.Length / 1024:N0} KB, Modified: {fileInfo.LastWriteTime:yyyy-MM-dd HH:mm}";
                }
                else
                {
                    DatabaseInfoText.Text = "Database file not found";
                }

                // Last sync (placeholder)
                LastSyncText.Text = "Not implemented";
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Error loading system information: {ex.Message}");
            }
        }

        private void CheckDeviceStatus()
        {
            try
            {
                if (_zkService.EnsureInitialized())
                {
                    DeviceStatusText.Text = "✅ Connected and ready";
                    DeviceStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Green);
                }
                else
                {
                    DeviceStatusText.Text = "❌ Not connected";
                    DeviceStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                }
            }
            catch (Exception ex)
            {
                DeviceStatusText.Text = $"❌ Error: {ex.Message}";
                DeviceStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
            }
        }

        private void TestDeviceBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                TestDeviceBtn.IsEnabled = false;
                TestDeviceBtn.Content = "⏳ Testing...";

                Task.Run(() =>
                {
                    try
                    {
                        bool isConnected = _zkService.EnsureInitialized();
                        
                        Dispatcher.Invoke(() =>
                        {
                            if (isConnected)
                            {
                                DeviceStatusText.Text = "✅ Device test successful";
                                DeviceStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Green);
                                MessageBox.Show("Fingerprint device is working correctly.", "Device Test", MessageBoxButton.OK, MessageBoxImage.Information);
                            }
                            else
                            {
                                DeviceStatusText.Text = "❌ Device test failed";
                                DeviceStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                                MessageBox.Show("Could not connect to fingerprint device. Please check the connection.", "Device Test", MessageBoxButton.OK, MessageBoxImage.Warning);
                            }
                        });
                    }
                    catch (Exception ex)
                    {
                        Dispatcher.Invoke(() =>
                        {
                            DeviceStatusText.Text = $"❌ Error: {ex.Message}";
                            DeviceStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                            MessageBox.Show($"Device test error: {ex.Message}", "Device Test", MessageBoxButton.OK, MessageBoxImage.Error);
                        });
                    }
                    finally
                    {
                        Dispatcher.Invoke(() =>
                        {
                            TestDeviceBtn.IsEnabled = true;
                            TestDeviceBtn.Content = "🔍 Test Device";
                        });
                    }
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error testing device: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                TestDeviceBtn.IsEnabled = true;
                TestDeviceBtn.Content = "🔍 Test Device";
            }
        }

        private async void TestConnectionBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                TestConnectionBtn.IsEnabled = false;
                TestConnectionBtn.Content = "⏳ Testing...";
                ConnectionStatusText.Text = "Testing connection...";
                ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Gray);

                // Get the URL from the textbox
                string apiUrl = ServerUrlTextBox.Text.Trim().TrimEnd('/');
                
                if (string.IsNullOrWhiteSpace(apiUrl))
                {
                    ConnectionStatusText.Text = "❌ Please enter a valid URL";
                    ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                    return;
                }

                // Test connection by trying to fetch employees
                var testApiService = new ApiService(apiUrl);
                var employees = await testApiService.GetAllEmployeesAsync();

                if (employees != null && employees.Count >= 0)
                {
                    // Save the URL if connection is successful
                    _settingsService.SetApiBaseUrl(apiUrl);
                    _apiService.UpdateBaseUrl(apiUrl);
                    
                    ConnectionStatusText.Text = $"✅ Connected successfully ({employees.Count} employees found)";
                    ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Green);
                    MessageBox.Show($"Server connection successful!\n\nFound {employees.Count} employees in the system.\n\nAPI URL has been saved.", 
                                  "Connection Test", MessageBoxButton.OK, MessageBoxImage.Information);
                    
                    LogHelper.Write($"✅ API connection test successful: {apiUrl} ({employees.Count} employees)");
                }
                else
                {
                    ConnectionStatusText.Text = "❌ Connection failed - No response from server";
                    ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                    MessageBox.Show($"Could not connect to server at:\n{apiUrl}\n\nPlease check:\n• The URL is correct\n• The server is running\n• Your internet connection", 
                                  "Connection Test", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                ConnectionStatusText.Text = "❌ Connection failed";
                ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                MessageBox.Show($"Connection test error:\n{ex.Message}\n\nPlease verify the server URL and try again.", 
                              "Connection Test", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 API connection test failed: {ex.Message}");
            }
            finally
            {
                TestConnectionBtn.IsEnabled = true;
                TestConnectionBtn.Content = "🔗 Test Connection";
            }
        }

        private bool LoadClockOutConfirmationSetting()
        {
            try
            {
                using var conn = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db")}");
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT value FROM Settings WHERE key = 'clock_out_confirmation'";
                var result = cmd.ExecuteScalar();
                if (result != null && bool.TryParse(result.ToString(), out bool val))
                    return val;
                return true; // default enabled
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error reading clock-out confirmation setting: {ex.Message}");
                return true;
            }
        }

        private bool SaveClockOutConfirmationSetting(bool enabled)
        {
            try
            {
                using var conn = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db")}");
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('clock_out_confirmation', $value)
                ";
                cmd.Parameters.AddWithValue("$value", enabled.ToString());
                cmd.ExecuteNonQuery();
                LogHelper.Write($"📋 Clock-out confirmation setting saved: {enabled}");
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error saving clock-out confirmation setting: {ex.Message}");
                return false;
            }
        }

        private void ClearConfigurationCache()
        {
            try
            {
                // Use reflection to clear the static cache in AttendancePage
                var attendancePageType = typeof(AttendancePage);
                var cacheField = attendancePageType.GetField("_clockOutConfirmationEnabled", 
                    System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
                
                if (cacheField != null)
                {
                    cacheField.SetValue(null, null);
                    LogHelper.Write("🔄 Configuration cache cleared - new settings will take effect immediately");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Could not clear configuration cache: {ex.Message}");
            }
        }

        private void BackupDbBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
                var backupPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"backup_biometric_{TimezoneHelper.Now:yyyyMMdd_HHmmss}.db");

                if (File.Exists(dbPath))
                {
                    File.Copy(dbPath, backupPath);
                    MessageBox.Show($"Database backed up successfully to:\n{backupPath}", "Backup Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                    LogHelper.Write($"📦 Database backed up to: {backupPath}");
                }
                else
                {
                    MessageBox.Show("Database file not found.", "Backup Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Backup error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Backup error: {ex.Message}");
            }
        }

        private void CleanupDbBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var result = MessageBox.Show("This will clean up old attendance records (older than 1 year). Continue?", 
                                            "Confirm Cleanup", MessageBoxButton.YesNo, MessageBoxImage.Question);
                
                if (result == MessageBoxResult.Yes)
                {
                    int deletedRecords = _dataService.DeleteOldAttendances(365);
                    MessageBox.Show($"Cleanup complete. Deleted {deletedRecords} old attendance records.", 
                                  "Cleanup Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                    
                    LoadSystemInformation(); // Refresh database info
                    LogHelper.Write($"🧹 Database cleanup: deleted {deletedRecords} old records");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Cleanup error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Cleanup error: {ex.Message}");
            }
        }

        // Schedule notification functionality removed - schedules now sync automatically
        private void CheckNotificationsBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Schedule notifications are no longer used.\nSchedules now sync automatically when WiFi is connected.", 
                          "Feature Removed", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ClearNotificationsBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Schedule notifications are no longer used.\nSchedules now sync automatically when WiFi is connected.", 
                          "Feature Removed", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void LoadAdminAccountInfo()
        {
            try
            {
                // Load current admin username from local database
                var adminUsername = _dataService.GetAdminUsername();
                CurrentUsernameTextBox.Text = adminUsername ?? "admin";
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Error loading admin account info: {ex.Message}");
                CurrentUsernameTextBox.Text = "admin";
            }
        }

        private void UpdateAdminAccountBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string newUsername = NewUsernameTextBox.Text.Trim();
                string newPassword = NewPasswordBox.Password;
                string confirmPassword = ConfirmPasswordBox.Password;

                // Validate inputs
                if (string.IsNullOrEmpty(newUsername) && string.IsNullOrEmpty(newPassword))
                {
                    MessageBox.Show("Please enter a new username or password to update.", 
                                  "No Changes", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                // Validate username if provided
                if (!string.IsNullOrEmpty(newUsername))
                {
                    if (newUsername.Length < 3)
                    {
                        MessageBox.Show("Username must be at least 3 characters long.", 
                                      "Invalid Username", MessageBoxButton.OK, MessageBoxImage.Warning);
                        NewUsernameTextBox.Focus();
                        return;
                    }

                    if (!System.Text.RegularExpressions.Regex.IsMatch(newUsername, "^[a-zA-Z0-9_]+$"))
                    {
                        MessageBox.Show("Username can only contain letters, numbers, and underscores.", 
                                      "Invalid Username", MessageBoxButton.OK, MessageBoxImage.Warning);
                        NewUsernameTextBox.Focus();
                        return;
                    }
                }

                // Validate password if provided
                if (!string.IsNullOrEmpty(newPassword))
                {
                    if (newPassword.Length < 4)
                    {
                        MessageBox.Show("Password must be at least 4 characters long.", 
                                      "Invalid Password", MessageBoxButton.OK, MessageBoxImage.Warning);
                        NewPasswordBox.Focus();
                        return;
                    }

                    if (newPassword != confirmPassword)
                    {
                        MessageBox.Show("Passwords do not match. Please try again.", 
                                      "Password Mismatch", MessageBoxButton.OK, MessageBoxImage.Warning);
                        ConfirmPasswordBox.Focus();
                        return;
                    }
                }

                // Confirm the change
                var result = MessageBox.Show(
                    "Are you sure you want to update the admin account?\n\n" +
                    (string.IsNullOrEmpty(newUsername) ? "" : $"New Username: {newUsername}\n") +
                    (string.IsNullOrEmpty(newPassword) ? "" : "New Password: ********\n") +
                    "\nNote: This only affects the biometric app login.",
                    "Confirm Update", 
                    MessageBoxButton.YesNo, 
                    MessageBoxImage.Question);

                if (result != MessageBoxResult.Yes)
                {
                    return;
                }

                // Update admin account in local database
                bool success = _dataService.UpdateAdminAccount(newUsername, newPassword);

                if (success)
                {
                    MessageBox.Show(
                        "Admin account updated successfully!\n\n" +
                        "Please use the new credentials for your next login.",
                        "Update Successful", 
                        MessageBoxButton.OK, 
                        MessageBoxImage.Information);

                    LogHelper.Write($"✅ Admin account updated - Username: {newUsername ?? "(unchanged)"}, Password: {(string.IsNullOrEmpty(newPassword) ? "(unchanged)" : "********")}");

                    // Clear the input fields
                    NewUsernameTextBox.Clear();
                    NewPasswordBox.Clear();
                    ConfirmPasswordBox.Clear();

                    // Reload current username
                    LoadAdminAccountInfo();
                }
                else
                {
                    MessageBox.Show("Failed to update admin account. Please check the logs for details.", 
                                  "Update Failed", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error updating admin account: {ex.Message}");
                MessageBox.Show($"Error updating admin account: {ex.Message}", 
                              "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }

    public class SystemConfig
    {
        public string? SystemName { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? Logo { get; set; }
        public string? CompanyName { get; set; }
        public string? Timezone { get; set; }
        public int ToolboxMeetingMinutes { get; set; }
        public bool ClockOutConfirmation { get; set; } = true;
        public string? LastUpdated { get; set; }
    }
}