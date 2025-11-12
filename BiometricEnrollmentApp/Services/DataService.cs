using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.IO;

namespace BiometricEnrollmentApp.Services
{
    public class DataService
    {
        private readonly string _dbPath;

        public DataService()
        {
            _dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
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

                cmd.CommandText = @"
                    UPDATE AttendanceSessions
                    SET clock_out = $clock_out, total_hours = $total_hours, status = $status
                    WHERE id = $id;
                ";
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("$clock_out", tsOut);
                cmd.Parameters.AddWithValue("$total_hours", total);
                cmd.Parameters.AddWithValue("$status", "COMPLETED");
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
    }
}
