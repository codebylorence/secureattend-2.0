using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace BiometricEnrollmentApp.Services
{
    public class ApiService
    {
        private readonly HttpClient _httpClient;
        private string _baseUrl;
        private readonly SettingsService _settingsService;

        public ApiService(string? baseUrl = null)
        {
            _httpClient = new HttpClient();
            _settingsService = new SettingsService();
            
            // Use provided URL, or get from settings, or default to localhost
            _baseUrl = baseUrl ?? _settingsService.GetApiBaseUrl();
            
            LogHelper.Write($"🌐 ApiService initialized with base URL: {_baseUrl}");
        }

        /// <summary>
        /// Update the base URL for API calls (useful when changing settings)
        /// </summary>
        public void UpdateBaseUrl(string newUrl)
        {
            _baseUrl = newUrl.TrimEnd('/');
            LogHelper.Write($"🔄 API base URL updated to: {_baseUrl}");
        }

        public async Task<EmployeeDetails?> GetEmployeeDetailsAsync(string employeeId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/api/employees/{employeeId}");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var employee = JsonSerializer.Deserialize<EmployeeDetails>(json, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    LogHelper.Write($"✅ Retrieved employee details for {employeeId}");
                    return employee;
                }
                else
                {
                    LogHelper.Write($"⚠️ Failed to get employee details: {response.StatusCode}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting employee details: {ex.Message}");
                return null;
            }
        }

        public async Task<string?> GetEmployeePhotoAsync(string employeeId)
        {
            try
            {
                var employee = await GetEmployeeDetailsAsync(employeeId);
                return employee?.Photo;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting employee photo: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> SendAttendanceAsync(string employeeId, DateTime? clockIn, DateTime? clockOut = null, string status = "Present")
        {
            int maxRetries = 3;
            int retryDelay = 1000; // Start with 1 second
            
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    var payload = new
                    {
                        employee_id = employeeId,
                        clock_in = clockIn.HasValue ? TimezoneHelper.FormatForApi(clockIn.Value) : null,
                        clock_out = clockOut.HasValue ? TimezoneHelper.FormatForApi(clockOut.Value) : null,
                        status = status
                    };

                    // Debug logging for timezone conversion
                    if (clockIn.HasValue)
                    {
                        LogHelper.Write($"🕐 Philippines time: {clockIn.Value:yyyy-MM-dd HH:mm:ss}");
                        LogHelper.Write($"🌍 UTC for API: {TimezoneHelper.FormatForApi(clockIn.Value)}");
                    }

                    var options = new JsonSerializerOptions
                    {
                        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
                        WriteIndented = false
                    };

                    var json = JsonSerializer.Serialize(payload, options);
                    LogHelper.Write($"📤 Attempt {attempt}/{maxRetries} - Sending to server: {json}");
                    
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await _httpClient.PostAsync($"{_baseUrl}/api/attendances", content);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        LogHelper.Write($"✅ Attendance sent successfully for {employeeId} on attempt {attempt}");
                        LogHelper.Write($"   Server response: {responseContent}");
                        return true;
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        LogHelper.Write($"❌ Attempt {attempt}/{maxRetries} failed: {response.StatusCode}");
                        LogHelper.Write($"   Error details: {errorContent}");
                        
                        // Handle double-tap prevention (429 Too Many Requests)
                        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                        {
                            try
                            {
                                var errorResponse = JsonSerializer.Deserialize<DoubleTapResponse>(errorContent, new JsonSerializerOptions 
                                { 
                                    PropertyNameCaseInsensitive = true 
                                });
                                
                                if (errorResponse?.WaitTime > 0)
                                {
                                    LogHelper.Write($"⚠️ Double-tap prevention: Waiting {errorResponse.WaitTime} seconds before allowing next scan");
                                    // Don't retry immediately for double-tap prevention
                                    return false;
                                }
                            }
                            catch (Exception parseEx)
                            {
                                LogHelper.Write($"⚠️ Could not parse double-tap response: {parseEx.Message}");
                            }
                            return false;
                        }
                        
                        // Don't retry on client errors (4xx), only server errors (5xx) and network issues
                        if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
                        {
                            LogHelper.Write($"❌ Client error - not retrying");
                            return false;
                        }
                        
                        if (attempt < maxRetries)
                        {
                            LogHelper.Write($"⏳ Waiting {retryDelay}ms before retry...");
                            await Task.Delay(retryDelay);
                            retryDelay *= 2; // Exponential backoff
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"❌ Attempt {attempt}/{maxRetries} failed with exception: {ex.Message}");
                    
                    if (attempt < maxRetries)
                    {
                        LogHelper.Write($"⏳ Waiting {retryDelay}ms before retry...");
                        await Task.Delay(retryDelay);
                        retryDelay *= 2; // Exponential backoff
                    }
                }
            }
            
            LogHelper.Write($"❌ All {maxRetries} attempts failed for employee {employeeId}");
            return false;
        }

        public async Task<List<EmployeeSchedule>?> GetAllSchedulesAsync()
        {
            try
            {
                LogHelper.Write("📥 Fetching all schedules from server (biometric endpoint)...");
                var response = await _httpClient.GetAsync($"{_baseUrl}/api/schedules/biometric");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var schedules = JsonSerializer.Deserialize<List<EmployeeSchedule>>(json, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    LogHelper.Write($"✅ Retrieved {schedules?.Count ?? 0} schedule(s) from biometric endpoint");
                    return schedules;
                }
                else
                {
                    LogHelper.Write($"⚠️ Failed to get schedules from biometric endpoint: {response.StatusCode}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting schedules from biometric endpoint: {ex.Message}");
                return null;
            }
        }

        public async Task<List<ServerEmployee>?> GetAllEmployeesAsync()
        {
            try
            {
                LogHelper.Write("📥 Fetching all employees from server...");
                var response = await _httpClient.GetAsync($"{_baseUrl}/api/employees");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var employees = JsonSerializer.Deserialize<List<ServerEmployee>>(json, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    LogHelper.Write($"✅ Retrieved {employees?.Count ?? 0} employee(s)");
                    return employees;
                }
                else
                {
                    LogHelper.Write($"⚠️ Failed to get employees: {response.StatusCode}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting employees: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> AssignOvertimeAsync(OvertimeAssignment assignment)
        {
            try
            {
                var payload = new
                {
                    employee_id = assignment.EmployeeId,
                    reason = assignment.Reason,
                    estimated_hours = assignment.EstimatedHours,
                    assigned_date = assignment.AssignedDate.ToString("yyyy-MM-dd"),
                    assigned_by = assignment.AssignedBy
                };

                var json = JsonSerializer.Serialize(payload);
                LogHelper.Write($"📤 Assigning overtime: {json}");
                
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_baseUrl}/api/overtime/assign", content);

                if (response.IsSuccessStatusCode)
                {
                    LogHelper.Write($"✅ Overtime assignment sent successfully for {assignment.EmployeeId}");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"❌ Failed to assign overtime: {response.StatusCode} - {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error assigning overtime: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> RemoveOvertimeAsync(string employeeId)
        {
            try
            {
                LogHelper.Write($"📤 Removing overtime assignment for {employeeId}");
                
                var response = await _httpClient.DeleteAsync($"{_baseUrl}/api/overtime/{employeeId}");

                if (response.IsSuccessStatusCode)
                {
                    LogHelper.Write($"✅ Overtime removal sent successfully for {employeeId}");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"❌ Failed to remove overtime: {response.StatusCode} - {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error removing overtime: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Sync multiple attendance records to the server in bulk
        /// </summary>
        public async Task<bool> SyncAttendanceRecordsAsync(List<object> records)
        {
            try
            {
                var payload = new
                {
                    records = records
                };

                var options = new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
                    WriteIndented = false
                };

                var json = JsonSerializer.Serialize(payload, options);
                LogHelper.Write($"📤 Syncing {records.Count} attendance records to server...");
                
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_baseUrl}/api/attendances/sync-from-biometric", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"✅ Bulk sync successful: {responseContent}");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"❌ Bulk sync failed: {response.StatusCode} - {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in bulk sync: {ex.Message}");
                return false;
            }
        }

    }

    public class EmployeeDetails
    {
        public int Id { get; set; }
        public string? Employee_Id { get; set; }
        public string? Fullname { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? Contact_Number { get; set; }
        public string? Email { get; set; }
        public string? Photo { get; set; }
        public string? Status { get; set; }
    }

    public class ServerEmployee
    {
        public string? EmployeeId { get; set; }
        public string? Fullname { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? Status { get; set; }
    }

    public class EmployeeSchedule
    {
        public int Id { get; set; }
        public string? Employee_Id { get; set; }
        public int Template_Id { get; set; }
        public string? Shift_Name { get; set; }
        public string? Start_Time { get; set; }
        public string? End_Time { get; set; }
        public List<string>? Days { get; set; }
        public string? Specific_Date { get; set; }
        public string? Department { get; set; }
        public string? Employee_Name { get; set; }
        public string? Assigned_By { get; set; }
        public string? Assigned_Date { get; set; }
        public DateTime? Created_At { get; set; }
        public DateTime? Updated_At { get; set; }
        
        // Legacy fields for backward compatibility
        public Dictionary<string, List<string>>? Schedule_Dates { get; set; }
    }

    public class OvertimeAssignment
    {
        public string? EmployeeId { get; set; }
        public string? Reason { get; set; }
        public double EstimatedHours { get; set; }
        public DateTime AssignedDate { get; set; }
        public string? AssignedBy { get; set; }
    }

    public class DoubleTapResponse
    {
        public string? Error { get; set; }
        public string? Message { get; set; }
        public int WaitTime { get; set; }
    }
}
