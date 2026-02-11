using System;
using System.Data.SqlClient;
using Microsoft.Data.Sqlite;
using System.Linq;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    /// <summary>
    /// Diagnostic helper to debug absent marking issues
    /// Run this to see detailed information about schedules and attendance
    /// </summary>
    public class DiagnosticHelper
    {
        private readonly DataService _dataService;
        private readonly string _dbPath;

        public DiagnosticHelper()
        {
            _dataService = new DataService();
            var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _dbPath = System.IO.Path.Combine(appDataPath, "BiometricEnrollment", "biometric.db");
        }

        public void RunDiagnostics()
        {
            LogHelper.Write("========================================");
            LogHelper.Write("🔍 DIAGNOSTIC REPORT");
            LogHelper.Write("========================================");
            
            var now = TimezoneHelper.Now;
            LogHelper.Write($"📅 Current Date/Time: {now:yyyy-MM-dd HH:mm:ss} ({now.DayOfWeek})");
            LogHelper.Write($"📍 Timezone: Asia/Manila (Philippines)");
            LogHelper.Write("");
            
            // 1. Check schedules in database
            CheckSchedules();
            LogHelper.Write("");
            
            // 2. Check today's attendance sessions
            CheckAttendanceSessions();
            LogHelper.Write("");
            
            // 3. Check specific employees (James and Lorence)
            CheckSpecificEmployee("TSI00111", "James Tojon");
            LogHelper.Write("");
            CheckSpecificEmployee("TSI12345", "Lorence Rodriguez");
            LogHelper.Write("");
            
            // 4. Test absent marking logic
            TestAbsentMarkingLogic();
            
            LogHelper.Write("========================================");
            LogHelper.Write("🔍 END DIAGNOSTIC REPORT");
            LogHelper.Write("========================================");
        }

        private void CheckSchedules()
        {
            LogHelper.Write("📋 CHECKING SCHEDULES");
            LogHelper.Write("─────────────────────");
            
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();
                
                // Total schedules
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT COUNT(*) FROM EmployeeSchedules";
                    var total = Convert.ToInt32(cmd.ExecuteScalar());
                    LogHelper.Write($"Total schedules in database: {total}");
                }
                
                // Today's schedules
                var todaySchedules = _dataService.GetTodaysSchedules();
                LogHelper.Write($"Schedules for today: {todaySchedules.Count}");
                
                if (todaySchedules.Count > 0)
                {
                    LogHelper.Write("Today's schedule details:");
                    foreach (var sched in todaySchedules)
                    {
                        LogHelper.Write($"  • {sched.EmployeeId}: {sched.ShiftName} ({sched.StartTime} - {sched.EndTime})");
                    }
                }
                else
                {
                    LogHelper.Write("⚠️ NO SCHEDULES FOUND FOR TODAY!");
                    
                    // Show sample schedules
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT employee_id, shift_name, start_time, end_time, days, schedule_dates FROM EmployeeSchedules LIMIT 5";
                    using var reader = cmd.ExecuteReader();
                    
                    LogHelper.Write("Sample schedules in database:");
                    while (reader.Read())
                    {
                        var empId = reader.GetString(0);
                        var shift = reader.GetString(1);
                        var start = reader.GetString(2);
                        var end = reader.GetString(3);
                        var days = reader.GetString(4);
                        var dates = reader.IsDBNull(5) ? "" : reader.GetString(5);
                        LogHelper.Write($"  • {empId}: {shift} ({start}-{end}) Days: '{days}' Dates: '{dates}'");
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error checking schedules: {ex.Message}");
            }
        }

        private void CheckAttendanceSessions()
        {
            LogHelper.Write("📊 CHECKING ATTENDANCE SESSIONS");
            LogHelper.Write("────────────────────────────────");
            
            try
            {
                var sessions = _dataService.GetTodaySessions();
                LogHelper.Write($"Total attendance sessions today: {sessions.Count}");
                
                if (sessions.Count > 0)
                {
                    LogHelper.Write("Today's attendance details:");
                    foreach (var session in sessions)
                    {
                        var clockInStr = string.IsNullOrEmpty(session.ClockIn) ? "NULL" : session.ClockIn;
                        var clockOutStr = string.IsNullOrEmpty(session.ClockOut) ? "NULL" : session.ClockOut;
                        LogHelper.Write($"  • {session.EmployeeId}: In={clockInStr}, Out={clockOutStr}, Status={session.Status}");
                    }
                }
                else
                {
                    LogHelper.Write("No attendance sessions found for today");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error checking attendance: {ex.Message}");
            }
        }

        private void CheckSpecificEmployee(string employeeId, string employeeName)
        {
            LogHelper.Write($"👤 CHECKING {employeeName} ({employeeId})");
            LogHelper.Write("────────────────────────────────");
            
            try
            {
                // Check if scheduled today
                var schedules = _dataService.GetTodaysSchedules();
                var empSchedule = schedules.FirstOrDefault(s => s.EmployeeId == employeeId);
                
                if (empSchedule.EmployeeId != null)
                {
                    LogHelper.Write($"✓ Scheduled: {empSchedule.ShiftName} ({empSchedule.StartTime} - {empSchedule.EndTime})");
                    
                    // Check if shift ended
                    var now = TimezoneHelper.Now;
                    LogHelper.Write($"  Current time: {now:HH:mm:ss}");
                    LogHelper.Write($"  Shift end: {empSchedule.EndTime}");
                    
                    // Parse shift end time
                    var endTimeParts = empSchedule.EndTime.Split(':');
                    if (endTimeParts.Length >= 2)
                    {
                        int endHour = int.Parse(endTimeParts[0]);
                        int endMinute = int.Parse(endTimeParts[1]);
                        var shiftEnd = now.Date.AddHours(endHour).AddMinutes(endMinute);
                        var shiftEndWithGrace = shiftEnd.AddMinutes(30); // 30 min grace period
                        
                        LogHelper.Write($"  Shift end time: {shiftEnd:HH:mm:ss}");
                        LogHelper.Write($"  Shift end + grace: {shiftEndWithGrace:HH:mm:ss}");
                        LogHelper.Write($"  Has shift ended? {now >= shiftEndWithGrace}");
                    }
                }
                else
                {
                    LogHelper.Write($"✗ NOT scheduled for today");
                }
                
                // Check attendance
                var sessions = _dataService.GetTodaySessions();
                var empSession = sessions.FirstOrDefault(s => s.EmployeeId == employeeId);
                
                if (empSession.EmployeeId != null)
                {
                    LogHelper.Write($"✓ Has attendance session:");
                    LogHelper.Write($"  Clock In: {(string.IsNullOrEmpty(empSession.ClockIn) ? "NULL" : empSession.ClockIn)}");
                    LogHelper.Write($"  Clock Out: {(string.IsNullOrEmpty(empSession.ClockOut) ? "NULL" : empSession.ClockOut)}");
                    LogHelper.Write($"  Status: {empSession.Status}");
                    LogHelper.Write($"  Total Hours: {empSession.TotalHours}");
                    
                    // Determine what should happen
                    if (empSchedule.EmployeeId != null)
                    {
                        if (string.IsNullOrEmpty(empSession.ClockIn))
                        {
                            LogHelper.Write($"  ⚠️ Should be: ABSENT (no clock in)");
                        }
                        else if (string.IsNullOrEmpty(empSession.ClockOut))
                        {
                            LogHelper.Write($"  ⚠️ Should be: MISSED CLOCK-OUT (clocked in but no clock out)");
                        }
                        else
                        {
                            LogHelper.Write($"  ✓ Complete attendance");
                        }
                    }
                }
                else
                {
                    LogHelper.Write($"✗ No attendance session found");
                    if (empSchedule.EmployeeId != null)
                    {
                        LogHelper.Write($"  ⚠️ Should be: ABSENT (scheduled but no attendance)");
                    }
                }
                
                // Check fingerprint enrollment
                var enrollments = _dataService.GetAllEnrollments();
                var hasFingerprint = enrollments.Any(e => e.EmployeeId == employeeId);
                LogHelper.Write($"Fingerprint enrolled: {(hasFingerprint ? "YES" : "NO")}");
                
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error checking {employeeName}: {ex.Message}");
            }
        }

        private void TestAbsentMarkingLogic()
        {
            LogHelper.Write("🧪 TESTING ABSENT MARKING LOGIC");
            LogHelper.Write("────────────────────────────────");
            
            try
            {
                LogHelper.Write("Running MarkAbsentEmployees()...");
                var result = _dataService.MarkAbsentEmployees();
                LogHelper.Write($"Result: {result.markedAbsent} marked absent, {result.markedMissedClockout} marked missed clock-out");
                
                // Check sessions again after marking
                LogHelper.Write("");
                LogHelper.Write("Attendance sessions after marking:");
                var sessions = _dataService.GetTodaySessions();
                foreach (var session in sessions)
                {
                    var clockInStr = string.IsNullOrEmpty(session.ClockIn) ? "NULL" : session.ClockIn;
                    var clockOutStr = string.IsNullOrEmpty(session.ClockOut) ? "NULL" : session.ClockOut;
                    LogHelper.Write($"  • {session.EmployeeId}: In={clockInStr}, Out={clockOutStr}, Status={session.Status}");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Error testing absent marking: {ex.Message}");
            }
        }
    }
}
