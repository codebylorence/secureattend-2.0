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

        public async Task<bool> SendAttendanceAsync(string employeeId, DateTime? clockIn, DateTime? clockOut = null, string status = "IN")
        {
            try
            {
                var payload = new
                {
                    employee_id = employeeId,
                    clock_in = clockIn?.ToString("yyyy-MM-ddTHH:mm:ss"),
                    clock_out = clockOut?.ToString("yyyy-MM-ddTHH:mm:ss"),
                    status = status
                };

                var options = new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
                    WriteIndented = false
                };

                var json = JsonSerializer.Serialize(payload, options);
                LogHelper.Write($"📤 Sending to server: {json}");
                
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_baseUrl}/api/attendances", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"✅ Attendance sent successfully for {employeeId}");
                    LogHelper.Write($"   Server response: {responseContent}");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogHelper.Write($"❌ Failed to send attendance: {response.StatusCode}");
                    LogHelper.Write($"   Error details: {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error sending attendance to server: {ex.Message}");
                LogHelper.Write($"   Stack trace: {ex.StackTrace}");
                return false;
            }
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
}
