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
        private readonly string _baseUrl;

        public ApiService(string baseUrl = "http://localhost:5000")
        {
            _httpClient = new HttpClient();
            _baseUrl = baseUrl;
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

        public async Task<List<EmployeeSchedule>?> GetPublishedSchedulesAsync()
        {
            try
            {
                LogHelper.Write("📥 Fetching published schedules from server...");
                var response = await _httpClient.GetAsync($"{_baseUrl}/api/employee-schedules/published");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var schedules = JsonSerializer.Deserialize<List<EmployeeSchedule>>(json, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    LogHelper.Write($"✅ Retrieved {schedules?.Count ?? 0} published schedule(s)");
                    return schedules;
                }
                else
                {
                    LogHelper.Write($"⚠️ Failed to get schedules: {response.StatusCode}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting schedules: {ex.Message}");
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

        public async Task<List<ScheduleNotification>?> GetScheduleNotificationsAsync()
        {
            try
            {
                LogHelper.Write("📥 Fetching schedule notifications from server...");
                var response = await _httpClient.GetAsync($"{_baseUrl}/api/schedule-notifications/unacknowledged");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<ScheduleNotificationResponse>(json, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    LogHelper.Write($"✅ Retrieved {result?.Notifications?.Count ?? 0} schedule notification(s)");
                    return result?.Notifications;
                }
                else
                {
                    LogHelper.Write($"⚠️ Failed to get schedule notifications: {response.StatusCode}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting schedule notifications: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> AcknowledgeNotificationAsync(int notificationId)
        {
            try
            {
                LogHelper.Write($"📤 Acknowledging notification {notificationId}");
                
                var response = await _httpClient.PutAsync($"{_baseUrl}/api/schedule-notifications/{notificationId}/acknowledge", null);

                if (response.IsSuccessStatusCode)
                {
                    LogHelper.Write($"✅ Notification {notificationId} acknowledged successfully");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"❌ Failed to acknowledge notification: {response.StatusCode} - {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error acknowledging notification: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> AcknowledgeAllNotificationsAsync()
        {
            try
            {
                LogHelper.Write("📤 Acknowledging all notifications");
                
                var response = await _httpClient.PutAsync($"{_baseUrl}/api/schedule-notifications/acknowledge-all", null);

                if (response.IsSuccessStatusCode)
                {
                    LogHelper.Write("✅ All notifications acknowledged successfully");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"❌ Failed to acknowledge all notifications: {response.StatusCode} - {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error acknowledging all notifications: {ex.Message}");
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
        public Dictionary<string, List<string>>? Schedule_Dates { get; set; }
        public string? Department { get; set; }
        public string? Assigned_By { get; set; }
        public DateTime? Created_At { get; set; }
        public DateTime? Updated_At { get; set; }
    }

    public class OvertimeAssignment
    {
        public string? EmployeeId { get; set; }
        public string? Reason { get; set; }
        public double EstimatedHours { get; set; }
        public DateTime AssignedDate { get; set; }
        public string? AssignedBy { get; set; }
    }

    public class ScheduleNotification
    {
        public int Id { get; set; }
        public string? Message { get; set; }
        public string? Type { get; set; }
        public string? Details { get; set; }
        public bool Is_Acknowledged { get; set; }
        public string? Created_By { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? Acknowledged_At { get; set; }
    }

    public class ScheduleNotificationResponse
    {
        public bool Success { get; set; }
        public List<ScheduleNotification>? Notifications { get; set; }
        public int Count { get; set; }
    }
}
