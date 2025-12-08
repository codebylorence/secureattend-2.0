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
                var ts = (recordedAt ?? DateTime.UtcNow).ToString("yyyy-MM-dd HH:mm:ss");
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

                LogHelper.Write($"✅ Attendance recorded: {employeeId} ({method}) at {ts}");
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

            var start = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            var end = start.AddDays(1).AddSeconds(-1);

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
                var date = clockInLocal.ToString("yyyy-MM-dd");
                var ts = clockInLocal.ToString("yyyy-MM-dd HH:mm:ss");

                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO AttendanceSessions (employee_id, date, clock_in, status)
                    VALUES ($id, $date, $clock_in, $status);
                ";
                cmd.Parameters.AddWithValue("$id", employeeId);
                cmd.Parameters.AddWithValue("$date", date);
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

                LogHelper.Write($"🕘 Clock-in saved for {employeeId} (session {id}) at {ts}");
                return id;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 SaveClockIn failed for {employeeId}: {ex.Message}");
                return -1;
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

        public long GetOpenSessionId(string employeeId, DateTime localDate)
        {
            var date = localDate.ToString("yyyy-MM-dd");
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id FROM AttendanceSessions
                WHERE employee_id = $id AND date = $date AND clock_out IS NULL
                ORDER BY id DESC LIMIT 1;
            ";
            cmd.Parameters.AddWithValue("$id", employeeId);
            cmd.Parameters.AddWithValue("$date", date);

            var obj = cmd.ExecuteScalar();
            if (obj == null || obj == DBNull.Value) return -1;

            if (obj is long l) return l;
            if (obj is int i) return i;
            if (Int64.TryParse(obj.ToString(), out var parsed)) return parsed;
            return -1;
        }

        public List<(long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, double TotalHours, string Status)> GetTodaySessions()
        {
            var list = new List<(long, string, string, string, string, double, string)>();
            var now = DateTime.Now;
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
                var cutoff = DateTime.UtcNow.AddDays(-retentionDays).ToString("yyyy-MM-dd HH:mm:ss");
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "DELETE FROM Attendances WHERE recorded_at < $cutoff";
                cmd.Parameters.AddWithValue("$cutoff", cutoff);

                int rows = cmd.ExecuteNonQuery();
                LogHelper.Write($"🗑️ Deleted {rows} attendance records older than {retentionDays} days.");
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
                    cmd.Parameters.AddWithValue("$days", schedule.Days != null ? string.Join(",", schedule.Days) : "");
                    cmd.Parameters.AddWithValue("$dates", schedule.Schedule_Dates != null ? System.Text.Json.JsonSerializer.Serialize(schedule.Schedule_Dates) : "");
                    cmd.Parameters.AddWithValue("$dept", schedule.Department ?? "");
                    cmd.Parameters.AddWithValue("$assigned", schedule.Assigned_By ?? "");
                    cmd.Parameters.AddWithValue("$created", schedule.Created_At?.ToString("yyyy-MM-dd HH:mm:ss") ?? "");
                    cmd.Parameters.AddWithValue("$updated", schedule.Updated_At?.ToString("yyyy-MM-dd HH:mm:ss") ?? "");
                    
                    cmd.ExecuteNonQuery();
                    count++;
                }

                transaction.Commit();
                LogHelper.Write($"✅ Updated {count} employee schedule(s) in local database");
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
                var today = DateTime.Now.DayOfWeek.ToString();
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
                var today = DateTime.Now.DayOfWeek.ToString();
                
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT shift_name, start_time, end_time
                    FROM EmployeeSchedules
                    WHERE employee_id = $emp_id AND days LIKE '%' || $today || '%'
                    LIMIT 1
                ";
                cmd.Parameters.AddWithValue("$emp_id", employeeId);
                cmd.Parameters.AddWithValue("$today", today);

                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return (true, reader.GetString(0), reader.GetString(1), reader.GetString(2));
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking schedule for {employeeId}: {ex.Message}");
            }
            return (false, "", "", "");
        }

        public (bool IsWithinShiftTime, string Message) IsWithinShiftTimeWindow(string shiftStartTime, string shiftEndTime)
        {
            try
            {
                var now = DateTime.Now;
                
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
                
                // Check if current time is before shift start (NO GRACE PERIOD)
                if (now < shiftStart)
                {
                    var minutesUntilStart = (shiftStart - now).TotalMinutes;
                    return (false, $"Shift hasn't started yet. Shift starts at {shiftStartTime}. Please wait {minutesUntilStart:F0} more minutes.");
                }
                
                // Check if current time is after shift end
                if (now > shiftEnd)
                {
                    return (false, $"Shift has ended. Shift time was {shiftStartTime} - {shiftEndTime}.");
                }
                
                return (true, "");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking shift time window: {ex.Message}");
                return (true, ""); // If error, allow attendance
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
                
                // Calculate minutes late
                var minutesLate = (clockInTime - shiftStart).TotalMinutes;
                
                // Get late threshold from settings
                var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                int lateThreshold = settingsService.GetLateThresholdMinutes();
                
                // If more than threshold minutes late, mark as Late
                if (minutesLate > lateThreshold)
                {
                    LogHelper.Write($"⏰ Employee is {minutesLate:F0} minutes late (threshold: {lateThreshold} min)");
                    return "Late";
                }
                
                return "Present";
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error determining status: {ex.Message}");
                return "Present";
            }
        }

        /// <summary>
        /// Mark employees as absent if their shift has ended and they didn't clock in
        /// This should be called periodically (e.g., every hour or at end of day)
        /// </summary>
        public int MarkAbsentEmployees()
        {
            try
            {
                var now = DateTime.Now;
                var today = now.ToString("yyyy-MM-dd");
                var dayOfWeek = now.DayOfWeek.ToString();
                
                LogHelper.Write($"🔍 Checking for absent employees on {dayOfWeek}, {today}");
                
                // Get all schedules for today
                var schedulesToday = GetTodaysSchedules();
                
                LogHelper.Write($"👥 Found {schedulesToday.Count} employees scheduled for today");
                
                if (schedulesToday.Count == 0)
                {
                    LogHelper.Write("ℹ️ No employees scheduled for today. Make sure schedules are synced from server.");
                    return 0;
                }
                
                int markedAbsent = 0;
                
                foreach (var schedule in schedulesToday)
                {
                    LogHelper.Write($"  📋 Checking {schedule.EmployeeId}: Shift {schedule.ShiftName} ({schedule.StartTime} - {schedule.EndTime})");
                    
                    // Check if shift has ended
                    if (!HasShiftEnded(schedule.EndTime))
                    {
                        LogHelper.Write($"  ⏳ {schedule.EmployeeId} - Shift not ended yet ({schedule.EndTime})");
                        continue;
                    }
                    
                    // Check if employee has clocked in today
                    var sessions = GetTodaySessions();
                    bool hasAttendance = false;
                    foreach (var s in sessions)
                    {
                        if (s.EmployeeId == schedule.EmployeeId && 
                            (s.Status == "Present" || s.Status == "Late" || s.Status == "IN"))
                        {
                            hasAttendance = true;
                            break;
                        }
                    }
                    
                    if (hasAttendance)
                    {
                        LogHelper.Write($"  ✓ {schedule.EmployeeId} - Has attendance");
                        continue;
                    }
                    
                    // Employee is absent - create absent record locally
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
                        // Create absent record with empty string instead of NULL for clock_in
                        using var insertCmd = conn.CreateCommand();
                        insertCmd.CommandText = @"
                            INSERT INTO AttendanceSessions (employee_id, date, clock_in, clock_out, total_hours, status)
                            VALUES ($id, $date, '', '', 0, 'Absent')
                        ";
                        insertCmd.Parameters.AddWithValue("$id", schedule.EmployeeId);
                        insertCmd.Parameters.AddWithValue("$date", today);
                        insertCmd.ExecuteNonQuery();
                        
                        markedAbsent++;
                        LogHelper.Write($"  ❌ {schedule.EmployeeId} - Marked as Absent");
                    }
                }
                
                LogHelper.Write($"✅ Absent marking complete: {markedAbsent} employees marked absent");
                return markedAbsent;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error marking absent employees: {ex.Message}");
                return 0;
            }
        }
        
        /// <summary>
        /// Check if shift end time has passed
        /// Supports both 24-hour format (HH:MM) and 12-hour format (HH:MM AM/PM)
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
                    // 24-hour format: "17:00"
                    var timeParts = endTime.Split(':');
                    if (timeParts.Length < 2)
                    {
                        LogHelper.Write($"⚠️ HasShiftEnded: Invalid time format: {endTime}");
                        return false;
                    }
                    
                    hours = int.Parse(timeParts[0]);
                    minutes = int.Parse(timeParts[1]);
                }
                
                var shiftEndMinutes = hours * 60 + minutes;
                var currentMinutes = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
                
                bool ended = currentMinutes >= shiftEndMinutes;
                LogHelper.Write($"  🕐 Shift end: {endTime} ({hours:D2}:{minutes:D2}) = {shiftEndMinutes} min, Current: {DateTime.Now:HH:mm} = {currentMinutes} min, Ended: {ended}");
                
                return ended;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 HasShiftEnded error for '{endTime}': {ex.Message}");
                return false;
            }
        }
    }
}
