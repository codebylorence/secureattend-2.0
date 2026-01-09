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
                            var currentTime = now.ToString("HH:mm");
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
                
                LogHelper.Write($"📊 Clock-in analysis: {minutesDifference:F1} minutes from shift start (Grace period: ±{gracePeriod} min)");
                
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
                
                // If too early (before grace period), still mark as Present but log it
                LogHelper.Write($"⏰ Very early clock-in ({minutesDifference:F1} < -{gracePeriod} min) - Status: Present");
                return "Present";
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error determining status: {ex.Message}");
                return "Present";
            }
        }

        /// <summary>
        /// Mark employees as absent if ALL conditions are met:
        /// 1. Employee has enrolled fingerprints
        /// 2. Employee's shift has started
        /// 3. Employee's shift has ended + grace period (30 minutes)
        /// 4. Employee has not clocked in today
        /// This should be called periodically (e.g., every hour or at end of day)
        /// </summary>
        public int MarkAbsentEmployees()
        {
            try
            {
                var now = TimezoneHelper.Now;
                var today = now.ToString("yyyy-MM-dd");
                var dayOfWeek = now.DayOfWeek.ToString();
                var currentTime = now.ToString("HH:mm");
                
                LogHelper.Write($"🔍 ========== ABSENT MARKING CHECK ==========");
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
                    return 0;
                }
                
                // Get all enrolled employees (those with fingerprints)
                var enrolledEmployees = GetAllEnrollments().Select(e => e.EmployeeId).ToHashSet();
                LogHelper.Write($"👆 Found {enrolledEmployees.Count} employees with enrolled fingerprints");
                
                int markedAbsent = 0;
                
                foreach (var schedule in schedulesToday)
                {
                    LogHelper.Write($"  📋 Checking {schedule.EmployeeId}: Shift {schedule.ShiftName} ({schedule.StartTime} - {schedule.EndTime})");
                    
                    // Check if employee has enrolled fingerprints
                    if (!enrolledEmployees.Contains(schedule.EmployeeId))
                    {
                        LogHelper.Write($"  ⚠️ {schedule.EmployeeId} - No enrolled fingerprints, skipping absent marking");
                        continue;
                    }
                    
                    // Detect if this is an overnight shift
                    bool isOvernightShift = IsOvernightShift(schedule.StartTime, schedule.EndTime);
                    LogHelper.Write($"  🌙 {schedule.EmployeeId} - Overnight shift: {isOvernightShift}");
                    
                    // FIRST: Check if shift has started (must start before we can mark absent)
                    if (!HasShiftStarted(schedule.StartTime))
                    {
                        LogHelper.Write($"  ⏰ {schedule.EmployeeId} - Shift hasn't started yet ({schedule.StartTime}), cannot mark absent");
                        continue;
                    }
                    
                    // SECOND: Check if shift has ended with grace period (configurable minutes after shift end)
                    var settingsService = new BiometricEnrollmentApp.Services.SettingsService();
                    int clockOutGracePeriod = settingsService.GetClockOutGracePeriodMinutes();
                    
                    if (!HasShiftEndedWithGracePeriod(schedule.EndTime, clockOutGracePeriod))
                    {
                        LogHelper.Write($"  ⏳ {schedule.EmployeeId} - Shift not ended yet or within grace period ({schedule.EndTime} + {clockOutGracePeriod} min)");
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
                            LogHelper.Write($"  ✓ {schedule.EmployeeId} - Found attendance record: {s.Status} at {s.ClockIn}");
                            break;
                        }
                    }
                    
                    if (hasAttendance)
                    {
                        LogHelper.Write($"  ✓ {schedule.EmployeeId} - Has attendance, not marking absent");
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
                        LogHelper.Write($"  ❌ {schedule.EmployeeId} - Marked as Absent (shift: {schedule.StartTime}-{schedule.EndTime}, overnight: {isOvernightShift})");
                    }
                    else
                    {
                        LogHelper.Write($"  ℹ️ {schedule.EmployeeId} - Already marked absent");
                    }
                }
                
                LogHelper.Write($"✅ Absent marking complete: {markedAbsent} employees marked absent");
                LogHelper.Write($"🔍 ========== END ABSENT MARKING CHECK ==========");
                return markedAbsent;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error marking absent employees: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
                return 0;
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
                
                // CRITICAL FIX: Handle overnight shifts properly
                // If end time is early morning (00:00-06:00), it likely ends the next day
                if (hours >= 0 && hours < 6)
                {
                    // Check if we're currently in the afternoon/evening (after 12 PM)
                    // If so, the shift ends tomorrow
                    if (now.Hour >= 12)
                    {
                        shiftEndTime = shiftEndTime.AddDays(1);
                        LogHelper.Write($"  🌙 Overnight shift detected - end time is tomorrow: {shiftEndTime:yyyy-MM-dd HH:mm}");
                    }
                    // If we're in the early morning and past the end time, shift ended today
                    else if (now >= shiftEndTime)
                    {
                        LogHelper.Write($"  🌅 Overnight shift ended today: {shiftEndTime:yyyy-MM-dd HH:mm}");
                    }
                    // If we're in early morning but before end time, shift ends later today
                    else
                    {
                        LogHelper.Write($"  🌅 Overnight shift ends later today: {shiftEndTime:yyyy-MM-dd HH:mm}");
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
