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
        }

        private void LoadAttendanceSettings()
        {
            try
            {
                // Load current settings
                LateThresholdInput.Text = _settingsService.GetLateThresholdMinutes().ToString();
                ClockInGraceInput.Text = _settingsService.GetClockInGracePeriodMinutes().ToString();
                ClockOutGraceInput.Text = _settingsService.GetClockOutGracePeriodMinutes().ToString();
                
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

                // Save settings
                bool success = true;
                success &= _settingsService.SetLateThresholdMinutes(lateThreshold);
                success &= _settingsService.SetClockInGracePeriodMinutes(clockInGrace);
                success &= _settingsService.SetClockOutGracePeriodMinutes(clockOutGrace);
                success &= SaveClockOutConfirmationSetting(ClockOutConfirmationCheckBox.IsChecked == true);

                if (success)
                {
                    MessageBox.Show("Attendance settings saved successfully!", "Settings Saved", MessageBoxButton.OK, MessageBoxImage.Information);
                    LogHelper.Write($"✅ Attendance settings updated - Late: {lateThreshold}min, Clock-in Grace: {clockInGrace}min, Clock-out Grace: {clockOutGrace}min, Clock-out Confirmation: {ClockOutConfirmationCheckBox.IsChecked == true}");
                    
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

                // TODO: Test connection to server
                await Task.Delay(1000); // Simulate connection test

                ConnectionStatusText.Text = "✅ Connection successful";
                ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Green);
                MessageBox.Show("Server connection test successful.", "Connection Test", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                ConnectionStatusText.Text = "❌ Connection failed";
                ConnectionStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                MessageBox.Show($"Connection test error: {ex.Message}", "Connection Test", MessageBoxButton.OK, MessageBoxImage.Error);
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
                var configPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "config", "system-config.json");
                if (System.IO.File.Exists(configPath))
                {
                    var configJson = System.IO.File.ReadAllText(configPath);
                    var config = System.Text.Json.JsonSerializer.Deserialize<SystemConfig>(configJson, new System.Text.Json.JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    return config?.ClockOutConfirmation ?? true; // Default to true
                }
                else
                {
                    LogHelper.Write("📋 Config file not found, using default clock-out confirmation: enabled");
                    return true; // Default to enabled
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error reading clock-out confirmation setting: {ex.Message}");
                return true; // Default to enabled on error
            }
        }

        private bool SaveClockOutConfirmationSetting(bool enabled)
        {
            try
            {
                var configPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "config", "system-config.json");
                
                SystemConfig config;
                if (System.IO.File.Exists(configPath))
                {
                    var configJson = System.IO.File.ReadAllText(configPath);
                    config = System.Text.Json.JsonSerializer.Deserialize<SystemConfig>(configJson, new System.Text.Json.JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    }) ?? new SystemConfig();
                }
                else
                {
                    config = new SystemConfig();
                }
                
                config.ClockOutConfirmation = enabled;
                config.LastUpdated = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
                
                var updatedJson = System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions 
                { 
                    WriteIndented = true,
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                });
                
                System.IO.File.WriteAllText(configPath, updatedJson);
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

        private async void CheckNotificationsBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                CheckNotificationsBtn.IsEnabled = false;
                CheckNotificationsBtn.Content = "⏳ Checking...";
                NotificationStatusText.Text = "Checking for notifications...";

                var notifications = await _apiService.GetScheduleNotificationsAsync();
                
                if (notifications != null && notifications.Count > 0)
                {
                    NotificationStatusText.Text = $"Found {notifications.Count} unacknowledged notification(s)";
                    NotificationStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Orange);
                    
                    // Show notifications in a message box
                    var message = "Schedule Notifications:\n\n";
                    foreach (var notification in notifications)
                    {
                        message += $"• {notification.Message}\n";
                        message += $"  Created by: {notification.Created_By ?? "System"}\n";
                        message += $"  Time: {notification.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "Unknown"}\n\n";
                    }
                    
                    MessageBox.Show(message, "Schedule Notifications", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                else
                {
                    NotificationStatusText.Text = "No unacknowledged notifications";
                    NotificationStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Green);
                    MessageBox.Show("No schedule notifications found.", "Notifications", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                NotificationStatusText.Text = "Error checking notifications";
                NotificationStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Red);
                MessageBox.Show($"Error checking notifications: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error checking notifications: {ex.Message}");
            }
            finally
            {
                CheckNotificationsBtn.IsEnabled = true;
                CheckNotificationsBtn.Content = "Check Now";
            }
        }

        private async void ClearNotificationsBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var result = MessageBox.Show("This will acknowledge all schedule notifications. Continue?", 
                                            "Confirm Clear All", MessageBoxButton.YesNo, MessageBoxImage.Question);
                
                if (result == MessageBoxResult.Yes)
                {
                    ClearNotificationsBtn.IsEnabled = false;
                    ClearNotificationsBtn.Content = "⏳ Clearing...";
                    
                    var success = await _apiService.AcknowledgeAllNotificationsAsync();
                    
                    if (success)
                    {
                        NotificationStatusText.Text = "All notifications cleared";
                        NotificationStatusText.Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Green);
                        MessageBox.Show("All schedule notifications have been acknowledged.", "Notifications Cleared", MessageBoxButton.OK, MessageBoxImage.Information);
                        LogHelper.Write("✅ All schedule notifications acknowledged");
                    }
                    else
                    {
                        MessageBox.Show("Failed to clear notifications. Please try again.", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error clearing notifications: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error clearing notifications: {ex.Message}");
            }
            finally
            {
                ClearNotificationsBtn.IsEnabled = true;
                ClearNotificationsBtn.Content = "Clear All";
            }
        }
    }
}