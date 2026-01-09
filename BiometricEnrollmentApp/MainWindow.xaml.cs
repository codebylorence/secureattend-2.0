using System;
using System.Windows;
using System.Windows.Threading;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class MainWindow : Window
    {
        private readonly ZKTecoService _zkService = new();
        private DispatcherTimer _clockTimer;
        private bool _isAdminMode = false;

        public MainWindow()
        {
            InitializeComponent();
            InitializeApp();
        }

        private void InitializeApp()
        {
            // Start with Employee Mode
            SwitchToEmployeeMode();

            // Initialize clock timer
            _clockTimer = new DispatcherTimer();
            _clockTimer.Interval = TimeSpan.FromSeconds(1);
            _clockTimer.Tick += ClockTimer_Tick;
            _clockTimer.Start();

            // Update clock immediately
            UpdateClock();
        }

        private void ClockTimer_Tick(object sender, EventArgs e)
        {
            UpdateClock();
        }

        private void UpdateClock()
        {
            ClockText.Text = TimezoneHelper.Now.ToString("HH:mm:ss");
        }

        private void EmployeeModeBtn_Click(object sender, RoutedEventArgs e)
        {
            SwitchToEmployeeMode();
        }

        private void AdminPanelBtn_Click(object sender, RoutedEventArgs e)
        {
            // Don't allow clicking if already in admin mode
            if (_isAdminMode)
                return;

            // Show admin login dialog
            var loginDialog = new AdminLoginDialog();
            loginDialog.Owner = this;
            
            if (loginDialog.ShowDialog() == true && loginDialog.IsAuthenticated)
            {
                SwitchToAdminMode();
            }
            // If authentication fails, stay in current mode
        }

        private void SwitchToEmployeeMode()
        {
            _isAdminMode = false;
            EmployeeMode.Visibility = Visibility.Visible;
            AdminMode.Visibility = Visibility.Collapsed;

            // Navigate to clean employee attendance page
            var employeeAttendancePage = new EmployeeAttendancePage(_zkService);
            EmployeeFrame.Navigate(employeeAttendancePage);

            StatusText.Text = "Employee Mode - Place finger on scanner";
            
            // Update button states
            EmployeeModeBtn.IsEnabled = false;
            AdminPanelBtn.IsEnabled = true;
        }

        private void SwitchToAdminMode()
        {
            _isAdminMode = true;
            EmployeeMode.Visibility = Visibility.Collapsed;
            AdminMode.Visibility = Visibility.Visible;

            // Default to Attendance Logs
            ShowAttendanceLogs();

            StatusText.Text = "Admin Mode - Full system access";
            
            // Update button states
            EmployeeModeBtn.IsEnabled = true;
            AdminPanelBtn.IsEnabled = false;
        }

        private void AttendanceBtn_Click(object sender, RoutedEventArgs e)
        {
            ShowAttendanceLogs();
        }

        private void EnrollmentBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                LogHelper.Write("🔥 MainWindow EnrollmentBtn_Click starting...");
                
                LogHelper.Write("🔥 Creating EnrollmentPage...");
                var enrollmentPage = new EnrollmentPage(_zkService);
                LogHelper.Write("🔥 EnrollmentPage created successfully");
                
                LogHelper.Write("🔥 Navigating to EnrollmentPage...");
                AdminFrame.Navigate(enrollmentPage);
                LogHelper.Write("🔥 Navigation completed");
                
                StatusText.Text = "Admin Mode - Fingerprint Enrollment";
                LogHelper.Write("🔥 MainWindow EnrollmentBtn_Click completed");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in MainWindow EnrollmentBtn_Click: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                
                StatusText.Text = $"Navigation error: {ex.Message}";
                MessageBox.Show($"Error navigating to enrollment page: {ex.Message}", "Navigation Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void SettingsBtn_Click(object sender, RoutedEventArgs e)
        {
            var settingsPage = new AdminSettingsPage(_zkService);
            AdminFrame.Navigate(settingsPage);
            StatusText.Text = "Admin Mode - System Settings";
        }

        private void ShowAttendanceLogs()
        {
            var attendancePage = new AdminAttendancePage(_zkService);
            AdminFrame.Navigate(attendancePage);
            StatusText.Text = "Admin Mode - Attendance Logs & Management";
        }

        protected override void OnClosed(EventArgs e)
        {
            _clockTimer?.Stop();
            base.OnClosed(e);
        }
    }
}
