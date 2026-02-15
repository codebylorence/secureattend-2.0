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

        public AdminSchedulePage()
        {
            InitializeComponent();
            _dataService = new DataService();
            _apiService = new ApiService();
            _syncService = new SyncService(_dataService, _apiService);

            Loaded += AdminSchedulePage_Loaded;
        }

        private void AdminSchedulePage_Loaded(object sender, RoutedEventArgs e)
        {
            LoadSchedules();
        }

        private void LoadSchedules()
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
                    // Show data grid
                    SchedulesDataGrid.Visibility = Visibility.Visible;
                    EmptyStatePanel.Visibility = Visibility.Collapsed;

                    // Bind data
                    SchedulesDataGrid.ItemsSource = schedules;

                    // Update statistics
                    TotalSchedulesText.Text = schedules.Count.ToString();
                    var uniqueEmployees = schedules.Select(s => s.EmployeeId).Distinct().Count();
                    TotalEmployeesText.Text = uniqueEmployees.ToString();

                    LogHelper.Write($"📅 Loaded {schedules.Count} schedules for {uniqueEmployees} employees");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error loading schedules: {ex.Message}");
                MessageBox.Show($"Error loading schedules: {ex.Message}", 
                              "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                RefreshBtn.IsEnabled = false;
                RefreshBtn.Content = "⏳ Refreshing...";

                LoadSchedules();

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
                        
                        Dispatcher.Invoke(() =>
                        {
                            LoadSchedules();
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
