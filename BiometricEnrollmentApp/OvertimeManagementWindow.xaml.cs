using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class OvertimeManagementWindow : Window
    {
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private List<Services.OvertimeAssignment> _overtimeAssignments;

        public OvertimeManagementWindow()
        {
            InitializeComponent();
            _dataService = new DataService();
            _apiService = new ApiService();
            _overtimeAssignments = new List<Services.OvertimeAssignment>();
            
            Loaded += OvertimeManagementWindow_Loaded;
        }

        private async void OvertimeManagementWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadEmployeesAsync();
            LoadOvertimeAssignments();
            
            // Set default reason
            ReasonComboBox.SelectedIndex = 0;
        }

        private async Task LoadEmployeesAsync()
        {
            try
            {
                // Get employees from local database first
                var localEmployees = _dataService.GetAllEnrollments()
                    .Select(e => new EmployeeItem
                    {
                        EmployeeId = e.EmployeeId,
                        DisplayName = $"{e.EmployeeId} - {e.Name}",
                        Name = e.Name,
                        Department = e.Department
                    }).ToList();

                // Try to get additional employee details from server
                try
                {
                    var serverEmployees = await _apiService.GetAllEmployeesAsync();
                    if (serverEmployees != null && serverEmployees.Count > 0)
                    {
                        // Merge server data with local data
                        foreach (var localEmp in localEmployees)
                        {
                            var serverEmp = serverEmployees.FirstOrDefault(s => s.EmployeeId == localEmp.EmployeeId);
                            if (serverEmp != null)
                            {
                                localEmp.Department = serverEmp.Department ?? localEmp.Department;
                                localEmp.Name = serverEmp.Fullname ?? localEmp.Name;
                                localEmp.DisplayName = $"{localEmp.EmployeeId} - {localEmp.Name}";
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"⚠️ Could not fetch server employee data: {ex.Message}");
                }

                EmployeeComboBox.ItemsSource = localEmployees.OrderBy(e => e.EmployeeId).ToList();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading employees: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error loading employees: {ex.Message}");
            }
        }

        private void LoadOvertimeAssignments()
        {
            try
            {
                // For now, we'll store overtime assignments in memory
                // In a production system, you'd want to persist these in the database
                var displayItems = _overtimeAssignments.Select(ot => {
                    // Find employee details from the employees list
                    var employee = EmployeeComboBox.Items.Cast<EmployeeItem>()
                        .FirstOrDefault(e => e.EmployeeId == ot.EmployeeId);
                    
                    return new
                    {
                        EmployeeId = ot.EmployeeId,
                        EmployeeName = employee?.Name ?? "Unknown",
                        Department = employee?.Department ?? "Unknown",
                        Reason = ot.Reason,
                        EstimatedHours = ot.EstimatedHours.ToString("F1"),
                        Status = "Assigned"
                    };
                }).ToList();

                OvertimeGrid.ItemsSource = displayItems;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error loading overtime assignments: {ex.Message}");
            }
        }

        private async void AssignOvertimeBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var selectedEmployee = EmployeeComboBox.SelectedItem as EmployeeItem;
                var selectedReason = (ReasonComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString();
                
                if (selectedEmployee == null)
                {
                    MessageBox.Show("Please select an employee.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (string.IsNullOrEmpty(selectedReason))
                {
                    MessageBox.Show("Please select a reason for overtime.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (!double.TryParse(HoursTextBox.Text, out double estimatedHours) || estimatedHours <= 0)
                {
                    MessageBox.Show("Please enter a valid number of hours (greater than 0).", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                // Check if employee is already assigned overtime today
                if (_overtimeAssignments.Any(ot => ot.EmployeeId == selectedEmployee.EmployeeId))
                {
                    MessageBox.Show($"Employee {selectedEmployee.EmployeeId} is already assigned overtime today.", "Duplicate Assignment", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                // Create overtime assignment
                var overtimeAssignment = new Services.OvertimeAssignment
                {
                    EmployeeId = selectedEmployee.EmployeeId,
                    Reason = selectedReason,
                    EstimatedHours = estimatedHours,
                    AssignedDate = TimezoneHelper.Now.Date,
                    AssignedBy = "Admin" // In a real system, you'd get the current user
                };

                _overtimeAssignments.Add(overtimeAssignment);

                // Try to sync to server
                try
                {
                    await _apiService.AssignOvertimeAsync(overtimeAssignment);
                    LogHelper.Write($"✅ Overtime assignment synced to server: {selectedEmployee.EmployeeId}");
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"⚠️ Could not sync overtime assignment to server: {ex.Message}");
                    // Continue anyway - assignment is stored locally
                }

                // Refresh the grid
                LoadOvertimeAssignments();

                // Clear the form
                EmployeeComboBox.SelectedItem = null;
                ReasonComboBox.SelectedIndex = 0;
                HoursTextBox.Text = "2.0";

                MessageBox.Show($"Overtime assigned to {selectedEmployee.Name} ({selectedEmployee.EmployeeId})", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
                LogHelper.Write($"✅ Overtime assigned: {selectedEmployee.EmployeeId} - {selectedReason} - {estimatedHours}h");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error assigning overtime: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error assigning overtime: {ex.Message}");
            }
        }

        private void RemoveOvertimeBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var button = sender as Button;
                var employeeId = button?.Tag?.ToString();

                if (string.IsNullOrEmpty(employeeId))
                    return;

                var assignment = _overtimeAssignments.FirstOrDefault(ot => ot.EmployeeId == employeeId);
                if (assignment != null)
                {
                    // Find employee details for display
                    var employee = EmployeeComboBox.Items.Cast<EmployeeItem>()
                        .FirstOrDefault(e => e.EmployeeId == employeeId);
                    var employeeName = employee?.Name ?? "Unknown Employee";
                    
                    var result = MessageBox.Show($"Remove overtime assignment for {employeeName} ({employeeId})?", 
                                               "Confirm Removal", MessageBoxButton.YesNo, MessageBoxImage.Question);
                    
                    if (result == MessageBoxResult.Yes)
                    {
                        _overtimeAssignments.Remove(assignment);
                        LoadOvertimeAssignments();
                        
                        LogHelper.Write($"✅ Overtime assignment removed: {employeeId}");
                        
                        // Try to sync removal to server
                        Task.Run(async () =>
                        {
                            try
                            {
                                await _apiService.RemoveOvertimeAsync(employeeId);
                                LogHelper.Write($"✅ Overtime removal synced to server: {employeeId}");
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"⚠️ Could not sync overtime removal to server: {ex.Message}");
                            }
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error removing overtime assignment: {ex.Message}");
            }
        }

        private void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            LoadOvertimeAssignments();
        }

        private void CloseBtn_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }

    public class EmployeeItem
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
    }
}