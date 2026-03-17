using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AdminSchedulePage : Page
    {
        private readonly DataService _dataService;
        private readonly SyncService _syncService;
        private readonly ApiService _apiService;
        private List<ScheduleDisplayItem> _allSchedules;
        private string _currentFilter = "All";

        public AdminSchedulePage()
        {
            InitializeComponent();
            _dataService = new DataService();
            _apiService = new ApiService();
            _syncService = new SyncService(_dataService, _apiService);
            _allSchedules = new List<ScheduleDisplayItem>();

            Loaded += AdminSchedulePage_Loaded;
        }

        private void AdminSchedulePage_Loaded(object sender, RoutedEventArgs e)
        {
            // Use async loading without blocking
            _ = LoadSchedulesAsync();
        }

        private async Task LoadSchedulesAsync()
        {
            try
            {
                LogHelper.Write("📅 Loading schedules from local database...");

                var schedules = _dataService.GetAllSchedules();

                if (schedules == null || schedules.Count == 0)
                {
                    // Show empty state
                    SchedulesDataGrid.Visibility = Visibility.Collapsed;
                    EmptyStatePanel.Visibility = Visibility.Visible;
                    TotalSchedulesText.Text = "0";
                    TotalEmployeesText.Text = "0";
                    
                    LogHelper.Write("📅 No schedules found in local database");
                }
                else
                {
                    _allSchedules = schedules;
                    
                    // Apply current filter
                    ApplyFilter(_currentFilter);
                    
                    LogHelper.Write($"✅ Loaded {schedules.Count} schedules");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error loading schedules: {ex.Message}");
                MessageBox.Show($"Error loading schedules: {ex.Message}", 
                              "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ApplyFilter(string filter)
        {
            try
            {
                _currentFilter = filter;
                
                if (_allSchedules == null || _allSchedules.Count == 0)
                {
                    SchedulesDataGrid.Visibility = Visibility.Collapsed;
                    EmptyStatePanel.Visibility = Visibility.Visible;
                    TotalSchedulesText.Text = "0";
                    TotalEmployeesText.Text = "0";
                    return;
                }

                var today = TimezoneHelper.Now.ToString("yyyy-MM-dd");
                List<ScheduleDisplayItem> filteredSchedules;

                switch (filter)
                {
                    case "Today":
                        filteredSchedules = _allSchedules
                            .Where(s => s.ScheduleDates != null && s.ScheduleDates.Contains(today))
                            .ToList();
                        break;
                        
                    case "Coming":
                        filteredSchedules = _allSchedules
                            .Where(s => s.ScheduleDates != null && HasFutureDates(s.ScheduleDates, today))
                            .ToList();
                        break;
                        
                    case "Past":
                        filteredSchedules = _allSchedules
                            .Where(s => s.ScheduleDates != null && HasOnlyPastDates(s.ScheduleDates, today))
                            .ToList();
                        break;
                        
                    case "DateRange":
                        // Date range filtering will be handled by date pickers
                        if (StartDatePicker != null && EndDatePicker != null && 
                            StartDatePicker.SelectedDate.HasValue && EndDatePicker.SelectedDate.HasValue)
                        {
                            var startDate = StartDatePicker.SelectedDate.Value.ToString("yyyy-MM-dd");
                            var endDate = EndDatePicker.SelectedDate.Value.ToString("yyyy-MM-dd");
                            filteredSchedules = _allSchedules
                                .Where(s => s.ScheduleDates != null && HasDatesInRange(s.ScheduleDates, startDate, endDate))
                                .ToList();
                        }
                        else
                        {
                            filteredSchedules = _allSchedules;
                        }
                        break;
                        
                    default: // "All"
                        filteredSchedules = _allSchedules;
                        break;
                }

                // Show data grid
                SchedulesDataGrid.Visibility = Visibility.Visible;
                EmptyStatePanel.Visibility = Visibility.Collapsed;

                // Bind filtered data
                SchedulesDataGrid.ItemsSource = filteredSchedules;

                // Update statistics
                TotalSchedulesText.Text = filteredSchedules.Count.ToString();
                var uniqueEmployees = filteredSchedules.Select(s => s.EmployeeId).Distinct().Count();
                TotalEmployeesText.Text = uniqueEmployees.ToString();

                LogHelper.Write($"📅 Showing {filteredSchedules.Count} schedules (filter: {filter})");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error applying filter: {ex.Message}");
                LogHelper.Write($"❌ Stack trace: {ex.StackTrace}");
            }
        }

        private bool HasFutureDates(string scheduleDates, string today)
        {
            try
            {
                var dates = scheduleDates.Split(',').Select(d => d.Trim()).ToList();
                return dates.Any(d => string.Compare(d, today) > 0);
            }
            catch
            {
                return false;
            }
        }

        private bool HasOnlyPastDates(string scheduleDates, string today)
        {
            try
            {
                var dates = scheduleDates.Split(',').Select(d => d.Trim()).ToList();
                return dates.All(d => string.Compare(d, today) < 0);
            }
            catch
            {
                return false;
            }
        }

        private bool HasDatesInRange(string scheduleDates, string startDate, string endDate)
        {
            try
            {
                var dates = scheduleDates.Split(',').Select(d => d.Trim()).ToList();
                return dates.Any(d => string.Compare(d, startDate) >= 0 && string.Compare(d, endDate) <= 0);
            }
            catch
            {
                return false;
            }
        }

        private void FilterComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            try
            {
                if (FilterComboBox == null || FilterComboBox.SelectedItem == null)
                    return;
                    
                if (FilterComboBox.SelectedItem is ComboBoxItem selectedItem)
                {
                    var filter = selectedItem.Tag?.ToString() ?? "All";
                    
                    // Show/hide date range pickers
                    if (DateRangePanel != null)
                    {
                        DateRangePanel.Visibility = filter == "DateRange" ? Visibility.Visible : Visibility.Collapsed;
                    }
                    
                    ApplyFilter(filter);
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error in filter selection: {ex.Message}");
            }
        }

        private void DatePicker_SelectedDateChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_currentFilter == "DateRange")
            {
                ApplyFilter("DateRange");
            }
        }

        private async void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                RefreshBtn.IsEnabled = false;
                RefreshBtn.Content = "⏳ Refreshing...";

                await LoadSchedulesAsync();

                MessageBox.Show("Schedules refreshed successfully!", 
                              "Refresh Complete", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error refreshing schedules: {ex.Message}");
                MessageBox.Show($"Error refreshing schedules: {ex.Message}", 
                              "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                RefreshBtn.IsEnabled = true;
                RefreshBtn.Content = "🔄 Refresh";
            }
        }

        private async void SyncBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                SyncBtn.IsEnabled = false;
                RefreshBtn.IsEnabled = false;
                SyncBtn.Content = "⏳ Syncing...";

                LogHelper.Write("🔄 Starting manual schedule sync...");

                await Task.Run(async () =>
                {
                    try
                    {
                        // Sync schedules from server
                        await _syncService.SyncSchedulesAsync();
                        
                        await Dispatcher.InvokeAsync(async () =>
                        {
                            await LoadSchedulesAsync();
                            MessageBox.Show("Schedules synced successfully from server!", 
                                          "Sync Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                            LogHelper.Write("✅ Manual schedule sync completed successfully");
                        });
                    }
                    catch (Exception ex)
                    {
                        Dispatcher.Invoke(() =>
                        {
                            LogHelper.Write($"❌ Error syncing schedules: {ex.Message}");
                            MessageBox.Show($"Error syncing schedules from server:\n\n{ex.Message}\n\nPlease check:\n• Server URL is correct in Settings\n• Server is running\n• Internet connection is active", 
                                          "Sync Error", MessageBoxButton.OK, MessageBoxImage.Error);
                        });
                    }
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error in sync operation: {ex.Message}");
                MessageBox.Show($"Error in sync operation: {ex.Message}", 
                              "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                SyncBtn.IsEnabled = true;
                RefreshBtn.IsEnabled = true;
                SyncBtn.Content = "⬇️ Sync from Server";
            }
        }
    }
}
