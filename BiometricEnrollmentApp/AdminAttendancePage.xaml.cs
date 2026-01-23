using System;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AdminAttendancePage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private readonly DispatcherTimer _autoSyncTimer;

        public AdminAttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();

            // Initialize auto-sync timer (every 10 minutes)
            _autoSyncTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMinutes(10)
            };
            _autoSyncTimer.Tick += AutoSyncTimer_Tick;

            Loaded += AdminAttendancePage_Loaded;
            Unloaded += AdminAttendancePage_Unloaded;
        }

        private async void AdminAttendancePage_Loaded(object sender, RoutedEventArgs e)
        {
            RefreshAttendanceData();
            
            // Start automatic schedule syncing
            await AutoSyncSchedules();
            _autoSyncTimer.Start();
            LogHelper.Write("🔄 Started automatic schedule sync (every 10 minutes)");
        }

        private void AdminAttendancePage_Unloaded(object sender, RoutedEventArgs e)
        {
            // Stop the timer when page is unloaded
            _autoSyncTimer?.Stop();
            LogHelper.Write("⏹️ Stopped automatic schedule sync");
        }

        private async void AutoSyncTimer_Tick(object sender, EventArgs e)
        {
            await AutoSyncSchedules();
        }

        private async Task AutoSyncSchedules()
        {
            try
            {
                LogHelper.Write("🔄 Auto-syncing schedules from server...");
                
                var schedules = await _apiService.GetAllSchedulesAsync();

                if (schedules != null && schedules.Count > 0)
                {
                    int updatedCount = _dataService.UpdateSchedules(schedules);
                    LogHelper.Write($"✅ Auto-sync: Updated {updatedCount} schedule(s) from server");
                }
                else
                {
                    LogHelper.Write("ℹ️ Auto-sync: No schedules found on server");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Auto-sync failed: {ex.Message}");
                // Don't show message box for auto-sync failures to avoid interrupting user
            }
        }

        private void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            RefreshAttendanceData();
        }

        private void ExportBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // TODO: Implement export functionality
                MessageBox.Show("Export functionality will be implemented here.", "Export", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Export error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void RefreshAttendanceData()
        {
            try
            {
                var sessions = _dataService.GetTodaySessions();
                
                // Get all enrollments to map employee IDs to names
                var enrollments = _dataService.GetAllEnrollments();
                var employeeNameMap = enrollments.ToDictionary(e => e.EmployeeId, e => e.Name);
                
                var rows = sessions.Select(s => new
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    EmployeeName = employeeNameMap.ContainsKey(s.EmployeeId) ? employeeNameMap[s.EmployeeId] : "Unknown",
                    Date = s.Date,
                    ClockIn = FormatTimeOnly(s.ClockIn),
                    ClockOut = FormatTimeOnly(s.ClockOut),
                    TotalHours = FormatHours(s.TotalHours),
                    Status = s.Status
                }).ToList();

                AttendanceGrid.ItemsSource = rows;
                
                LogHelper.Write($"📊 Refreshed attendance data: {rows.Count} records");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load attendance data: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"Failed to load attendance data: {ex}");
            }
        }

        private string FormatTimeOnly(string? dateTimeString)
        {
            if (string.IsNullOrEmpty(dateTimeString))
                return "-";
            
            try
            {
                if (DateTime.TryParse(dateTimeString, out DateTime dt))
                {
                    return dt.ToString("HH:mm:ss");
                }
                return dateTimeString;
            }
            catch
            {
                return dateTimeString ?? "-";
            }
        }

        private string FormatHours(double hours)
        {
            return hours > 0 ? hours.ToString("0.00") : "-";
        }
    }
}