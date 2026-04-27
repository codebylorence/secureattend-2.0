using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
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
        private readonly PhotoService _photoService;
        private readonly Dictionary<string, BitmapImage?> _photoCache = new Dictionary<string, BitmapImage?>();

        public AdminAttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();
            _syncService = new SyncService(_dataService, _apiService);
            _photoService = new PhotoService();

            Loaded += AdminAttendancePage_Loaded;
            Unloaded += AdminAttendancePage_Unloaded;
            
            // Add event handler for loading photos when rows are displayed
            AttendanceGrid.LoadingRow += AttendanceGrid_LoadingRow;
        }

        private async void AdminAttendancePage_Loaded(object sender, RoutedEventArgs e)
        {
            // Initialize date pickers to today's date
            var fromDatePicker = this.FindName("FromDatePicker") as DatePicker;
            var toDatePicker = this.FindName("ToDatePicker") as DatePicker;
            
            if (fromDatePicker != null)
                fromDatePicker.SelectedDate = DateTime.Today;
            if (toDatePicker != null)
                toDatePicker.SelectedDate = DateTime.Today;
            
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

        private void RefreshAttendanceData()
        {
            RefreshAttendanceData(null, null);
        }

        private void RefreshAttendanceData(DateTime? fromDate, DateTime? toDate)
        {
            try
            {
                List<(long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, double TotalHours, string Status)> sessions;
                string headerText;
                
                if (fromDate.HasValue && toDate.HasValue)
                {
                    sessions = _dataService.GetSessionsByDateRange(fromDate.Value, toDate.Value);
                    if (fromDate.Value.Date == toDate.Value.Date)
                    {
                        headerText = $"Attendance Records - {fromDate.Value:yyyy-MM-dd}";
                    }
                    else
                    {
                        headerText = $"Attendance Records - {fromDate.Value:yyyy-MM-dd} to {toDate.Value:yyyy-MM-dd}";
                    }
                }
                else
                {
                    sessions = _dataService.GetTodaySessions();
                    headerText = $"Today's Attendance Records - {DateTime.Today:yyyy-MM-dd}";
                }
                
                // Get all enrollments to map employee IDs to names
                var enrollments = _dataService.GetAllEnrollments();
                var employeeNameMap = enrollments.ToDictionary(e => e.EmployeeId, e => e.Name);
                
                var rows = sessions.Select(s => new
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    EmployeeName = employeeNameMap.ContainsKey(s.EmployeeId) ? employeeNameMap[s.EmployeeId] : s.EmployeeId,
                    Date = s.Date,
                    ClockIn = FormatTimeOnly(s.ClockIn),
                    ClockOut = FormatTimeOnly(s.ClockOut),
                    TotalHours = FormatHours(s.TotalHours),
                    Status = s.Status
                }).ToList();

                AttendanceGrid.ItemsSource = rows;
                
                // Update header text and record count
                var gridHeaderText = this.FindName("GridHeaderText") as TextBlock;
                var recordCountText = this.FindName("RecordCountText") as TextBlock;
                
                if (gridHeaderText != null)
                    gridHeaderText.Text = headerText;
                if (recordCountText != null)
                    recordCountText.Text = $"({rows.Count} records)";
                
                // Update metrics
                UpdateAttendanceMetrics(sessions);
                
                LogHelper.Write($"📊 Refreshed attendance data: {rows.Count} records");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load attendance data: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"Failed to load attendance data: {ex}");
            }
        }
        
        private void UpdateAttendanceMetrics(List<(long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, double TotalHours, string Status)> sessions)
        {
            try
            {
                // Count by status
                int presentCount = sessions.Count(s => s.Status == "Present");
                int lateCount = sessions.Count(s => s.Status == "Late");
                int absentCount = sessions.Count(s => s.Status == "Absent");
                int missedClockoutCount = sessions.Count(s => s.Status == "Missed Clock-out");
                
                // Update UI
                var presentText = this.FindName("PresentCountText") as TextBlock;
                var lateText = this.FindName("LateCountText") as TextBlock;
                var absentText = this.FindName("AbsentCountText") as TextBlock;
                var missedClockoutText = this.FindName("MissedClockoutCountText") as TextBlock;
                
                if (presentText != null) presentText.Text = presentCount.ToString();
                if (lateText != null) lateText.Text = lateCount.ToString();
                if (absentText != null) absentText.Text = absentCount.ToString();
                if (missedClockoutText != null) missedClockoutText.Text = missedClockoutCount.ToString();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Failed to update metrics: {ex.Message}");
            }
        }

        private void FilterBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var fromDatePicker = this.FindName("FromDatePicker") as DatePicker;
                var toDatePicker = this.FindName("ToDatePicker") as DatePicker;
                
                if (fromDatePicker?.SelectedDate != null && toDatePicker?.SelectedDate != null)
                {
                    var fromDate = fromDatePicker.SelectedDate.Value;
                    var toDate = toDatePicker.SelectedDate.Value;
                    
                    if (fromDate > toDate)
                    {
                        MessageBox.Show("From date cannot be later than To date", "Invalid Date Range", MessageBoxButton.OK, MessageBoxImage.Warning);
                        return;
                    }
                    
                    RefreshAttendanceData(fromDate, toDate);
                }
                else
                {
                    MessageBox.Show("Please select both From and To dates", "Missing Dates", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Filter error: {ex.Message}");
                MessageBox.Show($"Filter error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void TodayBtn_Click(object sender, RoutedEventArgs e)
        {
            SetDateRange(DateTime.Today, DateTime.Today);
        }

        private void YesterdayBtn_Click(object sender, RoutedEventArgs e)
        {
            var yesterday = DateTime.Today.AddDays(-1);
            SetDateRange(yesterday, yesterday);
        }

        private void ThisWeekBtn_Click(object sender, RoutedEventArgs e)
        {
            var today = DateTime.Today;
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
            SetDateRange(startOfWeek, today);
        }

        private void LastWeekBtn_Click(object sender, RoutedEventArgs e)
        {
            var today = DateTime.Today;
            var startOfLastWeek = today.AddDays(-(int)today.DayOfWeek - 7);
            var endOfLastWeek = startOfLastWeek.AddDays(6);
            SetDateRange(startOfLastWeek, endOfLastWeek);
        }

        private void ThisMonthBtn_Click(object sender, RoutedEventArgs e)
        {
            var today = DateTime.Today;
            var startOfMonth = new DateTime(today.Year, today.Month, 1);
            SetDateRange(startOfMonth, today);
        }

        private void SetDateRange(DateTime fromDate, DateTime toDate)
        {
            try
            {
                var fromDatePicker = this.FindName("FromDatePicker") as DatePicker;
                var toDatePicker = this.FindName("ToDatePicker") as DatePicker;
                
                if (fromDatePicker != null)
                    fromDatePicker.SelectedDate = fromDate;
                if (toDatePicker != null)
                    toDatePicker.SelectedDate = toDate;
                
                // Automatically apply the filter
                FilterBtn_Click(this, new RoutedEventArgs());
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 SetDateRange error: {ex.Message}");
                MessageBox.Show($"Date range error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
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

        private void AttendanceGrid_LoadingRow(object? sender, DataGridRowEventArgs e)
        {
            try
            {
                // Get the employee ID from the row data
                dynamic rowData = e.Row.Item;
                string employeeId = rowData.EmployeeId;
                
                if (string.IsNullOrEmpty(employeeId))
                    return;

                // Load photo asynchronously
                Task.Run(() =>
                {
                    try
                    {
                        BitmapImage? photo = null;
                        
                        // Check cache first
                        lock (_photoCache)
                        {
                            if (_photoCache.TryGetValue(employeeId, out var cachedPhoto))
                            {
                                photo = cachedPhoto;
                            }
                            else
                            {
                                // Load from file system
                                photo = _photoService.LoadPhoto(employeeId);
                                _photoCache[employeeId] = photo;
                            }
                        }

                        if (photo != null)
                        {
                            // Update UI on dispatcher thread
                            Dispatcher.Invoke(() =>
                            {
                                try
                                {
                                    // Find the Image control in the row
                                    var photoColumn = AttendanceGrid.Columns[1] as DataGridTemplateColumn;
                                    if (photoColumn != null)
                                    {
                                        var cellContent = photoColumn.GetCellContent(e.Row);
                                        if (cellContent != null)
                                        {
                                            var border = FindVisualChild<Border>(cellContent);
                                            if (border != null)
                                            {
                                                var grid = border.Child as Grid;
                                                if (grid != null && grid.Children.Count > 1)
                                                {
                                                    var image = grid.Children[1] as Image;
                                                    if (image != null)
                                                    {
                                                        image.Source = photo;
                                                        image.Visibility = Visibility.Visible;
                                                        
                                                        // Hide placeholder
                                                        if (grid.Children[0] is TextBlock placeholder)
                                                        {
                                                            placeholder.Visibility = Visibility.Collapsed;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    LogHelper.Write($"⚠️ Error updating photo UI for {employeeId}: {ex.Message}");
                                }
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ Error loading photo for {employeeId}: {ex.Message}");
                    }
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error in AttendanceGrid_LoadingRow: {ex.Message}");
            }
        }

        private static T? FindVisualChild<T>(DependencyObject parent) where T : DependencyObject
        {
            for (int i = 0; i < System.Windows.Media.VisualTreeHelper.GetChildrenCount(parent); i++)
            {
                var child = System.Windows.Media.VisualTreeHelper.GetChild(parent, i);
                if (child is T typedChild)
                    return typedChild;
                
                var result = FindVisualChild<T>(child);
                if (result != null)
                    return result;
            }
            return null;
        }
    }
}
