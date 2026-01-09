using System;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AdminAttendancePage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;
        private readonly ApiService _apiService;

        public AdminAttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();

            Loaded += AdminAttendancePage_Loaded;
        }

        private void AdminAttendancePage_Loaded(object sender, RoutedEventArgs e)
        {
            RefreshAttendanceData();
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

        private async void SyncSchedulesBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                SyncSchedulesBtn.IsEnabled = false;
                SyncSchedulesBtn.Content = "⏳ Syncing...";

                var schedules = await _apiService.GetPublishedSchedulesAsync();

                if (schedules == null || schedules.Count == 0)
                {
                    MessageBox.Show("No published schedules found on the server.", "No Schedules", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                int updatedCount = _dataService.UpdateSchedules(schedules);
                MessageBox.Show($"Successfully updated {updatedCount} employee schedule(s) from the server.", "Sync Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                
                LogHelper.Write($"✅ Updated {updatedCount} schedules from server");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error syncing schedules: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error syncing schedules: {ex.Message}");
            }
            finally
            {
                SyncSchedulesBtn.IsEnabled = true;
                SyncSchedulesBtn.Content = "📅 Sync Schedules";
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