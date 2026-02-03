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
        private readonly SyncService _syncService;

        public AdminAttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();
            _syncService = new SyncService(_dataService, _apiService);

            Loaded += AdminAttendancePage_Loaded;
            Unloaded += AdminAttendancePage_Unloaded;
        }

        private async void AdminAttendancePage_Loaded(object sender, RoutedEventArgs e)
        {
            RefreshAttendanceData();
            
            // Note: SyncService is now started globally from MainWindow
            LogHelper.Write("ℹ️ Admin attendance page loaded - using global sync service");
        }

        private void AdminAttendancePage_Unloaded(object sender, RoutedEventArgs e)
        {
            // Note: SyncService cleanup is handled globally from MainWindow
            LogHelper.Write("ℹ️ Admin attendance page unloaded");
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