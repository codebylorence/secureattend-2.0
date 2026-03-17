using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using BiometricEnrollmentApp.Services;
using System.Collections.Generic;
using System.Linq;
using System.Collections.ObjectModel;
using System.Windows.Threading;

namespace BiometricEnrollmentApp
{
    // Matches your API JSON: "employee_id", "fullname", "department"
    public record EmployeeDto(string employee_id, string fullname, string department)
    {
        // Add a property to map to the expected field name
        public string employeeId => employee_id;
    }

    // Model for ComboBox display
    public class EmployeeSuggestion
    {
        public string EmployeeId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Department { get; set; } = "";
        public string DisplayText => $"{EmployeeId} - {FullName} ({Department})";
        
        // Override ToString to ensure proper display even if DisplayMemberPath fails
        public override string ToString()
        {
            return DisplayText;
        }
    }

    public partial class EnrollmentPage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly EnrollmentScannerService _enrollmentScanner;
        private readonly DataService _dataService = new();
        private readonly PhotoService _photoService = new();
        private ObservableCollection<EmployeeSuggestion> _employeeSuggestions = new();
        private List<EmployeeDto> _allEmployees = new();
        private string? _selectedPhotoPath = null;

        public EnrollmentPage(ZKTecoService zkService)
        {
            try
            {
                LogHelper.Write("🔥 EnrollmentPage constructor starting...");
                
                InitializeComponent();
                LogHelper.Write("🔥 InitializeComponent completed");
                
                _zkService = zkService ?? new ZKTecoService();
                LogHelper.Write("🔥 ZKService initialized");
                
                _enrollmentScanner = new EnrollmentScannerService();
                LogHelper.Write("🔥 EnrollmentScanner created");

                // Initialize collections with null safety
                _employeeSuggestions = new ObservableCollection<EmployeeSuggestion>();
                _allEmployees = new List<EmployeeDto>();
                LogHelper.Write("🔥 Collections initialized");

                // Hook enrollment scanner events (separate from attendance scanner)
                _enrollmentScanner.OnImageCaptured += ImgCaptured;
                _enrollmentScanner.OnStatus += msg =>
                {
                    try
                    {
                        Dispatcher.Invoke(() => 
                        {
                            if (StatusText != null)
                                StatusText.Text = msg;
                        });
                        LogHelper.Write($"[ENROLLMENT] {msg}");
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"💥 Error updating status from scanner: {ex.Message}");
                    }
                };
                LogHelper.Write("🔥 Event handlers attached");

                // Initialize employee suggestions
                if (EmployeeIdInput != null)
                {
                    EmployeeIdInput.ItemsSource = _employeeSuggestions;
                    LogHelper.Write("🔥 ComboBox ItemsSource set");
                }
                else
                {
                    LogHelper.Write("⚠️ EmployeeIdInput is null!");
                }

                // Auto-sync deleted employees every 5 minutes
                var syncTimer = new System.Timers.Timer(5 * 60 * 1000); // every 5 minutes
                syncTimer.Elapsed += async (_, _) => await SyncDeletionsFromServerAsync();
                syncTimer.Start();
                LogHelper.Write("🔥 Sync timer started");

                // Auto-init enrollment scanner on page load
                Loaded += EnrollmentPage_Loaded;
                Unloaded += EnrollmentPage_Unloaded;
                LogHelper.Write("🔥 Event handlers for Loaded/Unloaded attached");
                
                LogHelper.Write("✅ EnrollmentPage constructor completed successfully");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in EnrollmentPage constructor: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                
                // Show error to user
                try
                {
                    MessageBox.Show($"Error initializing enrollment page: {ex.Message}", "Initialization Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                catch { }
                
                // Try to initialize basic components even if there's an error
                try
                {
                    _employeeSuggestions = new ObservableCollection<EmployeeSuggestion>();
                    _allEmployees = new List<EmployeeDto>();
                }
                catch (Exception initEx)
                {
                    LogHelper.Write($"💥 Failed to initialize basic components: {initEx.Message}");
                }
            }
        }

        private void SetControlsEnabled(bool enabled)
        {
            // All controls are always enabled - no admin restrictions
            EnrollBtn.IsEnabled = enabled;
        }

        private void ImgCaptured(byte[] imgBytes)
        {
            Dispatcher.Invoke(() =>
            {
                try
                {
                    var bmp = ConvertToBitmapImage(imgBytes);
                    if (bmp != null)
                        FingerprintPreview.Source = bmp;
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"Image preview conversion failed: {ex.Message}");
                }
            });
        }

        private BitmapSource? ConvertToBitmapImage(byte[] rawImage)
        {
            int width = _enrollmentScanner.SensorWidth;
            int height = _enrollmentScanner.SensorHeight;
            int expected = _enrollmentScanner.ExpectedImageSize;

            if (width <= 0 || height <= 0) 
            {
                // Use default dimensions if not available
                width = 256;
                height = 360;
                expected = width * height;
            }
            
            if (rawImage == null || rawImage.Length < expected) return null;

            int stride = width;
            var bmp = BitmapSource.Create(width, height, 96, 96,
                System.Windows.Media.PixelFormats.Gray8, null, rawImage, stride);
            bmp.Freeze();
            return bmp;
        }

        // Called when the page loads: ensure enrollment scanner initialized
        private void EnrollmentPage_Loaded(object? sender, RoutedEventArgs e)
        {
            LogHelper.Write("🔥 EnrollmentPage_Loaded starting...");
            
            try
            {
                LogHelper.Write("🔥 About to refresh enrollment records");
                // Load fingerprint records into the grid
                RefreshEnrollmentRecords();
                LogHelper.Write("🔥 Enrollment records refreshed");
                
                // Load employee suggestions from server (async, non-blocking)
                Task.Run(async () =>
                {
                    try
                    {
                        LogHelper.Write("🔥 Loading employee suggestions from server...");
                        await LoadEmployeeSuggestionsAsync();
                        LogHelper.Write("🔥 Employee suggestions loaded");
                        
                        // After loading employees, update suggestions to show available ones
                        Dispatcher.Invoke(() => 
                        {
                            LogHelper.Write("🔥 Updating employee suggestions UI");
                            UpdateEmployeeSuggestions("");
                        });
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ Failed to load employee suggestions: {ex.Message}");
                    }
                });
                
                Task.Run(async () =>
                {
                    try
                    {
                        LogHelper.Write("🔥 Initializing enrollment scanner...");
                        // Initialize dedicated enrollment scanner (separate from attendance)
                        if (_enrollmentScanner.EnsureInitialized())
                        {
                            Dispatcher.Invoke(() => StatusText.Text = "Enrollment scanner ready.");
                            LogHelper.Write("✅ Enrollment scanner initialized successfully");
                        }
                        else
                        {
                            Dispatcher.Invoke(() => StatusText.Text = "⚠️ Enrollment scanner not connected.");
                            LogHelper.Write("❌ Failed to initialize enrollment scanner");
                        }

                        // Run initial sync on page load
                        try
                        {
                            LogHelper.Write("🔥 Running initial sync...");
                            await SyncDeletionsFromServerAsync();
                            // Refresh records after sync
                            Dispatcher.Invoke(() => RefreshEnrollmentRecords());
                            LogHelper.Write("🔥 Initial sync completed");
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ Initial sync failed: {ex.Message}");
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ EnrollmentPage initialization failed: {ex.Message}");
                        Dispatcher.Invoke(() => StatusText.Text = $"Init error: {ex.Message}");
                    }
                });
                
                LogHelper.Write("🔥 EnrollmentPage_Loaded completed successfully");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in EnrollmentPage_Loaded: {ex.Message}");
                StatusText.Text = "⚠️ Page load error - check logs";
                
                // Show error to user
                try
                {
                    MessageBox.Show($"Error loading enrollment page: {ex.Message}", "Page Load Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                catch { }
            }
        }

        // Called when the page unloads: cleanup enrollment scanner
        private void EnrollmentPage_Unloaded(object? sender, RoutedEventArgs e)
        {
            try
            {
                LogHelper.Write("📴 Enrollment page unloading - closing enrollment scanner");
                _enrollmentScanner.CloseEnrollmentScanner();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error during enrollment page unload: {ex.Message}");
            }
        }

        private void UpdateEmployeeSuggestions(string searchText)
        {
            try
            {
                // Ensure we're on the UI thread
                if (!Dispatcher.CheckAccess())
                {
                    Dispatcher.Invoke(() => UpdateEmployeeSuggestions(searchText));
                    return;
                }

                // Null check for _employeeSuggestions
                if (_employeeSuggestions == null)
                {
                    LogHelper.Write("⚠️ _employeeSuggestions is null, reinitializing...");
                    _employeeSuggestions = new ObservableCollection<EmployeeSuggestion>();
                    if (EmployeeIdInput != null)
                        EmployeeIdInput.ItemsSource = _employeeSuggestions;
                }

                _employeeSuggestions.Clear();
                
                LogHelper.Write($"🔍 UpdateEmployeeSuggestions called with searchText: '{searchText ?? "null"}'");
                LogHelper.Write($"📊 Total employees loaded: {_allEmployees?.Count ?? 0}");
                
                if (_allEmployees == null || _allEmployees.Count == 0)
                {
                    LogHelper.Write("⚠️ No employees available - _allEmployees is null or empty");
                    return;
                }

                // Get employees who already have fingerprint records with null safety
                var enrolledEmployeeIds = new HashSet<string>();
                try
                {
                    var enrollments = _dataService?.GetAllEnrollments();
                    if (enrollments != null)
                    {
                        enrolledEmployeeIds = enrollments
                            .Where(e => !string.IsNullOrEmpty(e.EmployeeId))
                            .Select(e => e.EmployeeId)
                            .ToHashSet();
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"⚠️ Error getting enrolled employees: {ex.Message}");
                }
                
                LogHelper.Write($"📋 Enrolled employees: {enrolledEmployeeIds.Count} ({string.Join(", ", enrolledEmployeeIds.Take(5))})");

                // Filter to show only employees WITHOUT fingerprint records
                var availableEmployees = _allEmployees
                    .Where(emp => emp != null && 
                                 !string.IsNullOrEmpty(emp.employeeId) &&
                                 !enrolledEmployeeIds.Contains(emp.employeeId)) // Exclude already enrolled
                    .ToList();

                LogHelper.Write($"📊 Available employees (not enrolled): {availableEmployees.Count}");

                // Apply search filter if search text is provided
                var filtered = availableEmployees;
                if (!string.IsNullOrEmpty(searchText))
                {
                    filtered = availableEmployees
                        .Where(emp => emp.employeeId.Contains(searchText, StringComparison.OrdinalIgnoreCase) ||
                                     (emp.fullname?.Contains(searchText, StringComparison.OrdinalIgnoreCase) ?? false) ||
                                     (emp.department?.Contains(searchText, StringComparison.OrdinalIgnoreCase) ?? false))
                        .ToList();
                    
                    LogHelper.Write($"🔍 Filtered results for '{searchText}': {filtered.Count}");
                }

                // Convert to suggestions and limit results
                var suggestions = filtered
                    .Take(20) // Show more results for better UX
                    .Select(emp => new EmployeeSuggestion
                    {
                        EmployeeId = emp.employeeId ?? "",
                        FullName = emp.fullname ?? "Unknown",
                        Department = emp.department ?? "Unknown"
                    })
                    .ToList();

                foreach (var suggestion in suggestions)
                {
                    _employeeSuggestions.Add(suggestion);
                }

                LogHelper.Write($"📋 Added {suggestions.Count} suggestions to ComboBox");
                
                // Debug: Log first few suggestions
                foreach (var suggestion in suggestions.Take(3))
                {
                    LogHelper.Write($"  Suggestion: {suggestion.EmployeeId} - {suggestion.FullName} ({suggestion.Department})");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error updating employee suggestions: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                
                // Try to recover by reinitializing the collection
                try
                {
                    _employeeSuggestions = new ObservableCollection<EmployeeSuggestion>();
                    if (EmployeeIdInput != null)
                        EmployeeIdInput.ItemsSource = _employeeSuggestions;
                }
                catch (Exception recoveryEx)
                {
                    LogHelper.Write($"💥 Failed to recover from UpdateEmployeeSuggestions error: {recoveryEx.Message}");
                }
            }
        }

        private void EmployeeIdInput_KeyUp(object sender, System.Windows.Input.KeyEventArgs e)
        {
            try
            {
                if (sender is not ComboBox comboBox || !comboBox.IsLoaded)
                    return;

                string searchText = comboBox.Text ?? "";
                
                // Update suggestions on UI thread with error handling
                Dispatcher.BeginInvoke(() =>
                {
                    try
                    {
                        UpdateEmployeeSuggestions(searchText);
                        
                        // Always show dropdown when typing (even if empty search)
                        if (!comboBox.IsDropDownOpen)
                        {
                            comboBox.IsDropDownOpen = true;
                        }
                        
                        LogHelper.Write($"🔍 Search updated: '{searchText}' -> {_employeeSuggestions.Count} results");
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"💥 Error updating suggestions: {ex.Message}");
                    }
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in EmployeeIdInput_KeyUp: {ex.Message}");
            }
        }

        private void EmployeeIdInput_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            try
            {
                if (sender is not ComboBox comboBox || !comboBox.IsLoaded)
                    return;
                    
                if (comboBox.SelectedItem is not EmployeeSuggestion selected)
                    return;

                // Temporarily disable events to prevent recursion
                comboBox.SelectionChanged -= EmployeeIdInput_SelectionChanged;
                
                try
                {
                    // Set the text to just the employee ID when an item is selected
                    comboBox.Text = selected.EmployeeId;
                    LogHelper.Write($"📝 Selected employee: {selected.EmployeeId} - {selected.FullName}");
                }
                finally
                {
                    comboBox.SelectionChanged += EmployeeIdInput_SelectionChanged;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in EmployeeIdInput_SelectionChanged: {ex.Message}");
            }
        }

        private void EmployeeIdInput_GotFocus(object sender, RoutedEventArgs e)
        {
            try
            {
                if (sender is ComboBox comboBox && comboBox.IsLoaded)
                {
                    // Show available employees when the ComboBox gets focus
                    Dispatcher.BeginInvoke(() =>
                    {
                        try
                        {
                            // If no employees loaded, try to load them
                            if (_allEmployees == null || _allEmployees.Count == 0)
                            {
                                LogHelper.Write("🔍 No employees loaded, attempting to load...");
                                Task.Run(async () => 
                                {
                                    await LoadEmployeeSuggestionsAsync();
                                    Dispatcher.Invoke(() => UpdateEmployeeSuggestions(comboBox.Text ?? ""));
                                });
                            }
                            else
                            {
                                UpdateEmployeeSuggestions(comboBox.Text ?? "");
                            }
                            
                            if (_employeeSuggestions.Count > 0 && !comboBox.IsDropDownOpen)
                            {
                                comboBox.IsDropDownOpen = true;
                            }
                            else if (_employeeSuggestions.Count == 0)
                            {
                                LogHelper.Write("⚠️ No suggestions available to show in dropdown");
                            }
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"💥 Error updating suggestions on focus: {ex.Message}");
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in EmployeeIdInput_GotFocus: {ex.Message}");
            }
        }

        private void EmployeeIdInput_DropDownOpened(object sender, EventArgs e)
        {
            try
            {
                if (sender is not ComboBox comboBox || !comboBox.IsLoaded)
                    return;

                // Show all available employees (without fingerprints) when dropdown is opened
                Dispatcher.BeginInvoke(() =>
                {
                    try
                    {
                        // Pass empty string to show all available employees
                        UpdateEmployeeSuggestions("");
                        LogHelper.Write($"📋 Dropdown opened: showing {_employeeSuggestions.Count} available employees");
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"💥 Error updating suggestions on dropdown open: {ex.Message}");
                    }
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in EmployeeIdInput_DropDownOpened: {ex.Message}");
            }
        }

        private async Task LoadEmployeeSuggestionsAsync()
        {
            try
            {
                // Get API URL from settings
                var settingsService = new SettingsService();
                string baseUrl = settingsService.GetApiBaseUrl();
                string url = $"{baseUrl}/employees/biometric";
                
                LogHelper.Write($"🔍 Attempting to load employees from: {url}");
                
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>(url);
                if (employees != null && employees.Count > 0)
                {
                    _allEmployees = employees;
                    LogHelper.Write($"✅ Loaded {employees.Count} active employees from server");
                    
                    // Debug: Log first few employees
                    foreach (var emp in employees.Take(3))
                    {
                        LogHelper.Write($"  Employee: {emp.employeeId} - {emp.fullname} ({emp.department})");
                    }
                }
                else
                {
                    LogHelper.Write("⚠️ Server returned empty employee list - no active employees found");
                    _allEmployees = new List<EmployeeDto>();
                    
                    // Show user-friendly message
                    Dispatcher.Invoke(() => 
                    {
                        StatusText.Text = "⚠️ No active employees found. Please add employees in the web app.";
                    });
                }
            }
            catch (HttpRequestException ex)
            {
                LogHelper.Write($"🌐 Network error loading employees: {ex.Message}");
                _allEmployees = new List<EmployeeDto>();
                
                // Show user-friendly message
                Dispatcher.Invoke(() => 
                {
                    StatusText.Text = "⚠️ Cannot connect to server. Check API URL in Admin Settings.";
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Failed to load employee suggestions: {ex.Message}");
                _allEmployees = new List<EmployeeDto>();
                
                // Show user-friendly message
                Dispatcher.Invoke(() => 
                {
                    StatusText.Text = $"⚠️ Error loading employees: {ex.Message}";
                });
            }
        }



        // Helper method for safe status updates
        private void UpdateStatusSafely(string message)
        {
            try
            {
                if (StatusText != null)
                {
                    if (Dispatcher.CheckAccess())
                    {
                        StatusText.Text = message;
                    }
                    else
                    {
                        Dispatcher.Invoke(() => StatusText.Text = message);
                    }
                }
                LogHelper.Write(message);
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error updating status: {ex.Message}");
            }
        }

        // Helper method for safe control enabling
        private void SetControlsEnabledSafely(bool enabled)
        {
            try
            {
                if (Dispatcher.CheckAccess())
                {
                    SetControlsEnabled(enabled);
                }
                else
                {
                    Dispatcher.Invoke(() => SetControlsEnabled(enabled));
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error setting controls enabled state: {ex.Message}");
            }
        }

        // ---------------- Main handlers ----------------

        private async void EnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            LogHelper.Write("🔥 EnrollBtn_Click started");
            
            UpdateStatusSafely("🔄 Starting enrollment process...");
            
            try
            {
                LogHelper.Write("🔥 About to disable controls");
                // Disable button immediately to prevent double-clicks
                SetControlsEnabledSafely(false);
                LogHelper.Write("🔥 Controls disabled");
                
                string empId = "";
                
                LogHelper.Write("🔥 About to get employee ID from ComboBox");
                // Safely get the employee ID from ComboBox with proper null checks
                try
                {
                    if (EmployeeIdInput?.SelectedItem is EmployeeSuggestion selectedEmployee && 
                        !string.IsNullOrEmpty(selectedEmployee.EmployeeId))
                    {
                        empId = selectedEmployee.EmployeeId;
                        LogHelper.Write($"🔥 Got employee ID from selected item: {empId}");
                    }
                    else if (!string.IsNullOrEmpty(EmployeeIdInput?.Text))
                    {
                        empId = EmployeeIdInput.Text.Trim();
                        LogHelper.Write($"🔥 Got employee ID from text: {empId}");
                    }
                    else
                    {
                        LogHelper.Write("🔥 No employee ID found in ComboBox");
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"💥 Error getting employee ID from ComboBox: {ex.Message}");
                    empId = EmployeeIdInput?.Text?.Trim() ?? "";
                }
                
                LogHelper.Write($"🔥 Final employee ID: '{empId}'");
                
                if (string.IsNullOrEmpty(empId))
                {
                    LogHelper.Write("🔥 Employee ID is empty, showing warning");
                    UpdateStatusSafely("⚠️ Please enter Employee ID first.");
                    return;
                }

                LogHelper.Write("🔥 About to validate services");
                // Validate services are initialized with better error handling
                if (_enrollmentScanner == null)
                {
                    LogHelper.Write("🔥 Enrollment scanner is null");
                    UpdateStatusSafely("❌ Enrollment scanner not initialized.");
                    return;
                }

                if (_dataService == null)
                {
                    LogHelper.Write("🔥 Data service is null");
                    UpdateStatusSafely("❌ Data service not initialized.");
                    return;
                }

                LogHelper.Write("🔥 About to ensure enrollment scanner is initialized");
                // Ensure enrollment scanner is properly initialized
                if (!_enrollmentScanner.EnsureInitialized())
                {
                    LogHelper.Write("🔥 Failed to ensure enrollment scanner initialization");
                    UpdateStatusSafely("❌ Failed to initialize enrollment scanner.");
                    return;
                }

                LogHelper.Write($"🔥 Starting enrollment for Employee ID: {empId}");

                // -------- Step 1: Get employee info (fullname + department) --------
                string name = string.Empty;
                string department = string.Empty;

                LogHelper.Write("🔥 About to fetch employee info from server");
                UpdateStatusSafely("🔍 Looking up employee information...");

                try
                {
                    // Get API URL from settings
                    var settingsService = new SettingsService();
                    string baseUrl = settingsService.GetApiBaseUrl();
                    
                    using var client = new HttpClient();
                    client.Timeout = TimeSpan.FromSeconds(10);
                    string url = $"{baseUrl}/employees/{empId}";
                    LogHelper.Write($"🔥 Fetching from URL: {url}");
                    
                    var response = await client.GetAsync(url);
                    LogHelper.Write($"🔥 Server response status: {response.StatusCode}");

                    if (!response.IsSuccessStatusCode)
                    {
                        LogHelper.Write($"🔥 Employee not found on server: {response.StatusCode}");
                        UpdateStatusSafely("❌ Employee does not exist in the system.");
                        return;
                    }

                    try
                    {
                        var emp = await response.Content.ReadFromJsonAsync<EmployeeDto?>();
                        if (emp != null)
                        {
                            name = emp.fullname ?? string.Empty;
                            department = emp.department ?? string.Empty;
                            LogHelper.Write($"✅ Found employee: {name} ({department})");
                            UpdateStatusSafely($"✅ Found employee: {name} ({department})");
                        }
                        else
                        {
                            LogHelper.Write("🔥 Employee data is null");
                            UpdateStatusSafely("❌ Employee data not found.");
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"Could not parse employee JSON: {ex.Message}");
                        UpdateStatusSafely($"❌ Error parsing employee data: {ex.Message}");
                        return;
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"💥 Server connection error: {ex.Message}");
                    UpdateStatusSafely($"💥 Could not connect to server: {ex.Message}");
                    return;
                }

                LogHelper.Write("🔥 About to check existing enrollments");
                UpdateStatusSafely("🔍 Checking existing enrollments...");

                LogHelper.Write("🔥 About to check existing enrollments");
                UpdateStatusSafely("🔍 Checking existing enrollments...");

                // -------- Step 2: Check if employee already has enrollment --------
                var allEnrollments = _dataService.GetAllEnrollments();
                LogHelper.Write($"🔥 Found {allEnrollments?.Count() ?? 0} total enrollments");
                
                var existingEnrollment = allEnrollments.FirstOrDefault(e => e.EmployeeId == empId);
                bool hasExisting = !string.IsNullOrEmpty(existingEnrollment.EmployeeId);
                
                LogHelper.Write($"🔥 Employee {empId} has existing enrollment: {hasExisting}");
                
                if (hasExisting)
                {
                    LogHelper.Write("🔥 Showing re-enrollment confirmation dialog");
                    UpdateStatusSafely("⚠️ Employee already enrolled. Asking for confirmation...");
                    
                    MessageBoxResult result = MessageBoxResult.No;
                    await Dispatcher.InvokeAsync(() =>
                    {
                        result = MessageBox.Show(
                            $"Employee {empId} ({name}) already has a fingerprint enrolled.\n\n" +
                            "Do you want to re-enroll and replace the existing fingerprint?",
                            "Re-enrollment Confirmation",
                            MessageBoxButton.YesNo,
                            MessageBoxImage.Question);
                    });

                    if (result != MessageBoxResult.Yes)
                    {
                        LogHelper.Write("🔥 Re-enrollment cancelled by user");
                        UpdateStatusSafely("❌ Re-enrollment cancelled.");
                        return;
                    }
                    
                    LogHelper.Write($"🔥 User confirmed re-enrollment for {empId}");
                    UpdateStatusSafely("🔄 Re-enrolling fingerprint...");
                    LogHelper.Write($"Re-enrolling fingerprint for {empId} (replacing existing enrollment)");
                }
                else
                {
                    LogHelper.Write($"🔥 New enrollment for {empId}");
                    UpdateStatusSafely("🆕 New enrollment...");
                    LogHelper.Write($"New enrollment for {empId}");
                }

                // -------- Step 3: Proceed with enrollment --------
                Dispatcher.Invoke(() => 
                {
                    StatusText.Text = "🖐️ Please place your finger 3 times...";
                    SetControlsEnabled(false);
                });

                try
                {
                    // Use dedicated enrollment scanner (async, non-blocking)
                    string? template = await _enrollmentScanner.EnrollFingerprintAsync(empId);
                    if (!string.IsNullOrEmpty(template))
                    {
                        // -------- Step 4: Confirmation dialog --------
                        Dispatcher.Invoke(() => StatusText.Text = "✅ Fingerprint captured successfully!");
                        
                        var confirmResult = MessageBox.Show(
                            $"Fingerprint captured successfully for Employee {empId} ({name}).\n\n" +
                            "Do you want to save this enrollment?\n\n" +
                            "Click 'Yes' to save or 'No' to cancel.",
                            "Confirm Enrollment",
                            MessageBoxButton.YesNo,
                            MessageBoxImage.Question);

                        if (confirmResult != MessageBoxResult.Yes)
                        {
                            Dispatcher.Invoke(() => StatusText.Text = "❌ Enrollment cancelled by user.");
                            LogHelper.Write($"Enrollment cancelled by user for {empId}");
                            return;
                        }

                        // -------- Step 5: Save enrollment --------
                        Dispatcher.Invoke(() => StatusText.Text = "💾 Saving enrollment...");
                        
                        // If re-enrolling, delete the old enrollment first
                        if (hasExisting)
                        {
                            try
                            {
                                _dataService.DeleteEnrollment(empId);
                                LogHelper.Write($"Deleted old enrollment for {empId} before re-enrollment");
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"⚠️ Failed to delete old enrollment: {ex.Message}");
                            }
                        }

                        // Save enrollment and get the inserted row id
                        long rowId = _data_service_save_enrollment(empId, template, name, department);

                        if (rowId > 0)
                        {
                            // Save photo if one was selected
                            if (!string.IsNullOrEmpty(_selectedPhotoPath))
                            {
                                try
                                {
                                    bool photoSaved = _photoService.SavePhoto(empId, _selectedPhotoPath);
                                    if (photoSaved)
                                    {
                                        LogHelper.Write($"📷 Photo saved for {empId}");
                                    }
                                    else
                                    {
                                        LogHelper.Write($"⚠️ Failed to save photo for {empId}");
                                    }
                                }
                                catch (Exception photoEx)
                                {
                                    LogHelper.Write($"⚠️ Photo save error for {empId}: {photoEx.Message}");
                                    // Don't fail enrollment if photo save fails
                                }
                                
                                // Clear photo selection after enrollment
                                Dispatcher.Invoke(() =>
                                {
                                    _selectedPhotoPath = null;
                                    PhotoPreview.Source = null;
                                    PhotoPreview.Visibility = Visibility.Collapsed;
                                    PhotoPlaceholder.Visibility = Visibility.Visible;
                                    RemovePhotoBtn.Visibility = Visibility.Collapsed;
                                });
                            }

                            // Load the new template into the attendance scanner SDK (not enrollment scanner)
                            try
                            {
                                var blob = Convert.FromBase64String(template);
                                bool loaded = _zkService.AddTemplateToSdk((int)rowId, blob);
                                if (!loaded)
                                {
                                    LogHelper.Write($"⚠️ Enrollment saved but AddTemplateToSdk returned false for row {rowId}.");
                                }
                                else
                                {
                                    LogHelper.Write($"✅ Template added to attendance scanner SDK for row {rowId}");
                                }
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"💥 Failed to add template to attendance scanner SDK for row {rowId}: {ex.Message}");
                            }

                            string action = hasExisting ? "Re-enrolled" : "Enrolled";
                            Dispatcher.Invoke(() => StatusText.Text = $"✅ {action} successfully for {empId} (row {rowId})");
                            LogHelper.Write($"{action} for {empId} ({name}, {department}) -> row {rowId}");
                            
                            // Update backend to mark employee as having fingerprint
                            try
                            {
                                await UpdateEmployeeFingerprintStatusAsync(empId, true);
                                LogHelper.Write($"✅ Updated backend: {empId} has_fingerprint = true");
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"⚠️ Failed to update backend fingerprint status: {ex.Message}");
                                // Don't fail the enrollment if backend update fails
                            }
                            
                            // Refresh the enrollment records grid on UI thread
                            Dispatcher.Invoke(() => RefreshEnrollmentRecords());
                        }
                        else
                        {
                            Dispatcher.Invoke(() => StatusText.Text = $"❌ Failed to save enrollment for {empId}");
                            LogHelper.Write($"❌ SaveEnrollment returned {rowId} for {empId}");
                        }
                    }
                    else
                    {
                        Dispatcher.Invoke(() => StatusText.Text = $"❌ Enrollment failed for {empId}");
                        LogHelper.Write($"❌ Fingerprint enrollment failed for {empId}");
                    }
                }
                catch (Exception enrollEx)
                {
                    Dispatcher.Invoke(() => StatusText.Text = $"❌ Enrollment error: {enrollEx.Message}");
                    LogHelper.Write($"💥 Enrollment process error for {empId}: {enrollEx.Message}");
                }
                finally
                {
                    Dispatcher.Invoke(() => SetControlsEnabled(true));
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Unexpected error in EnrollBtn_Click: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                UpdateStatusSafely($"❌ Unexpected error: {ex.Message}");
                
                // Ensure controls are re-enabled even if there's an error
                try
                {
                    SetControlsEnabledSafely(true);
                }
                catch (Exception enableEx)
                {
                    LogHelper.Write($"💥 Error re-enabling controls: {enableEx.Message}");
                }
            }
            finally
            {
                LogHelper.Write("🔥 EnrollBtn_Click finally block");
                // Always re-enable controls
                SetControlsEnabledSafely(true);
                LogHelper.Write("🔥 EnrollBtn_Click completed");
            }
        }

        // ---------------- Safe sync helpers ----------------

        /// <summary>
        /// Non-destructive check: queries server and logs which local enrollments are missing on server.
        /// Useful to run on a timer for monitoring but does NOT delete anything.
        /// </summary>
        private async Task SafeSyncCheckAsync()
        {
            try
            {
                // Get API URL from settings
                var settingsService = new SettingsService();
                string baseUrl = settingsService.GetApiBaseUrl();
                
                using var client = new HttpClient();
                string url = $"{baseUrl}/employees";
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>(url);
                if (employees == null || employees.Count == 0) return;

                var apiIds = employees.Select(e => e.employeeId).ToHashSet();
                var local = _dataService.GetAllEnrollments();
                var missing = local.Where(l => !apiIds.Contains(l.EmployeeId)).Select(l => l.EmployeeId).ToList();
                if (missing.Count > 0)
                {
                    LogHelper.Write($"⚠️ Sync check found {missing.Count} local employees missing on server: {string.Join(',', missing)} (no deletion performed).");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Safe sync check failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Sync with server: deletes local enrollments for employees that no longer exist on server.
        /// Creates a backup before deletion and only runs if server connection is successful.
        /// Runs automatically every 5 minutes.
        /// </summary>
        private async Task SyncDeletionsFromServerAsync()
        {
            try
            {
                // Get API URL from settings
                var settingsService = new SettingsService();
                string baseUrl = settingsService.GetApiBaseUrl();
                
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10); // 10 second timeout
                string url = $"{baseUrl}/employees";
                
                // Try to fetch employees from server
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>(url);

                // Guard: if the API returned null or an empty list, skip deletion entirely.
                if (employees == null)
                {
                    LogHelper.Write("⚠️ Sync aborted: server returned null for employees list.");
                    return;
                }

                if (employees.Count == 0)
                {
                    // Defensive: server returned empty list -> do not delete local records.
                    LogHelper.Write("⚠️ Sync aborted: server returned an empty employees list. No deletions performed.");
                    return;
                }

                // Get active employees only (exclude inactive)
                var activeEmployeeIds = employees
                    .Where(e => e.employeeId != null)
                    .Select(e => e.employeeId)
                    .ToHashSet();
                
                var local = _dataService.GetAllEnrollments();

                // Find enrollments that need to be deleted (not in server list)
                var toDelete = local.Where(enroll => !activeEmployeeIds.Contains(enroll.EmployeeId)).ToList();

                if (toDelete.Count == 0)
                {
                    LogHelper.Write("✅ Sync check: All local enrollments match server. No deletions needed.");
                    return;
                }

                // Safety check: only abort if ALL records would be deleted
                if (toDelete.Count == local.Count && local.Count > 0)
                {
                    LogHelper.Write($"⚠️ Sync aborted: Would delete ALL {local.Count} enrollments. Server might be returning wrong data.");
                    return;
                }

                // Make a backup of the DB before any destructive operation
                try
                {
                    var dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
                    if (File.Exists(dbPath))
                    {
                        var backupPath = dbPath + ".bak." + TimezoneHelper.Now.ToString("yyyyMMddHHmmss");
                        File.Copy(dbPath, backupPath);
                        LogHelper.Write($"🗄️ Backup created before sync: {backupPath}");
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"⚠️ Failed to create DB backup before sync: {ex.Message} — aborting deletion for safety.");
                    return;
                }

                // Delete enrollments for employees no longer on server
                int deleted = 0;
                foreach (var enroll in toDelete)
                {
                    try
                    {
                        LogHelper.Write($"🗑️ Deleting enrollment for {enroll.EmployeeId} ({enroll.Name}) - not found on server");
                        _dataService.DeleteEnrollment(enroll.EmployeeId);
                        deleted++;
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"❌ Failed to delete enrollment for {enroll.EmployeeId}: {ex.Message}");
                    }
                }

                if (deleted > 0)
                {
                    LogHelper.Write($"✅ Sync complete: {deleted} enrollment(s) deleted from local database.");
                    
                    // Reload templates into attendance scanner SDK after deletion
                    try
                    {
                        _zkService.LoadEnrollmentsToSdk(_dataService);
                        LogHelper.Write("🔄 Templates reloaded into attendance scanner SDK after sync.");
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ Failed to reload templates into attendance scanner after sync: {ex.Message}");
                    }
                }
            }
            catch (HttpRequestException ex)
            {
                // Server not reachable - this is expected when offline, don't spam logs
                LogHelper.Write($"ℹ️ Sync skipped: Server not reachable ({ex.Message})");
            }
            catch (TaskCanceledException)
            {
                LogHelper.Write("ℹ️ Sync skipped: Server request timed out");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Sync error: {ex.Message}");
            }
        }

        // small wrapper for DataService.SaveEnrollment so we can centralize logging or adjust behavior
        private long _data_service_save_enrollment(string employeeId, string templateBase64, string? name, string? department)
        {
            try
            {
                var id = _dataService.SaveEnrollment(employeeId, templateBase64, name, department);
                return id;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 _data_service_save_enrollment error: {ex.Message}");
                return -1;
            }
        }

        /// <summary>
        /// Updates the backend to mark an employee as having (or not having) a fingerprint enrolled
        /// </summary>
        private async Task UpdateEmployeeFingerprintStatusAsync(string employeeId, bool hasFingerprint)
        {
            try
            {
                // Get API URL from settings
                var settingsService = new SettingsService();
                string baseUrl = settingsService.GetApiBaseUrl();
                
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                
                var payload = new { has_fingerprint = hasFingerprint };
                string url = $"{baseUrl}/employees/{employeeId}/fingerprint";
                
                var response = await client.PutAsJsonAsync(url, payload);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"⚠️ Backend update failed ({response.StatusCode}): {errorContent}");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error updating backend fingerprint status: {ex.Message}");
                throw; // Re-throw so caller can handle
            }
        }

        // helper to centralize use of data service (keeps future refactors simple)
        private DataService _data_service_get() => _dataService;

        // Refresh the enrollment records grid
        private void RefreshEnrollmentRecords()
        {
            try
            {
                LogHelper.Write("🔥 RefreshEnrollmentRecords starting...");
                
                // Ensure we're on the UI thread
                if (!Dispatcher.CheckAccess())
                {
                    LogHelper.Write("🔥 Not on UI thread, invoking...");
                    Dispatcher.Invoke(() => RefreshEnrollmentRecords());
                    return;
                }

                LogHelper.Write("🔥 Getting all enrollments from data service...");
                var enrollments = _dataService.GetAllEnrollments();
                LogHelper.Write($"🔥 Found {enrollments?.Count() ?? 0} enrollments");
                
                var rows = enrollments.Select(e => new
                {
                    EmployeeId = e.EmployeeId,
                    Name = e.Name ?? "N/A",
                    Department = e.Department ?? "N/A",
                    CreatedAt = "Enrolled"
                }).ToList();

                LogHelper.Write($"🔥 Created {rows.Count} display rows");

                var grid = this.FindName("EnrollmentsGrid") as DataGrid;
                if (grid != null)
                {
                    LogHelper.Write("🔥 Setting grid ItemsSource...");
                    grid.ItemsSource = rows;
                    LogHelper.Write($"📋 Loaded {rows.Count} enrollment records");
                }
                else
                {
                    LogHelper.Write("⚠️ EnrollmentsGrid not found");
                }

                LogHelper.Write("🔥 Updating employee suggestions...");
                // Update employee suggestions to reflect current enrollment state
                UpdateEmployeeSuggestions(EmployeeIdInput?.Text ?? "");
                LogHelper.Write("🔥 RefreshEnrollmentRecords completed");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Failed to load enrollment records: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                
                try
                {
                    if (Dispatcher.CheckAccess())
                    {
                        StatusText.Text = $"Failed to load records: {ex.Message}";
                    }
                    else
                    {
                        Dispatcher.Invoke(() => StatusText.Text = $"Failed to load records: {ex.Message}");
                    }
                }
                catch (Exception dispatcherEx)
                {
                    LogHelper.Write($"💥 Error updating status text: {dispatcherEx.Message}");
                }
                
                // Show error to user
                try
                {
                    MessageBox.Show($"Error loading enrollment records: {ex.Message}", "Data Load Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                catch { }
            }
        }

        // Refresh button click handler
        private void RefreshRecordsBtn_Click(object sender, RoutedEventArgs e)
        {
            RefreshEnrollmentRecords();
            StatusText.Text = "✅ Records refreshed";
        }

        // Delete enrollment button click handler
        private async void DeleteEnrollmentBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (sender is Button btn && btn.Tag is string employeeId)
                {
                    // Confirm deletion
                    var result = MessageBox.Show(
                        $"Are you sure you want to delete the fingerprint record for Employee ID: {employeeId}?",
                        "Confirm Deletion",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Warning);

                    if (result == MessageBoxResult.Yes)
                    {
                        _dataService.DeleteEnrollment(employeeId);
                        LogHelper.Write($"🗑️ Deleted enrollment for {employeeId}");
                        
                        // Update backend to mark employee as NOT having fingerprint
                        try
                        {
                            await UpdateEmployeeFingerprintStatusAsync(employeeId, false);
                            LogHelper.Write($"✅ Updated backend: {employeeId} has_fingerprint = false");
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ Failed to update backend fingerprint status: {ex.Message}");
                            // Don't fail the deletion if backend update fails
                        }
                        
                        // Reload templates into attendance scanner SDK after deletion
                        try
                        {
                            _zkService.LoadEnrollmentsToSdk(_dataService);
                            LogHelper.Write("🔄 Templates reloaded into attendance scanner SDK after deletion");
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"⚠️ Failed to reload templates into attendance scanner: {ex.Message}");
                        }
                        
                        // Refresh the grid
                        RefreshEnrollmentRecords();
                        StatusText.Text = $"✅ Deleted fingerprint for {employeeId}";
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Delete enrollment error: {ex.Message}");
                StatusText.Text = $"❌ Delete failed: {ex.Message}";
                MessageBox.Show($"Failed to delete enrollment: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // Photo upload button click handler
        private void UploadPhotoBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var openFileDialog = new Microsoft.Win32.OpenFileDialog
                {
                    Title = "Select Employee Photo",
                    Filter = "Image Files (*.jpg;*.jpeg;*.png;*.bmp)|*.jpg;*.jpeg;*.png;*.bmp|All Files (*.*)|*.*",
                    FilterIndex = 1
                };

                if (openFileDialog.ShowDialog() == true)
                {
                    _selectedPhotoPath = openFileDialog.FileName;
                    
                    // Load and display preview
                    var bitmap = new BitmapImage();
                    bitmap.BeginInit();
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.UriSource = new Uri(_selectedPhotoPath, UriKind.Absolute);
                    bitmap.EndInit();
                    
                    PhotoPreview.Source = bitmap;
                    PhotoPreview.Visibility = Visibility.Visible;
                    PhotoPlaceholder.Visibility = Visibility.Collapsed;
                    RemovePhotoBtn.Visibility = Visibility.Visible;
                    
                    LogHelper.Write($"📷 Photo selected: {_selectedPhotoPath}");
                    StatusText.Text = "📷 Photo selected - ready to enroll";
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error selecting photo: {ex.Message}");
                MessageBox.Show($"Failed to load photo: {ex.Message}", "Photo Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // Remove photo button click handler
        private void RemovePhotoBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                _selectedPhotoPath = null;
                PhotoPreview.Source = null;
                PhotoPreview.Visibility = Visibility.Collapsed;
                PhotoPlaceholder.Visibility = Visibility.Visible;
                RemovePhotoBtn.Visibility = Visibility.Collapsed;
                
                LogHelper.Write("🗑️ Photo removed");
                StatusText.Text = "Photo removed";
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error removing photo: {ex.Message}");
            }
        }
    }
}
