using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class FingerprintRecordsPage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;

        public FingerprintRecordsPage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();

            Loaded += FingerprintRecordsPage_Loaded;
        }

        private void FingerprintRecordsPage_Loaded(object sender, RoutedEventArgs e)
        {
            RefreshRecords();
        }

        private void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            RefreshRecords();
        }

        private void StartEnrollmentBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var employeeId = EmployeeIdTextBox.Text.Trim();
                var employeeName = EmployeeNameTextBox.Text.Trim();
                var department = DepartmentTextBox.Text.Trim();

                if (string.IsNullOrEmpty(employeeId))
                {
                    MessageBox.Show("Please enter Employee ID.", "Missing Information", MessageBoxButton.OK, MessageBoxImage.Warning);
                    EmployeeIdTextBox.Focus();
                    return;
                }

                if (string.IsNullOrEmpty(employeeName))
                {
                    MessageBox.Show("Please enter Employee Name.", "Missing Information", MessageBoxButton.OK, MessageBoxImage.Warning);
                    EmployeeNameTextBox.Focus();
                    return;
                }

                // Update status
                StatusText.Text = $"Starting enrollment for {employeeName} ({employeeId})...";
                
                StartEnrollmentBtn.IsEnabled = false;
                StartEnrollmentBtn.Content = "Enrolling...";

                // TODO: Add actual enrollment logic here
                MessageBox.Show($"Enrollment started for:\nID: {employeeId}\nName: {employeeName}\nDepartment: {department}\n\nThis is a placeholder - actual enrollment logic will be implemented.", 
                              "Enrollment Started", MessageBoxButton.OK, MessageBoxImage.Information);

                // Reset UI
                ResetEnrollmentUI();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error starting enrollment: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error starting enrollment: {ex.Message}");
                ResetEnrollmentUI();
            }
        }

        private void ClearFormBtn_Click(object sender, RoutedEventArgs e)
        {
            EmployeeIdTextBox.Clear();
            EmployeeNameTextBox.Clear();
            DepartmentTextBox.Clear();
            ResetEnrollmentUI();
            EmployeeIdTextBox.Focus();
        }

        private void ResetEnrollmentUI()
        {
            StatusText.Text = "Ready to enroll new fingerprint";
            StartEnrollmentBtn.IsEnabled = true;
            StartEnrollmentBtn.Content = "Start Enrollment";
        }

        private void DeleteSelectedBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (RecordsGrid.SelectedItem == null)
                {
                    MessageBox.Show("Please select a record to delete.", "No Selection", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var result = MessageBox.Show("Are you sure you want to delete the selected fingerprint record?", 
                                            "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Question);
                
                if (result == MessageBoxResult.Yes)
                {
                    dynamic selectedRecord = RecordsGrid.SelectedItem;
                    string employeeId = selectedRecord.EmployeeId;
                    
                    _dataService.DeleteEnrollment(employeeId);
                    
                    MessageBox.Show($"Fingerprint record for {employeeId} has been deleted.", 
                                  "Delete Successful", MessageBoxButton.OK, MessageBoxImage.Information);
                    
                    RefreshRecords();
                    LogHelper.Write($"🗑️ Deleted fingerprint record for {employeeId}");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error deleting record: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error deleting record: {ex.Message}");
            }
        }

        private void CleanupBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var result = MessageBox.Show("This will remove fingerprint records for employees that no longer exist in the system. Continue?", 
                                            "Confirm Cleanup", MessageBoxButton.YesNo, MessageBoxImage.Question);
                
                if (result == MessageBoxResult.Yes)
                {
                    // TODO: Implement cleanup logic for orphaned records
                    MessageBox.Show("Cleanup functionality will be implemented here.", 
                                  "Cleanup", MessageBoxButton.OK, MessageBoxImage.Information);
                    
                    RefreshRecords();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error during cleanup: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error during cleanup: {ex.Message}");
            }
        }

        private void RefreshRecords()
        {
            try
            {
                var enrollments = _dataService.GetAllEnrollmentsWithRowId();
                
                var records = enrollments.Select(e => new
                {
                    RowId = e.RowId,
                    EmployeeId = e.EmployeeId,
                    Name = string.IsNullOrEmpty(e.Name) ? "Unknown" : e.Name,
                    Department = string.IsNullOrEmpty(e.Department) ? "N/A" : e.Department,
                    TemplateSize = $"{e.Template?.Length ?? 0} bytes",
                    EnrolledDate = "N/A" // TODO: Add enrollment date to database
                }).ToList();

                RecordsGrid.ItemsSource = records;
                
                LogHelper.Write($"📊 Refreshed fingerprint records: {records.Count} records");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load fingerprint records: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"Failed to load fingerprint records: {ex}");
            }
        }
    }
}