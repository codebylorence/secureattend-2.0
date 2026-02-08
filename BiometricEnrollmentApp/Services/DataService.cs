using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace BiometricEnrollmentApp.Services
{
    public class DataService
    {
        private readonly string _dbPath;
        private readonly string _connString;

        public DataService()
        {
            _dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
            _connString = $"Data Source={_dbPath}";
            InitializeDatabase();
        }

        private void InitializeDatabase()
        {
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS Enrollments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL UNIQUE,
                    name TEXT,
                    department TEXT,
                    fingerprint_template TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now'))
                );
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS Attendances (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    name TEXT,
                    department TEXT,
                    method TEXT,
                    note TEXT,
                    recorded_at TEXT NOT NULL
                );
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS AttendanceSessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    clock_in TEXT NOT NULL,
                    clock_out TEXT,
                    total_hours REAL,
                    status TEXT NOT NULL
                );
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE INDEX IF NOT EXISTS idx_attendances_employee_date ON Attendances(employee_id, recorded_at);
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE INDEX IF NOT EXISTS idx_sessions_emp_date ON AttendanceSessions(employee_id, date);
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS EmployeeSchedules (
                    id INTEGER PRIMARY KEY,
                    employee_id TEXT NOT NULL,
                    template_id INTEGER NOT NULL,
                    shift_name TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    days TEXT NOT NULL,
                    schedule_dates TEXT,
                    department TEXT,
                    assigned_by TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    synced_at TEXT DEFAULT (datetime('now'))
                );
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE INDEX IF NOT EXISTS idx_schedules_employee ON EmployeeSchedules(employee_id);
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS SyncQueue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    attendance_session_id INTEGER NOT NULL,
                    sync_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    last_attempt TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    status TEXT DEFAULT 'pending'
                );
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = @"
                CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON SyncQueue(status);
            ";
            cmd.ExecuteNonQuery();

            LogHelper.Write($"📂 Database initialized at {_dbPath}");
        }

        // -----------------------
        // Enrollments
        // -----------------------

        /// <summary>
        /// Save enrollment and return the row id for this enrollment (or -1 on failure).
        /// </summary>
        public long SaveEnrollment(string employeeId, string templateBase64, string? name = null, string? department = null)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO Enrollments (employee_id, name, department, fingerprint_template)
                    VALUES ($id, $name, $dept, $tmpl)
                    ON CONFLICT(employee_id)
                    DO UPDATE SET 
                        name = excluded.name,
                        department = excluded.department,
                        fingerprint_template = excluded.fingerprint_template;
                ";
                cmd.Parameters.AddWithValue("$id", employeeId);
                cmd.Parameters.AddWithValue("$name", name ?? string.Empty);
                cmd.Parameters.AddWithValue("$dept", department ?? string.Empty);
                cmd.Parameters.AddWithValue("$tmpl", templateBase64);
                cmd.ExecuteNonQuery();

                // fetch row id (works even after INSERT or ON CONFLICT UPDATE)
                using var cmd2 = conn.CreateCommand();
                cmd2.CommandText = "SELECT id FROM Enrollments WHERE employee_id = $id LIMIT 1;";
                cmd2.Parameters.AddWithValue("$id", employeeId);
                var obj = cmd2.ExecuteScalar();
                long id = -1;
                if (obj != null && obj != DBNull.Value)
                {
                    if (obj is long l) id = l;
                    else if (obj is int i) id = i;
                    else if (long.TryParse(obj.ToString(), out var p)) id = p;
                }

                LogHelper.Write($"✅ Enrollment saved/updated for {employeeId} (row id {id})");
                return id;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error saving enrollment: {ex.Message}");
                return -1;
            }
        }

        /// <summary>
        /// Return all enrollments: employeeId, name, department, template
        /// </summary>
        public List<(string EmployeeId, string Name, string Department, string Template)> GetAllEnrollments()
        {
            var list = new List<(string, string, string, string)>();
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT employee_id, name, department, fingerprint_template FROM Enrollments";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var emp = reader.IsDBNull(0) ? string.Empty : reader.GetString(0);
                var name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
                var dept = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                var tmpl = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
                list.Add((emp, name, dept, tmpl));
            }

            return list;
        }

        /// <summary>
        /// Return all enrollments including DB row id (RowId, EmployeeId, Name, Department, Template)
        /// </summary>
        public List<(long RowId, string EmployeeId, string Name, string Department, string Template)> GetAllEnrollmentsWithRowId()
        {
            var list = new List<(long, string, string, string, string)>();
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, employee_id, name, department, fingerprint_template FROM Enrollments";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                long id = reader.IsDBNull(0) ? -1 : reader.GetInt64(0);
                string emp = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
                string name = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                string dept = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
                string tmpl = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                list.Add((id, emp, name, dept, tmpl));
            }

            return list;
        }

        /// <summary>
        /// Helper: get enrollment row id from employeeId.
        /// </summary>
        public long GetEnrollmentRowId(string employeeId)
        {
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id FROM Enrollments WHERE employee_id = $id;";
            cmd.Parameters.AddWithValue("$id", employeeId);
            var obj = cmd.ExecuteScalar();
            if (obj == null || obj == DBNull.Value) return -1;
            if (obj is long l) return l;
            if (obj is int i) return i;
            if (long.TryParse(obj.ToString(), out var parsed)) return parsed;
            return -1;
        }

        /// <summary>
        /// Map a stored enrollment row id back to the employee_id.
        /// </summary>
        public string? GetEmployeeIdByRowId(long rowId)
        {
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT employee_id FROM Enrollments WHERE id = $id LIMIT 1;";
            cmd.Parameters.AddWithValue("$id", rowId);
            var obj = cmd.ExecuteScalar();
            if (obj == null || obj == DBNull.Value) return null;
            return obj.ToString();
        }

        public void DeleteEnrollment(string employeeId)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "DELETE FROM Enrollments WHERE employee_id = $id";
                cmd.Parameters.AddWithValue("$id", employeeId);
                int rows = cmd.ExecuteNonQuery();

                LogHelper.Write(rows > 0
                    ? $"🗑️ Deleted enrollment for {employeeId}"
                    : $"⚠️ No enrollment found for {employeeId}");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error deleting enrollment for {employeeId}: {ex.Message}");
            }
        }

        // -----------------------
        // Legacy Attendances (simple log)
        // -----------------------
        public void SaveAttendance(string employeeId, string? name = null, string? department = null, string method = "fingerprint", string? note = null, DateTime? recordedAt = null)
        {
            try
            {
                var philippinesTime = recordedAt ?? TimezoneHelper.Now;
                var ts = TimezoneHelper.FormatForDatabase(philippinesTime);
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO Attendances (employee_id, name, department, method, note, recorded_at)
                    VALUES ($id, $name, $dept, $method, $note, $recorded_at);
                ";
                cmd.Parameters.AddWithValue("$id", employeeId);
                cmd.Parameters.AddWithValue("$name", name ?? string.Empty);
                cmd.Parameters.AddWithValue("$dept", department ?? string.Empty);
                cmd.Parameters.AddWithValue("$method", method ?? "fingerprint");
                cmd.Parameters.AddWithValue("$note", note ?? string.Empty);
                cmd.Parameters.AddWithValue("$recorded_at", ts);

                cmd.ExecuteNonQuery();

                LogHelper.Write($"✅ Attendance recorded: {employeeId} ({method}) at {ts} (Philippines time)");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Failed to save attendance for {employeeId}: {ex.Message}");
            }
        }

        public List<(long Id, string EmployeeId, string Name, string Department, string Method, string Note, string RecordedAt)> GetTodayAttendances()
        {
            var list = new List<(long, string, string, string, string, string, string)>();
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            var today = TimezoneHelper.Today;
            var start = today;
            var end = today.AddDays(1).AddSeconds(-1);

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, employee_id, name, department, method, note, recorded_at
                FROM Attendances
                WHERE recorded_at BETWEEN $from AND $to
                ORDER BY recorded_at DESC;
            ";
            cmd.Parameters.AddWithValue("$from", start.ToString("yyyy-MM-dd HH:mm:ss"));
            cmd.Parameters.AddWithValue("$to", end.ToString("yyyy-MM-dd HH:mm:ss"));

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                long id = reader.IsDBNull(0) ? 0 : reader.GetInt64(0);
                string emp = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
                string name = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                string dept = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
                string method = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                string note = reader.IsDBNull(5) ? string.Empty : reader.GetString(5);
                string recorded = reader.IsDBNull(6) ? string.Empty : reader.GetString(6);

                list.Add((id, emp, name, dept, method, note, recorded));
            }

            return list;
        }

        // -----------------------
        // Attendance Sessions
        // -----------------------
        public long SaveClockIn(string employeeId, DateTime clockInLocal, string? status = "IN")
        {
            try
            {
                // Determine the correct date for the attendance session
                // For overnight shifts, use the shift start date, not the current date
                var attendanceDate = DetermineAttendanceDate(employeeId, clockInLocal);
                var ts = clockInLocal.ToString("yyyy-MM-dd HH:mm:ss");

                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO AttendanceSessions (employee_id, date, clock_in, status)
                    VALUES ($id, $date, $clock_in, $status);
                ";
                cmd.Parameters.AddWithValue("$id", employeeId);
                cmd.Parameters.AddWithValue("$date", attendanceDate);
                cmd.Parameters.AddWithValue("$clock_in", ts);
                cmd.Parameters.AddWithValue("$status", status ?? "IN");

                cmd.ExecuteNonQuery();

                // read last_insert_rowid safely
                using var cmd2 = conn.CreateCommand();
                cmd2.CommandText = "SELECT last_insert_rowid();";
                var obj = cmd2.ExecuteScalar();
                long id = 0;
                if (obj != null && obj != DBNull.Value)
                {
                    if (obj is long l) id = l;
                    else if (obj is int i) id = i;
                    else if (Int64.TryParse(obj.ToString(), out var parsed)) id = parsed;
                }

                LogHelper.Write($"🕘 Clock-in saved for {employeeId} (session {id}) at {ts} with date {attendanceDate}");
                return id;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 SaveClockIn failed for {employeeId}: {ex.Message}");
                return -1;
            }
        }

        /// <summary>
        /// Determine the correct date for attendance session
        /// For overnight shifts, use the shift start date, not the current date
        /// </summary>
        private string DetermineAttendanceDate(string employeeId, DateTime clockInTime)
        {
            try
            {
                // Check if employee is scheduled today (this now includes overnight shift logic)
                var scheduleCheck = IsEmployeeScheduledToday(employeeId);
                
                if (!scheduleCheck.IsScheduled)
                {
                    // No schedule found, use current date
                    LogHelper.Write($"📅 No schedule found for {employeeId}, using current date: {clockInTime:yyyy-MM-dd}");
                    return clockInTime.ToString("yyyy-MM-dd");
                }
                
                // Check if this is an overnight shift
                if (IsOvernightShift(scheduleCheck.StartTime, scheduleCheck.EndTime))
                {
                    // For overnight shifts, if we're clocking in after midnight (early morning hours)
                    // and the shift started yesterday, use yesterday's date
                    if (clockInTime.Hour >= 0 && clockInTime.Hour < 12) // Early morning hours
                    {
                        var yesterday = clockInTime.AddDays(-1);
                        var yesterdayDayOfWeek = yesterday.DayOfWeek.ToString();
                        
                        // Check if the employee was scheduled yesterday
                        using var conn = new SqliteConnection($"Data Source={_dbPath}");
                        conn.Open();
                        
                        using var cmd = conn.CreateCommand();
                        cmd.CommandText = @"
                            SELECT COUNT(1)
                            FROM EmployeeSchedules
                            WHERE employee_id = $emp_id AND days LIKE '%' || $yesterday || '%'
                        ";
                        cmd.Parameters.AddWithValue("$emp_id", employeeId);
                        cmd.Parameters.AddWithValue("$yesterday", yesterdayDayOfWeek);
                        
                        var count = Convert.ToInt32(cmd.ExecuteScalar());
                        
                        if (count > 0)
                        {
                            // Employee was scheduled yesterday and this is an overnight shift
                            // Use yesterday's date for the attendance session
                            var attendanceDate = yesterday.ToString("yyyy-MM-dd");
                            LogHelper.Write($"🌙 Overnight shift detected for {employeeId}, using shift start date: {attendanceDate}");
                            return attendanceDate;
                        }
                    }
                }
                
                // Default: use current date
                var currentDate = clockInTime.ToString("yyyy-MM-dd");
                LogHelper.Write($"📅 Using current date for {employeeId}: {currentDate}");
                return currentDate;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error determining attendance date for {employeeId}: {ex.Message}");
                // Fallback to current date
                return clockInTime.ToString("yyyy-MM-dd");
            }
        }

        public double SaveClockOut(long sessionId, DateTime clockOutLocal)
        {
            try
            {
                var tsOut = clockOutLocal.ToString("yyyy-MM-dd HH:mm:ss");

                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT clock_in FROM AttendanceSessions WHERE id = $id";
                cmd.Parameters.AddWithValue("$id", sessionId);
                var clockInObj = cmd.ExecuteScalar();
                if (clockInObj == null || clockInObj == DBNull.Value)
                {
                    LogHelper.Write($"⚠️ Session {sessionId} not found for clock-out.");
                    return -1;
                }

                var clockInStr = clockInObj.ToString();
                if (!DateTime.TryParse(clockInStr, out var clockInLocal))
                {
                    LogHelper.Write($"⚠️ Invalid clock_in value in DB for session {sessionId}: {clockInStr}");
                    return -1;
                }

                var total = (clockOutLocal - clockInLocal).TotalHours;
                if (total < 0) total = 0;

                // Get current status to preserve it (Present or Late)
                cmd.CommandText = "SELECT status FROM AttendanceSessions WHERE id = $id";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$id", sessionId);
                var currentStatus = cmd.ExecuteScalar()?.ToString() ?? "Present";

                cmd.CommandText = @"
                    UPDATE AttendanceSessions
                    SET clock_out = $clock_out, total_hours = $total_hours
                    WHERE id = $id;
                ";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$clock_out", tsOut);
                cmd.Parameters.AddWithValue("$total_hours", total);
                cmd.Parameters.AddWithValue("$id", sessionId);

                int rows = cmd.ExecuteNonQuery();

                LogHelper.Write(rows > 0
                    ? $"🕙 Clock-out saved for session {sessionId} at {tsOut} (hours={total:F2})"
                    : $"⚠️ Failed to update session {sessionId} on clock-out.");

                return total;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 SaveClockOut failed for session {sessionId}: {ex.Message}");
                return -1;
            }
        }

        /// <summary>
        /// <summary>
        /// Check if clock-out is allowed based on shift end time
        /// Returns true if clock-out is within allowed time (before shift end + grace period)
        /// </summary>
        public bool IsClockOutAllowed(string employeeId, DateTime clockOutTime, out string shiftEndTime, out string message)
        {
            shiftEndTime = "";
            message = "";
            
            try
            {
                // Get employee's schedule for today
                var scheduleCheck = IsEmployeeScheduledToday(employeeId);
                
                if (!scheduleCheck.IsScheduled)
                {
                    // No schedule found - allow clock-out
                    message = "No schedule found - clock-out allowed";
                    return true;
                }
                
                shiftEndTime = scheduleCheck.EndTime;
                
                // Parse shift end time
                if (!TimeSpan.TryParse(scheduleCheck.EndTime, out var endTime))
                {
                    LogHelper.Write($"⚠️ Invalid shift end time format: {scheduleCheck.EndTime}");
                    message = "Invalid shift end time - clock-out allowed";
                    return true;
                }
                
                // Get current time
                var currentTime = clockOutTime.TimeOfDay;
                
                // Get grace period from settings
                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                var gracePeriodMinutes = settingsService.GetClockOutGracePeriodMinutes();
                var endTimeWithGrace = endTime.Add(TimeSpan.FromMinutes(gracePeriodMinutes));
                
                // Handle overnight shifts
                if (IsOvernightShift(scheduleCheck.StartTime, scheduleCheck.EndTime))
                {
                    // For overnight shifts, the end time is on the next day
                    // If current time is before noon, we're in the "next day" portion
                    if (currentTime.Hours < 12)
                    {
                        // Current time is in the morning (after midnight)
                        // Check if it's before the shift end time + grace period
                        if (currentTime <= endTimeWithGrace)
                        {
                            message = "Clock-out allowed (within overnight shift window)";
                            return true;
                        }
                        else
                        {
                            message = $"Clock-out not allowed. Shift ended at {scheduleCheck.EndTime} (grace period: {gracePeriodMinutes} min)";
                            return false;
                        }
                    }
                    else
                    {
                        // Current time is in the afternoon/evening (same day as shift start)
                        // Always allow clock-out during the first day of overnight shift
                        message = "Clock-out allowed (overnight shift - first day)";
                        return true;
                    }
                }
                else
                {
                    // Regular shift (not overnight)
                    // Check if current time is before shift end + grace period
                    if (currentTime <= endTimeWithGrace)
                    {
                        message = "Clock-out allowed (within shift window)";
                        return true;
                    }
                    else
                    {
                        message = $"Clock-out not allowed. Shift ended at {scheduleCheck.EndTime} (grace period: {gracePeriodMinutes} min)";
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking clock-out permission: {ex.Message}");
                message = "Error checking schedule - clock-out allowed";
                return true; // Allow clock-out on error to avoid blocking employees
            }
        }

        /// <summary>
        /// Save clock-out with missed clock-out status checking and shift end time validation
        /// </summary>
        public double SaveClockOut(long sessionId, string employeeId, DateTime clockOutLocal)
        {
            try
            {
                // Check if clock-out is allowed based on shift end time
                if (!IsClockOutAllowed(employeeId, clockOutLocal, out string shiftEndTime, out string message))
                {
                    LogHelper.Write($"🚫 Clock-out denied for {employeeId}: {message}");
                    return -2; // Special return value to indicate clock-out not allowed
                }
                
                LogHelper.Write($"✅ Clock-out allowed for {employeeId}: {message}");
                
                var tsOut = clockOutLocal.ToString("yyyy-MM-dd HH:mm:ss");

                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT clock_in FROM AttendanceSessions WHERE id = $id";
                cmd.Parameters.AddWithValue("$id", sessionId);
                var clockInObj = cmd.ExecuteScalar();
                if (clockInObj == null || clockInObj == DBNull.Value)
                {
                    LogHelper.Write($"⚠️ Session {sessionId} not found for clock-out.");
                    return -1;
                }

                var clockInStr = clockInObj.ToString();
                if (!DateTime.TryParse(clockInStr, out var clockInLocal))
                {
                    LogHelper.Write($"⚠️ Invalid clock_in value in DB for session {sessionId}: {clockInStr}");
                    return -1;
                }

                var total = (clockOutLocal - clockInLocal).TotalHours;
                if (total < 0) total = 0;

                // Get current status to preserve it (Present or Late)
                cmd.CommandText = "SELECT status FROM AttendanceSessions WHERE id = $id";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$id", sessionId);
                var currentStatus = cmd.ExecuteScalar()?.ToString() ?? "Present";

                // Check if this should be marked as "Missed Clock-out"
                bool isMissedClockout = ShouldMarkAsMissedClockout(employeeId, clockOutLocal);
                string finalStatus = currentStatus;
                
                if (isMissedClockout)
                {
                    finalStatus = "Missed Clock-out";
                    LogHelper.Write($"⚠️ Marking session {sessionId} as 'Missed Clock-out' for employee {employeeId}");
                }

                cmd.CommandText = @"
                    UPDATE AttendanceSessions
                    SET clock_out = $clock_out, total_hours = $total_hours, status = $status
                    WHERE id = $id;
                ";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$clock_out", tsOut);
                cmd.Parameters.AddWithValue("$total_hours", total);
                cmd.Parameters.AddWithValue("$status", finalStatus);
                cmd.Parameters.AddWithValue("$id", sessionId);

                int rows = cmd.ExecuteNonQuery();

                LogHelper.Write(rows > 0
                    ? $"🕙 Clock-out saved for session {sessionId} at {tsOut} (hours={total:F2}, status={finalStatus})"
                    : $"⚠️ Failed to update session {sessionId} on clock-out.");

                return total;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 SaveClockOut failed for session {sessionId}: {ex.Message}");
                return -1;
            }
        }

        public long GetOpenSessionId(string employeeId, DateTime localDate)
        {
            var date = localDate.ToString("yyyy-MM-dd");
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            // First, check for open sessions on the current date
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id FROM AttendanceSessions
                WHERE employee_id = $id AND date = $date AND clock_out IS NULL
                ORDER BY id DESC LIMIT 1;
            ";
            cmd.Parameters.AddWithValue("$id", employeeId);
            cmd.Parameters.AddWithValue("$date", date);

            var obj = cmd.ExecuteScalar();
            if (obj != null && obj != DBNull.Value)
            {
                if (obj is long l) return l;
                if (obj is int i) return i;
                if (Int64.TryParse(obj.ToString(), out var parsed)) return parsed;
            }

            // If no open session found for today, check yesterday for overnight shifts
            // This handles cases where an employee clocked in yesterday for an overnight shift
            // and is now trying to clock out after midnight
            if (localDate.Hour >= 0 && localDate.Hour < 12) // Early morning hours
            {
                var yesterday = localDate.AddDays(-1).ToString("yyyy-MM-dd");
                LogHelper.Write($"🌙 Checking yesterday ({yesterday}) for open overnight shift sessions for {employeeId}");
                
                cmd.CommandText = @"
                    SELECT id FROM AttendanceSessions
                    WHERE employee_id = $id AND date = $yesterday AND clock_out IS NULL
                    ORDER BY id DESC LIMIT 1;
                ";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$id", employeeId);
                cmd.Parameters.AddWithValue("$yesterday", yesterday);

                var obj2 = cmd.ExecuteScalar();
                if (obj2 != null && obj2 != DBNull.Value)
                {
                    if (obj2 is long l2) 
                    {
                        LogHelper.Write($"🌙 Found open overnight session {l2} from {yesterday} for {employeeId}");
                        return l2;
                    }
                    if (obj2 is int i2) 
                    {
                        LogHelper.Write($"🌙 Found open overnight session {i2} from {yesterday} for {employeeId}");
                        return i2;
                    }
                    if (Int64.TryParse(obj2.ToString(), out var parsed2)) 
                    {
                        LogHelper.Write($"🌙 Found open overnight session {parsed2} from {yesterday} for {employeeId}");
                        return parsed2;
                    }
                }
            }

            return -1;
        }

        public List<(long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, double TotalHours, string Status)> GetTodaySessions()
        {
            var list = new List<(long, string, string, string, string, double, string)>();
            var now = TimezoneHelper.Now;
            var date = now.ToString("yyyy-MM-dd");

            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, employee_id, date, clock_in, IFNULL(clock_out,''), IFNULL(total_hours,0), status
                FROM AttendanceSessions
                WHERE date = $date
                ORDER BY clock_in DESC;
            ";
            cmd.Parameters.AddWithValue("$date", date);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                long id = reader.IsDBNull(0) ? 0 : reader.GetInt64(0);
                string emp = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
                string dt = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                string cin = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
                string cout = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                double hrs = reader.IsDBNull(5) ? 0.0 : reader.GetDouble(5);
                string status = reader.IsDBNull(6) ? string.Empty : reader.GetString(6);

                list.Add((id, emp, dt, cin, cout, hrs, status));
            }

            return list;
        }

        public List<(long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, double TotalHours, string Status)> GetSessionsByDateRange(DateTime fromDate, DateTime toDate)
        {
            var list = new List<(long, string, string, string, string, double, string)>();
            var fromDateStr = fromDate.ToString("yyyy-MM-dd");
            var toDateStr = toDate.ToString("yyyy-MM-dd");

            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, employee_id, date, clock_in, IFNULL(clock_out,''), IFNULL(total_hours,0), status
                FROM AttendanceSessions
                WHERE date >= $fromDate AND date <= $toDate
                ORDER BY date DESC, clock_in DESC;
            ";
            cmd.Parameters.AddWithValue("$fromDate", fromDateStr);
            cmd.Parameters.AddWithValue("$toDate", toDateStr);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                long id = reader.IsDBNull(0) ? 0 : reader.GetInt64(0);
                string emp = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
                string dt = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                string cin = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
                string cout = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                double hrs = reader.IsDBNull(5) ? 0.0 : reader.GetDouble(5);
                string status = reader.IsDBNull(6) ? string.Empty : reader.GetString(6);

                list.Add((id, emp, dt, cin, cout, hrs, status));
            }

            return list;
        }

        public bool HasCompletedSessionForDate(string employeeId, DateTime localDate)
        {
            var date = localDate.ToString("yyyy-MM-dd");
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
        SELECT COUNT(1) FROM AttendanceSessions
        WHERE employee_id = $id AND date = $date
          AND (clock_out IS NOT NULL AND clock_out <> '' OR status = 'COMPLETED');
    ";
            cmd.Parameters.AddWithValue("$id", employeeId);
            cmd.Parameters.AddWithValue("$date", date);

            var obj = cmd.ExecuteScalar();
            if (obj == null || obj == DBNull.Value) return false;
            try
            {
                var count = Convert.ToInt32(obj);
                return count > 0;
            }
            catch
            {
                return false;
            }
        }

        public int DeleteOldAttendances(int retentionDays = 365)
        {
            try
            {
                var cutoffTime = TimezoneHelper.Now.AddDays(-retentionDays);
                var cutoff = TimezoneHelper.FormatForDatabase(cutoffTime);
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "DELETE FROM Attendances WHERE recorded_at < $cutoff";
                cmd.Parameters.AddWithValue("$cutoff", cutoff);

                int rows = cmd.ExecuteNonQuery();
                LogHelper.Write($"🗑️ Deleted {rows} attendance records older than {retentionDays} days (Philippines time).");
                return rows;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error deleting old attendances: {ex.Message}");
                return 0;
            }
        }

        // -----------------------
        // Employee Schedules
        // -----------------------

        public int UpdateSchedules(List<BiometricEnrollmentApp.Services.EmployeeSchedule> schedules)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var transaction = conn.BeginTransaction();
                
                // Clear existing schedules
                using (var clearCmd = conn.CreateCommand())
                {
                    clearCmd.CommandText = "DELETE FROM EmployeeSchedules";
                    clearCmd.ExecuteNonQuery();
                }

                int count = 0;
                foreach (var schedule in schedules)
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        INSERT INTO EmployeeSchedules 
                        (id, employee_id, template_id, shift_name, start_time, end_time, days, schedule_dates, department, assigned_by, created_at, updated_at)
                        VALUES ($id, $emp_id, $tmpl_id, $shift, $start, $end, $days, $dates, $dept, $assigned, $created, $updated)
                    ";
                    
                    cmd.Parameters.AddWithValue("$id", schedule.Id);
                    cmd.Parameters.AddWithValue("$emp_id", schedule.Employee_Id ?? "");
                    cmd.Parameters.AddWithValue("$tmpl_id", schedule.Template_Id);
                    cmd.Parameters.AddWithValue("$shift", schedule.Shift_Name ?? "");
                    cmd.Parameters.AddWithValue("$start", schedule.Start_Time ?? "");
                    cmd.Parameters.AddWithValue("$end", schedule.End_Time ?? "");
                    
                    // Handle both old Days format and new Specific_Date format
                    string daysValue = "";
                    if (schedule.Days != null && schedule.Days.Count > 0)
                    {
                        daysValue = string.Join(",", schedule.Days);
                    }
                    else if (!string.IsNullOrEmpty(schedule.Specific_Date))
                    {
                        // Convert specific date to day of week for backward compatibility
                        if (DateTime.TryParse(schedule.Specific_Date, out var specificDate))
                        {
                            daysValue = specificDate.DayOfWeek.ToString();
                            LogHelper.Write($"📅 Converted specific date {schedule.Specific_Date} to day: {daysValue}");
                        }
                    }
                    cmd.Parameters.AddWithValue("$days", daysValue);
                    
                    // Handle both old Schedule_Dates and new Specific_Date
                    string scheduleDatesValue = "";
                    if (schedule.Schedule_Dates != null)
                    {
                        scheduleDatesValue = System.Text.Json.JsonSerializer.Serialize(schedule.Schedule_Dates);
                    }
                    else if (!string.IsNullOrEmpty(schedule.Specific_Date))
                    {
                        // Create a schedule_dates structure for backward compatibility
                        var scheduleDates = new Dictionary<string, List<string>>();
                        if (DateTime.TryParse(schedule.Specific_Date, out var specificDate))
                        {
                            var dayOfWeek = specificDate.DayOfWeek.ToString();
                            scheduleDates[dayOfWeek] = new List<string> { schedule.Specific_Date };
                            scheduleDatesValue = System.Text.Json.JsonSerializer.Serialize(scheduleDates);
                            LogHelper.Write($"📅 Created schedule_dates for {schedule.Specific_Date}: {scheduleDatesValue}");
                        }
                    }
                    cmd.Parameters.AddWithValue("$dates", scheduleDatesValue);
                    
                    cmd.Parameters.AddWithValue("$dept", schedule.Department ?? "");
                    cmd.Parameters.AddWithValue("$assigned", schedule.Assigned_By ?? "");
                    cmd.Parameters.AddWithValue("$created", schedule.Created_At?.ToString("yyyy-MM-dd HH:mm:ss") ?? "");
                    cmd.Parameters.AddWithValue("$updated", schedule.Updated_At?.ToString("yyyy-MM-dd HH:mm:ss") ?? "");
                    
                    cmd.ExecuteNonQuery();
                    count++;
                }

                transaction.Commit();
                LogHelper.Write($"✅ Updated {count} employee schedule(s) in local database (new biometric API format)");
                return count;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error updating schedules: {ex.Message}");
                return 0;
            }
        }

        public List<(string EmployeeId, string ShiftName, string StartTime, string EndTime, string Days)> GetTodaysSchedules()
        {
            var result = new List<(string, string, string, string, string)>();
            try
            {
                var today = TimezoneHelper.Now.DayOfWeek.ToString();
                LogHelper.Write($"📅 Getting schedules for {today}");
                
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                // First, log all schedules in database
                using (var allCmd = conn.CreateCommand())
                {
                    allCmd.CommandText = "SELECT COUNT(*) FROM EmployeeSchedules";
                    var totalCount = Convert.ToInt32(allCmd.ExecuteScalar());
                    LogHelper.Write($"📊 Total schedules in database: {totalCount}");
                }

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT employee_id, shift_name, start_time, end_time, days
                    FROM EmployeeSchedules
                    WHERE days LIKE '%' || $today || '%'
                ";
                cmd.Parameters.AddWithValue("$today", today);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var empId = reader.GetString(0);
                    var shift = reader.GetString(1);
                    var start = reader.GetString(2);
                    var end = reader.GetString(3);
                    var days = reader.GetString(4);
                    
                    LogHelper.Write($"  ✓ Found schedule: {empId} - {shift} ({start} - {end}) on {days}");
                    result.Add((empId, shift, start, end, days));
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting today's schedules: {ex.Message}");
            }
            return result;
        }

        public (bool IsScheduled, string ShiftName, string StartTime, string EndTime) IsEmployeeScheduledToday(string employeeId)
        {
            try
            {
                var now = TimezoneHelper.Now;
                var today = now.DayOfWeek.ToString();
                var yesterday = now.AddDays(-1).DayOfWeek.ToString();
                
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                // First, check for schedules on the current day
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT shift_name, start_time, end_time
                    FROM EmployeeSchedules
                    WHERE employee_id = $emp_id AND days LIKE '%' || $today || '%'
                    ORDER BY id DESC
                    LIMIT 1
                ";
                cmd.Parameters.AddWithValue("$emp_id", employeeId);
                cmd.Parameters.AddWithValue("$today", today);

                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    var shiftName = reader.GetString(0);
                    var startTime = reader.GetString(1);
                    var endTime = reader.GetString(2);
                    LogHelper.Write($"📅 Found schedule for {employeeId} on {today}: {shiftName} ({startTime} - {endTime})");
                    return (true, shiftName, startTime, endTime);
                }
                reader.Close();

                // If no schedule found for today, check yesterday for overnight shifts
                // This handles cases where it's past midnight and the shift started yesterday
                if (now.Hour >= 0 && now.Hour < 12) // Check overnight shifts only in early hours (00:00-11:59)
                {
                    LogHelper.Write($"🌙 Checking yesterday ({yesterday}) for overnight shifts for {employeeId}");
                    
                    cmd.CommandText = @"
                        SELECT shift_name, start_time, end_time
                        FROM EmployeeSchedules
                        WHERE employee_id = $emp_id AND days LIKE '%' || $yesterday || '%'
                        ORDER BY id DESC
                        LIMIT 1
                    ";
                    cmd.Parameters.Clear();
                    cmd.Parameters.AddWithValue("$emp_id", employeeId);
                    cmd.Parameters.AddWithValue("$yesterday", yesterday);

                    using var reader2 = cmd.ExecuteReader();
                    if (reader2.Read())
                    {
                        var shiftName = reader2.GetString(0);
                        var startTime = reader2.GetString(1);
                        var endTime = reader2.GetString(2);
                        
                        // Check if this is actually an overnight shift
                        if (IsOvernightShift(startTime, endTime))
                        {
                            // Verify that the current time is within the shift window
                            var currentTime = TimezoneHelper.FormatTimeDisplayShort(now);
                            if (IsCurrentTimeWithinOvernightShift(startTime, endTime, currentTime))
                            {
                                LogHelper.Write($"🌙 Found overnight shift for {employeeId} from {yesterday}: {shiftName} ({startTime} - {endTime})");
                                return (true, shiftName, startTime, endTime);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking schedule for {employeeId}: {ex.Message}");
            }
            return (false, "", "", "");
        }

        public bool HasOvertimeAssignment(string employeeId)
        {
            try
            {
                var today = TimezoneHelper.Now.ToString("yyyy-MM-dd");
                
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT COUNT(*) 
                    FROM AttendanceSessions 
                    WHERE employee_id = $emp_id 
                    AND date = $today 
                    AND status = 'Overtime'
                ";
                cmd.Parameters.AddWithValue("$emp_id", employeeId);
                cmd.Parameters.AddWithValue("$today", today);

                var count = Convert.ToInt32(cmd.ExecuteScalar());
                
                if (count > 0)
                {
                    LogHelper.Write($"⏰ Employee {employeeId} has overtime assignment for {today}");
                    return true;
                }
                
                return false;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking overtime assignment for {employeeId}: {ex.Message}");
                return false;
            }
        }

        public long CreateOvertimeAssignment(string employeeId, string reason = "Overtime Work")
        {
            try
            {
                var today = TimezoneHelper.Now.ToString("yyyy-MM-dd");
                
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                // Check if overtime assignment already exists
                using var checkCmd = conn.CreateCommand();
                checkCmd.CommandText = @"
                    SELECT COUNT(*) 
                    FROM AttendanceSessions 
                    WHERE employee_id = $emp_id 
                    AND date = $today 
                    AND status = 'Overtime'
                ";
                checkCmd.Parameters.AddWithValue("$emp_id", employeeId);
                checkCmd.Parameters.AddWithValue("$today", today);

                var existingCount = Convert.ToInt32(checkCmd.ExecuteScalar());
                if (existingCount > 0)
                {
                    LogHelper.Write($"⚠️ Overtime assignment already exists for {employeeId} on {today}");
                    return -1;
                }

                // Create overtime assignment
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO AttendanceSessions (employee_id, date, clock_in, clock_out, total_hours, status)
                    VALUES ($emp_id, $date, NULL, NULL, NULL, 'Overtime')
                ";
                cmd.Parameters.AddWithValue("$emp_id", employeeId);
                cmd.Parameters.AddWithValue("$date", today);

                cmd.ExecuteNonQuery();
                
                // Get the last inserted row ID
                cmd.CommandText = "SELECT last_insert_rowid()";
                var sessionId = Convert.ToInt64(cmd.ExecuteScalar());
                LogHelper.Write($"✅ Created overtime assignment for {employeeId} (Session ID: {sessionId})");
                
                return sessionId;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error creating overtime assignment for {employeeId}: {ex.Message}");
                return -1;
            }
        }

        public (bool IsWithinShiftTime, string Message) IsWithinShiftTimeWindow(string shiftStartTime, string shiftEndTime)
        {
            try
            {
                var now = TimezoneHelper.Now;
                
                // Parse shift start time
                var startParts = shiftStartTime.Split(':');
                if (startParts.Length < 2) return (true, ""); // If can't parse, allow
                
                int startHour = int.Parse(startParts[0]);
                int startMinute = int.Parse(startParts[1]);
                
                // Parse shift end time
                var endParts = shiftEndTime.Split(':');
                if (endParts.Length < 2) return (true, "");
                
                int endHour = int.Parse(endParts[0]);
                int endMinute = int.Parse(endParts[1]);
                
                // Create shift start and end times for today
                var shiftStart = new DateTime(now.Year, now.Month, now.Day, startHour, startMinute, 0);
                var shiftEnd = new DateTime(now.Year, now.Month, now.Day, endHour, endMinute, 0);
                
                // Handle overnight shifts (end time is next day)
                if (shiftEnd <= shiftStart)
                {
                    shiftEnd = shiftEnd.AddDays(1);
                }
                
                // Get grace periods from settings
                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                int clockInGracePeriod = settingsService.GetClockInGracePeriodMinutes();
                int clockOutGracePeriod = settingsService.GetClockOutGracePeriodMinutes();
                
                // Allow clock-in X minutes before shift start (early arrival grace period)
                var earlyClockInWindow = shiftStart.AddMinutes(-clockInGracePeriod);
                
                // Check if current time is too early (more than grace period minutes before shift)
                if (now < earlyClockInWindow)
                {
                    var minutesUntilWindow = (earlyClockInWindow - now).TotalMinutes;
                    return (false, $"Too early. Clock in starts at {earlyClockInWindow:HH:mm}. Wait {minutesUntilWindow:F0} min.");
                }
                
                // Allow clock-in up to X minutes after shift end (late clock-in grace period)
                var lateClockInWindow = shiftEnd.AddMinutes(clockOutGracePeriod);
                
                // Check if current time is too late (more than grace period minutes after shift end)
                if (now > lateClockInWindow)
                {
                    return (false, $"Too late to clock in. Shift ended at {shiftEndTime} with {clockOutGracePeriod}-minute grace period until {lateClockInWindow:HH:mm}.");
                }
                
                return (true, "");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking shift time window: {ex.Message}");
                return (true, ""); // If error, allow attendance
            }
        }

        // -----------------------
        // Toolbox Meeting Methods
        // -----------------------
        
        /// <summary>
        /// Get toolbox meeting time range for an employee's shift
        /// </summary>
        public (string ToolboxStart, string ToolboxEnd, string ShiftStart, string ShiftEnd) GetToolboxMeetingTimes(string employeeId)
        {
            try
            {
                var scheduleCheck = IsEmployeeScheduledToday(employeeId);
                
                if (!scheduleCheck.IsScheduled)
                {
                    return ("", "", "", "");
                }
                
                // Get toolbox meeting duration from config (default 60 minutes)
                int toolboxMinutes = GetToolboxMeetingMinutes();
                
                // Parse shift start time
                var timeParts = scheduleCheck.StartTime.Split(':');
                if (timeParts.Length < 2) return ("", "", scheduleCheck.StartTime, scheduleCheck.EndTime);
                
                int shiftHour = int.Parse(timeParts[0]);
                int shiftMinute = int.Parse(timeParts[1]);
                
                // Calculate toolbox meeting start time (X minutes before shift)
                var shiftStart = new DateTime(2000, 1, 1, shiftHour, shiftMinute, 0);
                var toolboxStart = shiftStart.AddMinutes(-toolboxMinutes);
                
                string toolboxStartStr = toolboxStart.ToString("HH:mm:ss");
                string toolboxEndStr = scheduleCheck.StartTime + ":00";
                
                LogHelper.Write($"📋 Toolbox meeting for {employeeId}: {toolboxStartStr} - {toolboxEndStr} (Shift: {scheduleCheck.StartTime} - {scheduleCheck.EndTime})");
                
                return (toolboxStartStr, toolboxEndStr, scheduleCheck.StartTime, scheduleCheck.EndTime);
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting toolbox meeting times: {ex.Message}");
                return ("", "", "", "");
            }
        }
        
        /// <summary>
        /// Get toolbox meeting duration from system config
        /// </summary>
        private int GetToolboxMeetingMinutes()
        {
            try
            {
                string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "config", "system-config.json");
                if (File.Exists(configPath))
                {
                    string json = File.ReadAllText(configPath);
                    var config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                    
                    if (config != null && config.ContainsKey("toolboxMeetingMinutes"))
                    {
                        if (config["toolboxMeetingMinutes"] is System.Text.Json.JsonElement element && element.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            return element.GetInt32();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error reading toolbox meeting config: {ex.Message}");
            }
            
            // Default to 60 minutes
            return 60;
        }
        
        /// <summary>
        /// Check if current time is within toolbox meeting period
        /// </summary>
        public bool IsWithinToolboxMeetingPeriod(string employeeId, DateTime currentTime)
        {
            try
            {
                var toolboxTimes = GetToolboxMeetingTimes(employeeId);
                
                if (string.IsNullOrEmpty(toolboxTimes.ToolboxStart) || string.IsNullOrEmpty(toolboxTimes.ToolboxEnd))
                {
                    return false;
                }
                
                // Parse toolbox meeting times
                var toolboxStartParts = toolboxTimes.ToolboxStart.Split(':');
                var toolboxEndParts = toolboxTimes.ToolboxEnd.Split(':');
                
                if (toolboxStartParts.Length < 2 || toolboxEndParts.Length < 2) return false;
                
                int toolboxStartHour = int.Parse(toolboxStartParts[0]);
                int toolboxStartMinute = int.Parse(toolboxStartParts[1]);
                int toolboxEndHour = int.Parse(toolboxEndParts[0]);
                int toolboxEndMinute = int.Parse(toolboxEndParts[1]);
                
                var toolboxStart = new DateTime(currentTime.Year, currentTime.Month, currentTime.Day, toolboxStartHour, toolboxStartMinute, 0);
                var toolboxEnd = new DateTime(currentTime.Year, currentTime.Month, currentTime.Day, toolboxEndHour, toolboxEndMinute, 0);
                
                bool isWithinPeriod = currentTime >= toolboxStart && currentTime <= toolboxEnd;
                
                if (isWithinPeriod)
                {
                    LogHelper.Write($"📋 {employeeId} is within toolbox meeting period: {toolboxTimes.ToolboxStart} - {toolboxTimes.ToolboxEnd}");
                }
                
                return isWithinPeriod;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking toolbox meeting period: {ex.Message}");
                return false;
            }
        }

        public string DetermineAttendanceStatus(DateTime clockInTime, string shiftStartTime)
        {
            try
            {
                // Parse shift start time (format: "08:00" or "08:00:00")
                var timeParts = shiftStartTime.Split(':');
                if (timeParts.Length < 2) return "Present";
                
                int shiftHour = int.Parse(timeParts[0]);
                int shiftMinute = int.Parse(timeParts[1]);
                
                var shiftStart = new DateTime(clockInTime.Year, clockInTime.Month, clockInTime.Day, shiftHour, shiftMinute, 0);
                
                // Calculate minutes difference (positive = late, negative = early)
                var minutesDifference = (clockInTime - shiftStart).TotalMinutes;
                
                // Get grace period from settings
                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                int gracePeriod = settingsService.GetClockInGracePeriodMinutes();
                
                // Get toolbox meeting duration
                int toolboxMinutes = GetToolboxMeetingMinutes();
                
                LogHelper.Write($"📊 Clock-in analysis: {minutesDifference:F1} minutes from shift start (Grace period: ±{gracePeriod} min, Toolbox: {toolboxMinutes} min before)");
                
                // If within grace period (before or after shift start), mark as Present
                if (Math.Abs(minutesDifference) <= gracePeriod)
                {
                    if (minutesDifference <= 0)
                    {
                        LogHelper.Write($"✅ Early clock-in within grace period ({minutesDifference:F1} min) - Status: Present");
                    }
                    else
                    {
                        LogHelper.Write($"✅ Late clock-in within grace period ({minutesDifference:F1} min) - Status: Present");
                    }
                    return "Present";
                }
                
                // If beyond grace period and late, mark as Late
                if (minutesDifference > gracePeriod)
                {
                    LogHelper.Write($"⏰ Beyond grace period ({minutesDifference:F1} > {gracePeriod} min) - Status: Late");
                    return "Late";
                }
                
                // If early but within toolbox meeting period, mark as Present
                if (minutesDifference < -gracePeriod && Math.Abs(minutesDifference) <= toolboxMinutes)
                {
                    LogHelper.Write($"📋 Toolbox meeting clock-in ({minutesDifference:F1} min before shift) - Status: Present");
                    return "Present";
                }
                
                // If too early (before toolbox meeting period), still mark as Present but log it
                LogHelper.Write($"⏰ Very early clock-in ({minutesDifference:F1} min before shift, outside toolbox period) - Status: Present");
                return "Present";
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error determining status: {ex.Message}");
                return "Present";
            }
        }

        /// <summary>
        /// Determine if a clock-out should be marked as "Missed Clock-out" based on shift end time
        /// </summary>
        public bool ShouldMarkAsMissedClockout(string employeeId, DateTime clockOutTime)
        {
            try
            {
                var scheduleCheck = IsEmployeeScheduledToday(employeeId);
                
                if (!scheduleCheck.IsScheduled)
                {
                    LogHelper.Write($"📅 No schedule found for {employeeId}, allowing normal clock-out");
                    return false;
                }
                
                // Parse shift end time
                var timeParts = scheduleCheck.EndTime.Split(':');
                if (timeParts.Length < 2) return false;
                
                int shiftHour = int.Parse(timeParts[0]);
                int shiftMinute = int.Parse(timeParts[1]);
                
                var shiftEnd = new DateTime(clockOutTime.Year, clockOutTime.Month, clockOutTime.Day, shiftHour, shiftMinute, 0);
                
                // Handle overnight shifts (end time is next day)
                if (IsOvernightShift(scheduleCheck.StartTime, scheduleCheck.EndTime))
                {
                    // For overnight shifts, if we're clocking out in early morning hours
                    // and the shift end time is also in early morning, use today's date
                    if (clockOutTime.Hour >= 0 && clockOutTime.Hour < 12 && shiftHour >= 0 && shiftHour < 12)
                    {
                        // Both clock-out and shift end are in morning hours - use same day
                        shiftEnd = new DateTime(clockOutTime.Year, clockOutTime.Month, clockOutTime.Day, shiftHour, shiftMinute, 0);
                    }
                    else if (clockOutTime.Hour >= 0 && clockOutTime.Hour < 12)
                    {
                        // Clock-out is in morning but shift end is in evening - shift ended yesterday
                        shiftEnd = shiftEnd.AddDays(-1);
                    }
                    else
                    {
                        // Clock-out is in evening/afternoon - shift ends tomorrow
                        shiftEnd = shiftEnd.AddDays(1);
                    }
                }
                
                // Get grace period from settings
                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                int gracePeriod = settingsService.GetClockOutGracePeriodMinutes();
                
                // Calculate minutes after shift end (positive = late clock-out)
                var minutesAfterShiftEnd = (clockOutTime - shiftEnd).TotalMinutes;
                
                LogHelper.Write($"🕐 Clock-out analysis for {employeeId}: {minutesAfterShiftEnd:F1} minutes after shift end (Grace period: {gracePeriod} min)");
                
                // If clocking out more than grace period after shift end, mark as "Missed Clock-out"
                if (minutesAfterShiftEnd > gracePeriod)
                {
                    LogHelper.Write($"⚠️ {employeeId} clocking out {minutesAfterShiftEnd:F1} minutes after shift end - Status: Missed Clock-out");
                    return true;
                }
                
                LogHelper.Write($"✅ {employeeId} clocking out within grace period - Status: Normal");
                return false;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking missed clock-out for {employeeId}: {ex.Message}");
                return false; // Default to normal clock-out if error
            }
        }

        /// <summary>
        /// Mark employees as absent if ALL conditions are met:
        /// 1. Employee has enrolled fingerprints
        /// 2. Employee's shift has started
        /// 3. Employee's shift has ended + grace period (30 minutes)
        /// 4. Employee has not clocked in today
        /// Also marks employees as "Missed Clock-out" if they clocked in but didn't clock out after shift ended
        /// This should be called periodically (e.g., every minute)
        /// </summary>
        public (int markedAbsent, int markedMissedClockout) MarkAbsentEmployees()
        {
            try
            {
                var now = TimezoneHelper.Now;
                var today = now.ToString("yyyy-MM-dd");
                var dayOfWeek = now.DayOfWeek.ToString();
                var currentTime = TimezoneHelper.FormatTimeDisplayShort(now);
                
                LogHelper.Write($"🔍 ========== ABSENT & MISSED CLOCK-OUT CHECK ==========");
                LogHelper.Write($"🔍 Current time: {now:yyyy-MM-dd HH:mm:ss} ({dayOfWeek}) - Philippines time");
                
                // Get all schedules for today
                var schedulesToday = GetTodaysSchedules();
                
                LogHelper.Write($"👥 Found {schedulesToday.Count} employees scheduled for {dayOfWeek}");
                
                if (schedulesToday.Count == 0)
                {
                    LogHelper.Write("⚠️ No employees scheduled for today!");
                    LogHelper.Write("💡 Possible reasons:");
                    LogHelper.Write("   1. No schedules synced from server");
                    LogHelper.Write("   2. No employees assigned to work on " + dayOfWeek);
                    LogHelper.Write("   3. Schedules not published in admin panel");
                    return (0, 0);
                }
                
                // Get all enrolled employees (those with fingerprints)
                var enrolledEmployees = GetAllEnrollments().Select(e => e.EmployeeId).ToHashSet();
                LogHelper.Write($"👆 Found {enrolledEmployees.Count} employees with enrolled fingerprints");
                
                int markedAbsent = 0;
                int markedMissedClockout = 0;
                
                foreach (var schedule in schedulesToday)
                {
                    LogHelper.Write($"  📋 Checking {schedule.EmployeeId}: Shift {schedule.ShiftName} ({schedule.StartTime} - {schedule.EndTime})");
                    
                    // Check if employee has enrolled fingerprints
                    if (!enrolledEmployees.Contains(schedule.EmployeeId))
                    {
                        LogHelper.Write($"  ⚠️ {schedule.EmployeeId} - No enrolled fingerprints, skipping");
                        continue;
                    }
                    
                    // Detect if this is an overnight shift
                    bool isOvernightShift = IsOvernightShift(schedule.StartTime, schedule.EndTime);
                    LogHelper.Write($"  🌙 {schedule.EmployeeId} - Overnight shift: {isOvernightShift}");
                    
                    // FIRST: Check if shift has started (must start before we can mark absent)
                    if (!HasShiftStarted(schedule.StartTime))
                    {
                        LogHelper.Write($"  ⏰ {schedule.EmployeeId} - Shift hasn't started yet ({schedule.StartTime})");
                        continue;
                    }
                    
                    // SECOND: Check if shift has ended with grace period
                    var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                    int clockOutGracePeriod = settingsService.GetClockOutGracePeriodMinutes();
                    
                    bool shiftEnded = HasShiftEndedWithGracePeriod(schedule.EndTime, clockOutGracePeriod);
                    
                    if (!shiftEnded)
                    {
                        LogHelper.Write($"  ⏳ {schedule.EmployeeId} - Shift not ended yet or within grace period ({schedule.EndTime} + {clockOutGracePeriod} min)");
                        continue;
                    }
                    
                    // Check if employee has attendance session today
                    var sessions = GetTodaySessions();
                    var employeeSession = sessions.FirstOrDefault(s => s.EmployeeId == schedule.EmployeeId);
                    
                    if (employeeSession.EmployeeId == null)
                    {
                        // No attendance session - mark as absent
                        using var conn = new SqliteConnection(_connString);
                        conn.Open();
                        
                        // Check if absent record already exists
                        using var checkCmd = conn.CreateCommand();
                        checkCmd.CommandText = @"
                            SELECT COUNT(1) FROM AttendanceSessions 
                            WHERE employee_id = $id AND date = $date AND status = 'Absent'
                        ";
                        checkCmd.Parameters.AddWithValue("$id", schedule.EmployeeId);
                        checkCmd.Parameters.AddWithValue("$date", today);
                        
                        var exists = Convert.ToInt32(checkCmd.ExecuteScalar()) > 0;
                        
                        if (!exists)
                        {
                            // Create absent record with NULL values for clock_in and clock_out
                            using var insertCmd = conn.CreateCommand();
                            insertCmd.CommandText = @"
                                INSERT INTO AttendanceSessions (employee_id, date, clock_in, clock_out, total_hours, status)
                                VALUES ($id, $date, NULL, NULL, 0, 'Absent')
                            ";
                            insertCmd.Parameters.AddWithValue("$id", schedule.EmployeeId);
                            insertCmd.Parameters.AddWithValue("$date", today);
                            insertCmd.ExecuteNonQuery();
                            
                            markedAbsent++;
                            LogHelper.Write($"  ❌ {schedule.EmployeeId} - Marked as Absent (shift: {schedule.StartTime}-{schedule.EndTime})");
                        }
                        else
                        {
                            LogHelper.Write($"  ℹ️ {schedule.EmployeeId} - Already marked absent");
                        }
                    }
                    else
                    {
                        // Has attendance session - check if needs to be marked as missed clock-out
                        if (employeeSession.Status == "Absent")
                        {
                            LogHelper.Write($"  ℹ️ {schedule.EmployeeId} - Already marked absent");
                        }
                        else if (employeeSession.Status == "Missed Clock-out")
                        {
                            LogHelper.Write($"  ℹ️ {schedule.EmployeeId} - Already marked as missed clock-out");
                        }
                        else if (!string.IsNullOrEmpty(employeeSession.ClockIn) && string.IsNullOrEmpty(employeeSession.ClockOut))
                        {
                            // Clocked in but didn't clock out, and shift has ended - mark as missed clock-out
                            MarkSessionAsMissedClockout(employeeSession.Id, schedule.EndTime);
                            markedMissedClockout++;
                            LogHelper.Write($"  🕐 {schedule.EmployeeId} - Marked as Missed Clock-out (clocked in at {employeeSession.ClockIn}, shift ended at {schedule.EndTime})");
                        }
                        else if (!string.IsNullOrEmpty(employeeSession.ClockOut))
                        {
                            LogHelper.Write($"  ✅ {schedule.EmployeeId} - Has complete attendance ({employeeSession.Status})");
                        }
                        else
                        {
                            LogHelper.Write($"  ✓ {schedule.EmployeeId} - Has attendance, not marking");
                        }
                    }
                }
                
                LogHelper.Write($"✅ Check complete: {markedAbsent} marked absent, {markedMissedClockout} marked missed clock-out");
                LogHelper.Write($"🔍 ========== END ABSENT & MISSED CLOCK-OUT CHECK ==========");
                return (markedAbsent, markedMissedClockout);
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in MarkAbsentEmployees: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                return (0, 0);
            }
        }
        
        /// <summary>
        /// Check if shift end time has passed
        /// Supports both 24-hour format (HH:MM) and 12-hour format (HH:MM AM/PM)
        /// Handles shifts that cross midnight and very short shifts
        /// </summary>
        private bool HasShiftEnded(string endTime)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(endTime))
                {
                    LogHelper.Write($"⚠️ HasShiftEnded: endTime is null or empty");
                    return false;
                }

                int hours, minutes;
                
                // Check if it's 12-hour format with AM/PM
                var parts = endTime.Split(' ');
                if (parts.Length == 2)
                {
                    // 12-hour format: "05:00 PM"
                    var timeParts = parts[0].Split(':');
                    if (timeParts.Length != 2) 
                    {
                        LogHelper.Write($"⚠️ HasShiftEnded: Invalid time format: {endTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                    var period = parts[1].ToUpper();
                    
                    // Convert to 24-hour format
                    if (period == "PM" && hours != 12)
                        hours += 12;
                    else if (period == "AM" && hours == 12)
                        hours = 0;
                }
                else
                {
                    // 24-hour format: "17:00" or "02:54"
                    var timeParts = endTime.Split(':');
                    if (timeParts.Length < 2)
                    {
                        LogHelper.Write($"⚠️ HasShiftEnded: Invalid time format: {endTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                }
                
                // Create DateTime objects for comparison
                var now = TimezoneHelper.Now;
                var today = now.Date;
                var shiftEndTime = today.AddHours(hours).AddMinutes(minutes);
                
                // If shift end time is in the past (earlier today), it has ended
                bool ended = now >= shiftEndTime;
                
                // Add 1 minute grace period to ensure the shift has fully ended
                // This prevents marking absent exactly at the end time
                if (ended && (now - shiftEndTime).TotalMinutes < 1)
                {
                    ended = false;
                    LogHelper.Write($"  ⏳ Within 1-minute grace period of shift end");
                }
                
                LogHelper.Write($"  🕐 Shift end: {endTime} ({shiftEndTime:HH:mm}), Current: {now:HH:mm}, Ended: {ended}");
                
                return ended;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 HasShiftEnded error for '{endTime}': {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Check if shift start time has passed
        /// This ensures we only mark absent employees whose shift has actually started
        /// Handles overnight shifts properly
        /// </summary>
        private bool HasShiftStarted(string startTime)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(startTime))
                {
                    LogHelper.Write($"⚠️ HasShiftStarted: startTime is null or empty");
                    return false;
                }

                int hours, minutes;
                
                // Check if it's 12-hour format with AM/PM
                var parts = startTime.Split(' ');
                if (parts.Length == 2)
                {
                    // 12-hour format: "08:00 AM"
                    var timeParts = parts[0].Split(':');
                    if (timeParts.Length != 2) 
                    {
                        LogHelper.Write($"⚠️ HasShiftStarted: Invalid time format: {startTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                    var period = parts[1].ToUpper();
                    
                    // Convert to 24-hour format
                    if (period == "PM" && hours != 12)
                        hours += 12;
                    else if (period == "AM" && hours == 12)
                        hours = 0;
                }
                else
                {
                    // 24-hour format: "08:00"
                    var timeParts = startTime.Split(':');
                    if (timeParts.Length < 2)
                    {
                        LogHelper.Write($"⚠️ HasShiftStarted: Invalid time format: {startTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                }
                
                // Create DateTime objects for comparison
                var now = TimezoneHelper.Now;
                var today = now.Date;
                var shiftStartTime = today.AddHours(hours).AddMinutes(minutes);
                
                // For overnight shifts, if the start time is in the future but we're past midnight,
                // the shift might have started yesterday
                if (shiftStartTime > now && now.Hour < 6) // Before 6 AM
                {
                    // Check if shift started yesterday
                    var yesterdayShiftStart = shiftStartTime.AddDays(-1);
                    if (now >= yesterdayShiftStart)
                    {
                        shiftStartTime = yesterdayShiftStart;
                        LogHelper.Write($"  🌙 Overnight shift - start time was yesterday: {shiftStartTime:yyyy-MM-dd HH:mm}");
                    }
                }
                
                // Check if current time is past the shift start time
                bool started = now >= shiftStartTime;
                
                LogHelper.Write($"  🕐 Shift start: {startTime} ({shiftStartTime:yyyy-MM-dd HH:mm}), Current: {now:yyyy-MM-dd HH:mm}, Started: {started}");
                
                return started;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 HasShiftStarted error for '{startTime}': {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Check if the current time is within an overnight shift window
        /// For example: shift 23:00-01:00, current time 00:30 should return true
        /// </summary>
        private bool IsCurrentTimeWithinOvernightShift(string startTime, string endTime, string currentTime)
        {
            try
            {
                var startHour = ParseTimeToHour(startTime);
                var startMinute = ParseTimeToMinute(startTime);
                var endHour = ParseTimeToHour(endTime);
                var endMinute = ParseTimeToMinute(endTime);
                var currentHour = ParseTimeToHour(currentTime);
                var currentMinute = ParseTimeToMinute(currentTime);
                
                if (startHour == -1 || endHour == -1 || currentHour == -1) return false;
                
                // Convert times to minutes since midnight for easier comparison
                var startMinutes = startHour * 60 + startMinute;
                var endMinutes = endHour * 60 + endMinute;
                var currentMinutes = currentHour * 60 + currentMinute;
                
                // For overnight shifts, end time is next day
                if (endMinutes <= startMinutes)
                {
                    // Overnight shift: check if current time is after start OR before end
                    // Example: 23:00-01:00, current 00:30
                    // startMinutes = 1380 (23*60), endMinutes = 60 (1*60), currentMinutes = 30 (0*60+30)
                    // Since currentMinutes (30) < endMinutes (60), employee is within shift
                    bool withinShift = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
                    LogHelper.Write($"🌙 Overnight shift check: {startTime}-{endTime}, current {currentTime} -> within: {withinShift}");
                    return withinShift;
                }
                else
                {
                    // Regular shift: check if current time is between start and end
                    bool withinShift = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
                    LogHelper.Write($"☀️ Regular shift check: {startTime}-{endTime}, current {currentTime} -> within: {withinShift}");
                    return withinShift;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 IsCurrentTimeWithinOvernightShift error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Parse time string to minute component
        /// </summary>
        private int ParseTimeToMinute(string timeStr)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(timeStr)) return 0;
                
                var parts = timeStr.Split(' ');
                string timePart = parts[0]; // Get time part (ignore AM/PM for minute parsing)
                
                var timeParts = timePart.Split(':');
                if (timeParts.Length < 2) return 0;
                
                return int.Parse(timeParts[1]);
            }
            catch
            {
                return 0;
            }
        }

        /// <summary>
        /// Determines if a shift is an overnight shift by comparing start and end times
        /// </summary>
        private bool IsOvernightShift(string startTime, string endTime)
        {
            try
            {
                var startHour = ParseTimeToHour(startTime);
                var endHour = ParseTimeToHour(endTime);
                
                if (startHour == -1 || endHour == -1) return false;
                
                // If end time is earlier than start time, it's an overnight shift
                // Example: 16:00 (4 PM) to 00:00 (12 AM) = overnight
                return endHour < startHour || (endHour == 0 && startHour > 0);
            }
            catch
            {
                return false;
            }
        }
        
        /// <summary>
        /// Parse time string to hour (24-hour format)
        /// </summary>
        private int ParseTimeToHour(string timeStr)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(timeStr)) return -1;
                
                int hours;
                var parts = timeStr.Split(' ');
                
                if (parts.Length == 2)
                {
                    // 12-hour format: "05:00 PM"
                    var timeParts = parts[0].Split(':');
                    if (timeParts.Length != 2) return -1;
                    
                    hours = int.Parse(timeParts[0]);
                    var period = parts[1].ToUpper();
                    
                    // Convert to 24-hour format
                    if (period == "PM" && hours != 12)
                        hours += 12;
                    else if (period == "AM" && hours == 12)
                        hours = 0;
                }
                else
                {
                    // 24-hour format: "17:00"
                    var timeParts = timeStr.Split(':');
                    if (timeParts.Length < 2) return -1;
                    hours = int.Parse(timeParts[0]);
                }
                
                return hours;
            }
            catch
            {
                return -1;
            }
        }

        /// <summary>
        /// Check if shift end time has passed with a grace period for absent marking
        /// This prevents marking employees absent too early and handles overnight shifts properly
        /// </summary>
        private bool HasShiftEndedWithGracePeriod(string endTime, int gracePeriodMinutes)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(endTime))
                {
                    LogHelper.Write($"⚠️ HasShiftEndedWithGracePeriod: endTime is null or empty");
                    return false;
                }

                int hours, minutes;
                
                // Check if it's 12-hour format with AM/PM
                var parts = endTime.Split(' ');
                if (parts.Length == 2)
                {
                    // 12-hour format: "05:00 PM"
                    var timeParts = parts[0].Split(':');
                    if (timeParts.Length != 2) 
                    {
                        LogHelper.Write($"⚠️ HasShiftEndedWithGracePeriod: Invalid time format: {endTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                    var period = parts[1].ToUpper();
                    
                    // Convert to 24-hour format
                    if (period == "PM" && hours != 12)
                        hours += 12;
                    else if (period == "AM" && hours == 12)
                        hours = 0;
                }
                else
                {
                    // 24-hour format: "17:00" or "02:54"
                    var timeParts = endTime.Split(':');
                    if (timeParts.Length < 2)
                    {
                        LogHelper.Write($"⚠️ HasShiftEndedWithGracePeriod: Invalid time format: {endTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                }
                
                // Create DateTime objects for comparison
                var now = TimezoneHelper.Now;
                var today = now.Date;
                var shiftEndTime = today.AddHours(hours).AddMinutes(minutes);
                
                // CRITICAL: For early morning shifts (00:00-06:00), we need to determine if they're
                // ending today or if they started yesterday and are ending today
                // The key is: if current time is BEFORE the shift end time (same day), shift hasn't ended yet
                if (hours >= 0 && hours < 6)
                {
                    // If we're currently in early morning (00:00-06:00) and shift ends in early morning
                    if (now.Hour >= 0 && now.Hour < 6)
                    {
                        // Both current time and shift end are in early morning
                        // Simple comparison: if now < shiftEndTime, shift hasn't ended
                        if (now < shiftEndTime)
                        {
                            LogHelper.Write($"  🌅 Early morning shift still active - ends at {shiftEndTime:HH:mm}, now is {now:HH:mm}");
                            return false;
                        }
                        else
                        {
                            LogHelper.Write($"  🌅 Early morning shift ended at {shiftEndTime:HH:mm}, now is {now:HH:mm}");
                        }
                    }
                    // If we're in afternoon/evening (after 12 PM) and shift ends in early morning
                    // The shift ends tomorrow
                    else if (now.Hour >= 12)
                    {
                        shiftEndTime = shiftEndTime.AddDays(1);
                        LogHelper.Write($"  🌙 Overnight shift detected - ends tomorrow at {shiftEndTime:yyyy-MM-dd HH:mm}");
                    }
                    // If we're in late morning (06:00-12:00) and shift ends in early morning
                    // The shift already ended earlier today
                    else
                    {
                        LogHelper.Write($"  🌅 Early morning shift already ended at {shiftEndTime:HH:mm}");
                    }
                }
                
                // Add grace period to shift end time
                var shiftEndWithGrace = shiftEndTime.AddMinutes(gracePeriodMinutes);
                
                // Check if current time is past the shift end + grace period
                bool ended = now >= shiftEndWithGrace;
                
                LogHelper.Write($"  🕐 Shift end: {endTime} ({shiftEndTime:yyyy-MM-dd HH:mm}), Grace end: {shiftEndWithGrace:yyyy-MM-dd HH:mm}, Current: {now:yyyy-MM-dd HH:mm}, Ended: {ended}");
                
                return ended;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 HasShiftEndedWithGracePeriod error for '{endTime}': {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Add attendance sync to queue for retry mechanism
        /// </summary>
        public void AddToSyncQueue(string employeeId, long attendanceSessionId, string syncType, string payload)
        {
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();
                
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO SyncQueue (employee_id, attendance_session_id, sync_type, payload)
                    VALUES ($employeeId, $sessionId, $syncType, $payload)
                ";
                cmd.Parameters.AddWithValue("$employeeId", employeeId);
                cmd.Parameters.AddWithValue("$sessionId", attendanceSessionId);
                cmd.Parameters.AddWithValue("$syncType", syncType);
                cmd.Parameters.AddWithValue("$payload", payload);
                
                cmd.ExecuteNonQuery();
                LogHelper.Write($"📝 Added {syncType} sync to queue for {employeeId}");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Failed to add sync to queue: {ex.Message}");
            }
        }

        /// <summary>
        /// Get pending sync items from queue
        /// </summary>
        public List<SyncQueueItem> GetPendingSyncItems()
        {
            var items = new List<SyncQueueItem>();
            
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();
                
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT id, employee_id, attendance_session_id, sync_type, payload, retry_count, last_attempt
                    FROM SyncQueue 
                    WHERE status = 'pending' AND retry_count < 5
                    ORDER BY created_at ASC
                ";
                
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    items.Add(new SyncQueueItem
                    {
                        Id = reader.GetInt64(0),
                        EmployeeId = reader.GetString(1),
                        AttendanceSessionId = reader.GetInt64(2),
                        SyncType = reader.GetString(3),
                        Payload = reader.GetString(4),
                        RetryCount = reader.GetInt32(5),
                        LastAttempt = reader.IsDBNull(6) ? null : reader.GetString(6)
                    });
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Failed to get pending sync items: {ex.Message}");
            }
            
            return items;
        }

        /// <summary>
        /// Mark sync item as completed
        /// </summary>
        public void MarkSyncCompleted(long syncId)
        {
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();
                
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    UPDATE SyncQueue 
                    SET status = 'completed', last_attempt = datetime('now')
                    WHERE id = $id
                ";
                cmd.Parameters.AddWithValue("$id", syncId);
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Failed to mark sync completed: {ex.Message}");
            }
        }

        /// <summary>
        /// Mark sync item as failed and increment retry count
        /// </summary>
        public void MarkSyncFailed(long syncId)
        {
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();
                
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    UPDATE SyncQueue 
                    SET retry_count = retry_count + 1, last_attempt = datetime('now'),
                        status = CASE WHEN retry_count >= 4 THEN 'failed' ELSE 'pending' END
                    WHERE id = $id
                ";
                cmd.Parameters.AddWithValue("$id", syncId);
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Failed to mark sync failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Diagnostic method to check attendance records and sync queue for a specific employee
        /// </summary>
        public void DiagnoseEmployeeAttendance(string employeeId)
        {
            try
            {
                LogHelper.Write($"🔍 DIAGNOSTIC: Checking attendance data for employee {employeeId}");
                
                using var conn = new SqliteConnection(_connString);
                conn.Open();
                
                // Check AttendanceSessions
                using var cmd1 = conn.CreateCommand();
                cmd1.CommandText = "SELECT * FROM AttendanceSessions WHERE employee_id = @empId ORDER BY date DESC, clock_in DESC LIMIT 10";
                cmd1.Parameters.AddWithValue("@empId", employeeId);
                
                LogHelper.Write($"📊 Recent AttendanceSessions for {employeeId}:");
                using var reader1 = cmd1.ExecuteReader();
                int sessionCount = 0;
                while (reader1.Read())
                {
                    sessionCount++;
                    var id = reader1.GetInt64(0);
                    var date = reader1.GetString(2);
                    var clockIn = reader1.GetString(3);
                    var clockOut = reader1.IsDBNull(4) ? "NULL" : reader1.GetString(4);
                    var status = reader1.GetString(6);
                    
                    LogHelper.Write($"  Session {id}: {date} | In: {clockIn} | Out: {clockOut} | Status: {status}");
                }
                
                if (sessionCount == 0)
                {
                    LogHelper.Write($"  ❌ No AttendanceSessions found for {employeeId}");
                }
                reader1.Close();
                
                // Check SyncQueue
                using var cmd2 = conn.CreateCommand();
                cmd2.CommandText = "SELECT * FROM SyncQueue WHERE employee_id = @empId ORDER BY created_at DESC LIMIT 10";
                cmd2.Parameters.AddWithValue("@empId", employeeId);
                
                LogHelper.Write($"🔄 SyncQueue entries for {employeeId}:");
                using var reader2 = cmd2.ExecuteReader();
                int queueCount = 0;
                while (reader2.Read())
                {
                    queueCount++;
                    var id = reader2.GetInt64(0);
                    var sessionId = reader2.GetInt64(2);
                    var syncType = reader2.GetString(3);
                    var retryCount = reader2.GetInt32(5);
                    var status = reader2.GetString(8);
                    var lastAttempt = reader2.IsDBNull(6) ? "NULL" : reader2.GetString(6);
                    
                    LogHelper.Write($"  Queue {id}: Session {sessionId} | Type: {syncType} | Retries: {retryCount} | Status: {status} | Last: {lastAttempt}");
                }
                
                if (queueCount == 0)
                {
                    LogHelper.Write($"  ✅ No SyncQueue entries for {employeeId}");
                }
                reader2.Close();
                
                // Check Attendances (legacy table)
                using var cmd3 = conn.CreateCommand();
                cmd3.CommandText = "SELECT * FROM Attendances WHERE employee_id = @empId ORDER BY recorded_at DESC LIMIT 5";
                cmd3.Parameters.AddWithValue("@empId", employeeId);
                
                LogHelper.Write($"📝 Recent Attendances (legacy) for {employeeId}:");
                using var reader3 = cmd3.ExecuteReader();
                int attendanceCount = 0;
                while (reader3.Read())
                {
                    attendanceCount++;
                    var id = reader3.GetInt64(0);
                    var recordedAt = reader3.GetString(5);
                    var method = reader3.IsDBNull(4) ? "NULL" : reader3.GetString(4);
                    
                    LogHelper.Write($"  Attendance {id}: {recordedAt} | Method: {method}");
                }
                
                if (attendanceCount == 0)
                {
                    LogHelper.Write($"  ✅ No legacy Attendances for {employeeId}");
                }
                reader3.Close();
                
                // Check if employee has fingerprint enrollment
                using var cmd4 = conn.CreateCommand();
                cmd4.CommandText = "SELECT employee_id, name, department FROM Enrollments WHERE employee_id = @empId";
                cmd4.Parameters.AddWithValue("@empId", employeeId);
                
                using var reader4 = cmd4.ExecuteReader();
                if (reader4.Read())
                {
                    var name = reader4.IsDBNull(1) ? "NULL" : reader4.GetString(1);
                    var dept = reader4.IsDBNull(2) ? "NULL" : reader4.GetString(2);
                    LogHelper.Write($"👤 Enrollment found: {employeeId} | Name: {name} | Dept: {dept}");
                }
                else
                {
                    LogHelper.Write($"❌ No fingerprint enrollment found for {employeeId}");
                }
                reader4.Close();
                
                LogHelper.Write($"🔍 DIAGNOSTIC COMPLETE for {employeeId}");
                
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Diagnostic failed for {employeeId}: {ex.Message}");
            }
        }

        /// <summary>
        /// Mark absent employees and handle missed clock-outs for past dates
        /// This runs when the biometric app starts to catch any missed absences
        /// </summary>
        /// <param name="daysToCheck">Number of days to check back (default 7 for startup, 2 for periodic checks)</param>
        public (int markedAbsent, int markedMissedClockout) MarkAbsentAndMissedClockouts(int daysToCheck = 2)
        {
            int totalAbsent = 0;
            int totalMissedClockout = 0;

            try
            {
                var now = TimezoneHelper.Now;
                
                LogHelper.Write($"🔍 ========== BIOMETRIC APP ABSENT MARKING ==========");
                LogHelper.Write($"📅 Checking last {daysToCheck} day(s) for missed absences and clock-outs");

                // Check the specified number of days back
                for (int daysAgo = daysToCheck - 1; daysAgo >= 0; daysAgo--)
                {
                    var dateToCheck = now.AddDays(-daysAgo).ToString("yyyy-MM-dd");
                    var result = MarkAbsentForDate(dateToCheck);
                    totalAbsent += result.markedAbsent;
                    totalMissedClockout += result.markedMissedClockout;
                }

                LogHelper.Write($"📊 Overall summary (last {daysToCheck} day(s)):");
                LogHelper.Write($"   Total marked absent: {totalAbsent}");
                LogHelper.Write($"   Total marked missed clock-out: {totalMissedClockout}");
                LogHelper.Write($"🔍 ========== END BIOMETRIC APP ABSENT MARKING ==========");

                return (totalAbsent, totalMissedClockout);
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 MarkAbsentAndMissedClockouts error: {ex.Message}");
                return (0, 0);
            }
        }

        /// <summary>
        /// Mark absent employees for a specific date
        /// </summary>
        private (int markedAbsent, int markedMissedClockout) MarkAbsentForDate(string targetDate)
        {
            int markedAbsent = 0;
            int markedMissedClockout = 0;

            try
            {
                var now = TimezoneHelper.Now;
                var today = now.ToString("yyyy-MM-dd");
                var isToday = targetDate == today;

                LogHelper.Write($"\n📅 Processing date: {targetDate}");

                // Get all schedules for this date
                var schedules = GetSchedulesForDate(targetDate);
                LogHelper.Write($"📋 Found {schedules.Count} schedules for {targetDate}");

                foreach (var schedule in schedules)
                {
                    var employeeId = schedule.EmployeeId;
                    var shiftName = schedule.ShiftName;
                    var startTime = schedule.StartTime;
                    var endTime = schedule.EndTime;

                    LogHelper.Write($"  👤 Checking {employeeId} - {shiftName} ({startTime}-{endTime})");

                    // For today, check if shift has started
                    if (isToday && !HasShiftStarted(startTime))
                    {
                        LogHelper.Write($"    ⏰ Shift hasn't started yet");
                        continue;
                    }

                    // Check if employee has attendance session for this date
                    var existingSession = GetSessionForEmployeeAndDate(employeeId, targetDate);

                    // Check if shift has ended (with grace period)
                    var shouldProcessShiftEnd = !isToday || HasShiftEndedWithGracePeriod(endTime, 60);

                    if (existingSession == null)
                    {
                        // No attendance session - mark as absent if shift has ended
                        if (shouldProcessShiftEnd)
                        {
                            CreateAbsentSession(employeeId, targetDate, startTime);
                            markedAbsent++;
                            LogHelper.Write($"    ❌ Marked as Absent");
                        }
                        else
                        {
                            LogHelper.Write($"    ⏳ Shift still active, not marking absent yet");
                        }
                    }
                    else
                    {
                        // Has attendance session - check status
                        if (existingSession.Value.Status == "Absent")
                        {
                            LogHelper.Write($"    ℹ️ Already marked as absent");
                        }
                        else if (existingSession.Value.Status == "Missed Clock-out")
                        {
                            LogHelper.Write($"    ℹ️ Already marked as missed clock-out");
                        }
                        else if (!string.IsNullOrEmpty(existingSession.Value.ClockIn) && 
                                 string.IsNullOrEmpty(existingSession.Value.ClockOut) && 
                                 shouldProcessShiftEnd)
                        {
                            // Clocked in but didn't clock out, and shift has ended
                            MarkSessionAsMissedClockout(existingSession.Value.Id, endTime);
                            markedMissedClockout++;
                            LogHelper.Write($"    🕐 Marked as Missed Clock-out");
                        }
                        else if (!string.IsNullOrEmpty(existingSession.Value.ClockOut))
                        {
                            LogHelper.Write($"    ✅ Has complete attendance ({existingSession.Value.Status})");
                        }
                        else
                        {
                            LogHelper.Write($"    ⏳ Clocked in, waiting for clock-out or shift end");
                        }
                    }
                }

                LogHelper.Write($"📊 Summary for {targetDate}: Absent={markedAbsent}, Missed Clock-out={markedMissedClockout}");
                return (markedAbsent, markedMissedClockout);
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 MarkAbsentForDate error for {targetDate}: {ex.Message}");
                return (0, 0);
            }
        }

        /// <summary>
        /// Get schedules for a specific date (public for manual absent marking)
        /// </summary>
        public List<(string EmployeeId, string ShiftName, string StartTime, string EndTime)> GetSchedulesForDate(string date)
        {
            var schedules = new List<(string, string, string, string)>();

            try
            {
                LogHelper.Write($"🔧 GetSchedulesForDate called: date={date}");
                
                using var conn = new SqliteConnection(_connString);
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT employee_id, shift_name, start_time, end_time
                    FROM EmployeeSchedules
                    WHERE schedule_dates LIKE '%' || $date || '%'
                ";
                cmd.Parameters.AddWithValue("$date", date);

                LogHelper.Write($"🔧 Executing query: {cmd.CommandText}");
                LogHelper.Write($"🔧 Parameter: date={date}");

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var empId = reader.GetString(0);
                    var shiftName = reader.GetString(1);
                    var startTime = reader.GetString(2);
                    var endTime = reader.GetString(3);
                    
                    schedules.Add((empId, shiftName, startTime, endTime));
                    LogHelper.Write($"🔧 Found schedule: {empId} - {shiftName} ({startTime} - {endTime})");
                }
                
                LogHelper.Write($"🔧 GetSchedulesForDate complete: {schedules.Count} schedule(s) found");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 GetSchedulesForDate error: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
            }

            return schedules;
        }

        /// <summary>
        /// Get attendance session for employee and date (public for manual absent marking)
        /// </summary>
        public (long Id, string ClockIn, string ClockOut, string Status)? GetSessionForEmployeeAndDate(string employeeId, string date)
        {
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT id, clock_in, IFNULL(clock_out, ''), status
                    FROM AttendanceSessions
                    WHERE employee_id = $empId AND date = $date
                    ORDER BY id DESC
                    LIMIT 1
                ";
                cmd.Parameters.AddWithValue("$empId", employeeId);
                cmd.Parameters.AddWithValue("$date", date);

                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return (
                        reader.GetInt64(0),
                        reader.GetString(1),
                        reader.GetString(2),
                        reader.GetString(3)
                    );
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 GetSessionForEmployeeAndDate error: {ex.Message}");
            }

            return null;
        }

        /// <summary>
        /// Get attendance session by ID (for sync retry)
        /// </summary>
        public (long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, string Status)? GetSessionById(long sessionId)
        {
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT id, employee_id, date, IFNULL(clock_in, ''), IFNULL(clock_out, ''), status
                    FROM AttendanceSessions
                    WHERE id = $id
                ";
                cmd.Parameters.AddWithValue("$id", sessionId);

                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return (
                        reader.GetInt64(0),
                        reader.GetString(1),
                        reader.GetString(2),
                        reader.GetString(3),
                        reader.GetString(4),
                        reader.GetString(5)
                    );
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 GetSessionById error: {ex.Message}");
            }

            return null;
        }

        /// <summary>
        /// Create absent attendance session (public for manual absent marking)
        /// </summary>
        public void CreateAbsentSession(string employeeId, string date, string shiftStartTime)
        {
            try
            {
                LogHelper.Write($"🔧 CreateAbsentSession called: employeeId={employeeId}, date={date}, shiftStartTime={shiftStartTime}");
                
                using var conn = new SqliteConnection(_connString);
                conn.Open();
                
                LogHelper.Write($"🔧 Database connection opened: {_connString}");

                using var cmd = conn.CreateCommand();
                // Use empty string for clock_in instead of NULL since the column has NOT NULL constraint
                cmd.CommandText = @"
                    INSERT INTO AttendanceSessions (employee_id, date, clock_in, clock_out, total_hours, status)
                    VALUES ($empId, $date, '', '', 0, 'Absent')
                ";
                cmd.Parameters.AddWithValue("$empId", employeeId);
                cmd.Parameters.AddWithValue("$date", date);

                LogHelper.Write($"🔧 Executing INSERT query...");
                int rowsAffected = cmd.ExecuteNonQuery();
                LogHelper.Write($"🔧 INSERT complete: {rowsAffected} row(s) affected");
                
                // Get the inserted session ID
                cmd.CommandText = "SELECT last_insert_rowid()";
                var sessionId = Convert.ToInt64(cmd.ExecuteScalar());
                
                LogHelper.Write($"🔧 Session ID: {sessionId}");
                
                // Add to sync queue for backend synchronization
                AddToSyncQueue(employeeId, sessionId, "absent", $"{{\"date\":\"{date}\",\"status\":\"Absent\"}}");
                
                LogHelper.Write($"✅ Created absent session for {employeeId} on {date} (session ID: {sessionId})");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 CreateAbsentSession error: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Mark session as missed clock-out (public for manual absent marking)
        /// </summary>
        public void MarkSessionAsMissedClockout(long sessionId, string shiftEndTime)
        {
            try
            {
                // Calculate hours worked from clock-in to shift end
                double hoursWorked = CalculateHoursToShiftEnd(sessionId, shiftEndTime);

                using var conn = new SqliteConnection(_connString);
                conn.Open();

                // Get employee ID for sync queue
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT employee_id, date FROM AttendanceSessions WHERE id = $id";
                cmd.Parameters.AddWithValue("$id", sessionId);
                
                using var reader = cmd.ExecuteReader();
                string? employeeId = null;
                string? date = null;
                
                if (reader.Read())
                {
                    employeeId = reader.GetString(0);
                    date = reader.GetString(1);
                }
                reader.Close();

                // Update session status
                cmd.CommandText = @"
                    UPDATE AttendanceSessions
                    SET status = 'Missed Clock-out', total_hours = $hours
                    WHERE id = $id
                ";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$hours", hoursWorked);
                cmd.Parameters.AddWithValue("$id", sessionId);

                cmd.ExecuteNonQuery();
                
                // Add to sync queue if we have employee ID
                if (!string.IsNullOrEmpty(employeeId) && !string.IsNullOrEmpty(date))
                {
                    AddToSyncQueue(employeeId, sessionId, "missed_clockout", $"{{\"date\":\"{date}\",\"status\":\"Missed Clock-out\",\"hours\":{hoursWorked}}}");
                    LogHelper.Write($"✅ Marked session {sessionId} as Missed Clock-out for {employeeId} on {date}");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 MarkSessionAsMissedClockout error: {ex.Message}");
            }
        }

        /// <summary>
        /// Calculate hours worked from clock-in to shift end time
        /// </summary>
        private double CalculateHoursToShiftEnd(long sessionId, string shiftEndTime)
        {
            try
            {
                using var conn = new SqliteConnection(_connString);
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT clock_in FROM AttendanceSessions WHERE id = $id";
                cmd.Parameters.AddWithValue("$id", sessionId);

                var clockInStr = cmd.ExecuteScalar()?.ToString();
                if (string.IsNullOrEmpty(clockInStr) || !DateTime.TryParse(clockInStr, out var clockIn))
                {
                    return 0;
                }

                // Parse shift end time
                var timeParts = shiftEndTime.Split(':');
                if (timeParts.Length < 2)
                {
                    return 0;
                }

                int hours = int.Parse(timeParts[0]);
                int minutes = int.Parse(timeParts[1]);

                var now = TimezoneHelper.Now;
                var shiftEnd = now.Date.AddHours(hours).AddMinutes(minutes);

                // Handle overnight shifts
                if (hours >= 0 && hours < 6 && now.Hour >= 12)
                {
                    shiftEnd = shiftEnd.AddDays(1);
                }

                // Calculate hours worked
                var hoursWorked = (shiftEnd - clockIn).TotalHours;
                return Math.Max(0, Math.Round(hoursWorked, 2));
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 CalculateHoursToShiftEnd error: {ex.Message}");
                return 0;
            }
        }
    }

    public class SyncQueueItem
    {
        public long Id { get; set; }
        public string EmployeeId { get; set; }
        public long AttendanceSessionId { get; set; }
        public string SyncType { get; set; }
        public string Payload { get; set; }
        public int RetryCount { get; set; }
        public string LastAttempt { get; set; }
    }
}