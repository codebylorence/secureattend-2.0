using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.Linq;

namespace BiometricEnrollmentApp.Services
{
    // ─────────────────────────────────────────────────────────────────────────
    // Domain models
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// A resolved shift window anchored to real DateTimes (not just time strings).
    /// </summary>
    public record ShiftWindow(
        string EmployeeId,
        string ShiftName,
        DateTime ShiftStart,       // e.g. 2026-05-04 16:00
        DateTime ShiftEnd,         // e.g. 2026-05-05 00:00  (next day for overnight)
        DateTime AllowedStart,     // ShiftStart - EarlyBuffer
        DateTime AllowedEnd        // ShiftEnd   + LateBuffer
    );

    public enum AttendanceStatus
    {
        Present,
        Late,
        Absent,
        MissedClockOut,
        Overtime,
        IN   // clocked-in, shift not yet ended
    }

    public record ClockInResult(bool Success, string Message, long SessionId = -1);
    public record ClockOutResult(bool Success, string Message, double TotalHours = 0);

    // ─────────────────────────────────────────────────────────────────────────
    // Engine
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Shift-based attendance engine.
    /// All logic is anchored to full DateTime ranges, never to calendar date alone.
    /// </summary>
    public class ShiftAttendanceEngine
    {
        private readonly string _connString;
        private readonly DataService _dataService;

        // Configurable buffers (can be injected / loaded from settings)
        public TimeSpan EarlyClockInBuffer  { get; set; } = TimeSpan.FromHours(2);
        public TimeSpan LateClockOutBuffer  { get; set; } = TimeSpan.FromHours(2);
        public TimeSpan MaxWorkedHours      { get; set; } = TimeSpan.FromHours(8);

        public ShiftAttendanceEngine(string connString)
        {
            _connString  = connString;
            _dataService = new DataService();
        }

        // ─────────────────────────────────────────────────────────────────────
        // 1. Shift resolution
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Given a "HH:mm" start and end string, build a ShiftWindow anchored to
        /// the correct calendar date so that the window contains <paramref name="referenceTime"/>.
        /// Handles overnight shifts (end_time &lt;= start_time).
        /// <paramref name="overtimeHours"/> extends AllowedEnd beyond the late buffer.
        /// </summary>
        public ShiftWindow ResolveShiftWindow(
            string employeeId,
            string shiftName,
            string startTimeStr,   // "HH:mm"
            string endTimeStr,     // "HH:mm"
            DateTime referenceTime,
            double overtimeHours = 0.0)
        {
            var (startH, startM) = ParseHHmm(startTimeStr);
            var (endH,   endM)   = ParseHHmm(endTimeStr);

            // Anchor shift start to the calendar date of referenceTime
            var shiftStart = new DateTime(
                referenceTime.Year, referenceTime.Month, referenceTime.Day,
                startH, startM, 0);

            // Overnight: end_time <= start_time → shift ends next calendar day
            var shiftEnd = new DateTime(
                referenceTime.Year, referenceTime.Month, referenceTime.Day,
                endH, endM, 0);

            bool isOvernight = (endH * 60 + endM) <= (startH * 60 + startM);
            if (isOvernight) shiftEnd = shiftEnd.AddDays(1);

            var allowedStart = shiftStart - EarlyClockInBuffer;

            // ── Overtime extends the allowed clock-out window ──
            // allowed_end = shift_end + late_buffer + overtime_hours
            var overtimeExtension = TimeSpan.FromHours(overtimeHours);
            var allowedEnd = shiftEnd + LateClockOutBuffer + overtimeExtension;

            return new ShiftWindow(employeeId, shiftName, shiftStart, shiftEnd, allowedStart, allowedEnd);
        }

        /// <summary>
        /// Find the shift window that contains <paramref name="now"/> for a given employee.
        /// Checks today's schedules and yesterday's (for overnight shifts still active).
        /// Loads overtime hours from local DB and extends AllowedEnd accordingly.
        /// Returns null if no matching shift found.
        /// </summary>
        public ShiftWindow? FindActiveShiftWindow(string employeeId, DateTime now)
        {
            var schedules = GetSchedulesForEmployee(employeeId, now);

            foreach (var s in schedules)
            {
                // Load overtime for today's shift date
                double overtimeHours = _dataService.GetOvertimeHours(employeeId, now.ToString("yyyy-MM-dd"));

                var window = ResolveShiftWindow(employeeId, s.ShiftName, s.StartTime, s.EndTime, now, overtimeHours);
                if (now >= window.AllowedStart && now <= window.AllowedEnd)
                {
                    if (overtimeHours > 0)
                        LogHelper.Write($"⏱️ Overtime active for {employeeId}: +{overtimeHours}h → AllowedEnd = {window.AllowedEnd:HH:mm}");
                    return window;
                }

                // Also try anchoring to yesterday (overnight shift that started yesterday)
                double overtimeYesterday = _dataService.GetOvertimeHours(employeeId, now.AddDays(-1).ToString("yyyy-MM-dd"));
                var windowYesterday = ResolveShiftWindow(employeeId, s.ShiftName, s.StartTime, s.EndTime, now.AddDays(-1), overtimeYesterday);
                if (now >= windowYesterday.AllowedStart && now <= windowYesterday.AllowedEnd)
                {
                    if (overtimeYesterday > 0)
                        LogHelper.Write($"⏱️ Overtime (overnight) active for {employeeId}: +{overtimeYesterday}h → AllowedEnd = {windowYesterday.AllowedEnd:HH:mm}");
                    return windowYesterday;
                }
            }

            return null;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. Clock-in
        // ─────────────────────────────────────────────────────────────────────

        public ClockInResult ClockIn(string employeeId, DateTime now)
        {
            var window = FindActiveShiftWindow(employeeId, now);
            if (window == null)
                return new ClockInResult(false, $"No active shift found for {employeeId} at {now:HH:mm}");

            // Check for existing open session in this shift window (new engine sessions)
            var existing = GetOpenSessionInWindow(employeeId, window);
            if (existing.HasValue)
                return new ClockInResult(false, $"Already clocked in for shift '{window.ShiftName}'", existing.Value);

            // Also check for ANY open session on the shift date (legacy sessions without shift times)
            string shiftDate = window.ShiftStart.ToString("yyyy-MM-dd");
            var legacyOpen = GetAnyOpenSessionOnDate(employeeId, shiftDate);
            if (legacyOpen.HasValue)
            {
                LogHelper.Write($"⚠️ {employeeId} already has an open session (ID {legacyOpen.Value}) on {shiftDate} — skipping new clock-in");
                return new ClockInResult(false, $"Already clocked in today", legacyOpen.Value);
            }

            // Attendance date = shift start date (not clock-in date)
            string attendanceDate = window.ShiftStart.ToString("yyyy-MM-dd");

            // Determine status: Late if past shift start
            string status = now > window.ShiftStart ? "Late" : "IN";

            long sessionId = InsertSession(employeeId, attendanceDate, now, null, 0, status, window.ShiftName);

            LogHelper.Write($"✅ Clock-in: {employeeId} | Shift: {window.ShiftName} " +
                            $"| Window: {window.ShiftStart:HH:mm}–{window.ShiftEnd:HH:mm} " +
                            $"| Status: {status} | Session: {sessionId}");

            return new ClockInResult(true, $"Clocked in ({status})", sessionId);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 3. Clock-out
        // ─────────────────────────────────────────────────────────────────────

        public ClockOutResult ClockOut(string employeeId, DateTime now)
        {
            // Find the latest open session for this employee
            var session = GetLatestOpenSession(employeeId);
            if (session == null)
                return new ClockOutResult(false, "No open clock-in session found");

            ShiftWindow window;

            // If session has stored shift times, reconstruct from them
            // Otherwise fall back to finding the active window from schedules
            if (!string.IsNullOrEmpty(session.ShiftStartTime) && !string.IsNullOrEmpty(session.ShiftEndTime))
            {
                // Load overtime for the shift date
                string shiftDateStr = session.ClockIn.ToString("yyyy-MM-dd");
                double ot = _dataService.GetOvertimeHours(employeeId, shiftDateStr);
                window = ResolveShiftWindow(
                    employeeId,
                    session.ShiftName,
                    session.ShiftStartTime,
                    session.ShiftEndTime,
                    session.ClockIn,
                    ot);
            }
            else
            {
                // Legacy session — no stored shift times, find active window from schedules
                var activeWindow = FindActiveShiftWindow(employeeId, now);
                if (activeWindow == null)
                {
                    // Allow clock-out anyway with a wide window (no shift constraint)
                    LogHelper.Write($"⚠️ {employeeId} has open session but no shift window found — allowing clock-out");
                    var raw2   = now - session.ClockIn;
                    var capped2 = raw2 > MaxWorkedHours ? MaxWorkedHours : raw2;
                    double hours2 = Math.Round(capped2.TotalHours, 6);
                    string legacyStatus = session.Status == "Late" ? "Late" : "Present";
                    UpdateSessionClockOut(session.Id, now, hours2, legacyStatus);
                    return new ClockOutResult(true, $"Clocked out ({legacyStatus})", hours2);
                }
                window = activeWindow;
            }

            // Enforce: cannot clock out after allowed_end
            if (now > window.AllowedEnd)
                return new ClockOutResult(false,
                    $"Clock-out not allowed. Shift window closed at {window.AllowedEnd:HH:mm}");

            // Cap worked hours at MaxWorkedHours — overtime extends the window, NOT the hours
            var raw    = now - session.ClockIn;
            var capped = raw > MaxWorkedHours ? MaxWorkedHours : raw;

            // Resolve overtime before capping so we know whether to extend the cap
            string shiftDate = window.ShiftStart.ToString("yyyy-MM-dd");
            double overtimeHours = _dataService.GetOvertimeHours(employeeId, shiftDate);
            bool hasOvertime = overtimeHours > 0;

            // If clocking out after shift end:
            // - Without overtime: cap at shift end (excess time not counted)
            // - With overtime: cap at shift end + overtime hours (employee worked the extra time)
            if (now > window.ShiftEnd)
            {
                TimeSpan cap;
                if (hasOvertime)
                {
                    // Allow up to shift duration + assigned overtime hours
                    var overtimeCap = window.ShiftEnd - session.ClockIn + TimeSpan.FromHours(overtimeHours);
                    cap = overtimeCap > TimeSpan.Zero ? overtimeCap : capped;
                }
                else
                {
                    cap = window.ShiftEnd - session.ClockIn;
                }

                if (cap > TimeSpan.Zero && cap < capped)
                    capped = cap;
            }

            double totalHours = Math.Round(capped.TotalHours, 6);

            // Determine final status
            // If employee has overtime assigned for this shift date → mark as Overtime
            string finalStatus;
            if (hasOvertime)
            {
                finalStatus = "Overtime";
                LogHelper.Write($"⏱️ {employeeId} has overtime assigned ({overtimeHours}h) → status: Overtime");
            }
            else
            {
                finalStatus = session.Status == "Late" ? "Late" : "Present";
            }

            UpdateSessionClockOut(session.Id, now, totalHours, finalStatus);

            LogHelper.Write($"✅ Clock-out: {employeeId} | Shift: {window.ShiftName} " +
                            $"| Hours: {totalHours:F2} | Status: {finalStatus}");

            return new ClockOutResult(true, $"Clocked out ({finalStatus})", totalHours);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 4. Evaluation — runs periodically, ONLY after allowed_end
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Evaluate all scheduled employees for a given date range.
        /// Marks ABSENT or MISSED CLOCK-OUT only after the shift's allowed_end has passed.
        /// </summary>
        public (int markedAbsent, int markedMissedClockOut) EvaluateShifts(DateTime now, int daysBack = 7)
        {
            int absent = 0, missed = 0;

            for (int i = 0; i <= daysBack; i++)
            {
                var anchorDate = now.AddDays(-i);
                var dateStr    = anchorDate.ToString("yyyy-MM-dd");

                var schedules = GetSchedulesForDate(dateStr);

                foreach (var s in schedules)
                {
                    // Load overtime for this shift date — extends evaluation_time
                    double overtimeHours = _dataService.GetOvertimeHours(s.EmployeeId, anchorDate.ToString("yyyy-MM-dd"));
                    var window = ResolveShiftWindow(s.EmployeeId, s.ShiftName, s.StartTime, s.EndTime, anchorDate, overtimeHours);

                    // ── CRITICAL: Only evaluate AFTER the shift window has fully closed ──
                    // evaluation_time = shift_end + late_buffer + overtime_hours
                    if (now <= window.AllowedEnd)
                    {
                        LogHelper.Write($"  ⏳ {s.EmployeeId} [{s.ShiftName}] window not closed yet " +
                                        $"(closes {window.AllowedEnd:yyyy-MM-dd HH:mm}" +
                                        (overtimeHours > 0 ? $", +{overtimeHours}h OT" : "") +
                                        $") — skipping");
                        continue;
                    }

                    var session = GetSessionInWindow(s.EmployeeId, window);

                    if (session == null)
                    {
                        // No session at all → ABSENT
                        if (!AbsentRecordExists(s.EmployeeId, window.ShiftStart.ToString("yyyy-MM-dd"), s.ShiftName))
                        {
                            CreateAbsentRecord(s.EmployeeId, window.ShiftStart.ToString("yyyy-MM-dd"), s.ShiftName);
                            absent++;
                            LogHelper.Write($"  ❌ ABSENT: {s.EmployeeId} [{s.ShiftName}] on {dateStr}");
                        }
                    }
                    else if (session.ClockOut == null)
                    {
                        // Has clock-in but no clock-out → MISSED CLOCK-OUT
                        if (session.Status != "Missed Clock-out" && session.Status != "Absent")
                        {
                            MarkMissedClockOut(session.Id, window.ShiftEnd);
                            missed++;
                            LogHelper.Write($"  🕐 MISSED CLOCK-OUT: {s.EmployeeId} [{s.ShiftName}] on {dateStr}");
                        }
                    }
                    // else: has both clock-in and clock-out → already complete, nothing to do
                }
            }

            LogHelper.Write($"📊 Evaluation complete: {absent} absent, {missed} missed clock-out");
            return (absent, missed);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 5. Database helpers
        // ─────────────────────────────────────────────────────────────────────

        private record ScheduleRow(string EmployeeId, string ShiftName, string StartTime, string EndTime);

        private record SessionRow(
            long Id,
            string EmployeeId,
            DateTime ClockIn,
            DateTime? ClockOut,
            string Status,
            string ShiftName,
            string ShiftStartTime,
            string ShiftEndTime);

        private List<ScheduleRow> GetSchedulesForEmployee(string employeeId, DateTime date)
        {
            var dateStr = date.ToString("yyyy-MM-dd");
            var result  = new List<ScheduleRow>();

            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT shift_name, start_time, end_time
                FROM EmployeeSchedules
                WHERE employee_id = $emp
                  AND (schedule_dates LIKE '%' || $date || '%')
            ";
            cmd.Parameters.AddWithValue("$emp",  employeeId);
            cmd.Parameters.AddWithValue("$date", dateStr);

            using var r = cmd.ExecuteReader();
            while (r.Read())
                result.Add(new ScheduleRow(employeeId, r.GetString(0), r.GetString(1), r.GetString(2)));

            return result;
        }

        private List<ScheduleRow> GetSchedulesForDate(string dateStr)
        {
            var result = new List<ScheduleRow>();

            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT employee_id, shift_name, start_time, end_time
                FROM EmployeeSchedules
                WHERE schedule_dates LIKE '%' || $date || '%'
            ";
            cmd.Parameters.AddWithValue("$date", dateStr);

            using var r = cmd.ExecuteReader();
            while (r.Read())
                result.Add(new ScheduleRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3)));

            return result;
        }

        /// <summary>
        /// Find a session whose clock_in falls within the shift's allowed window.
        /// Uses full DateTime comparison — not calendar date.
        /// </summary>
        private SessionRow? GetSessionInWindow(string employeeId, ShiftWindow window)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            // Fetch sessions around the window date range
            cmd.CommandText = @"
                SELECT id, clock_in, clock_out, status, shift_name,
                       IFNULL(shift_start_time,''), IFNULL(shift_end_time,'')
                FROM AttendanceSessions
                WHERE employee_id = $emp
                  AND clock_in >= $from
                  AND clock_in <= $to
                ORDER BY id DESC LIMIT 1
            ";
            cmd.Parameters.AddWithValue("$emp",  employeeId);
            cmd.Parameters.AddWithValue("$from", window.AllowedStart.ToString("yyyy-MM-dd HH:mm:ss"));
            cmd.Parameters.AddWithValue("$to",   window.AllowedEnd.ToString("yyyy-MM-dd HH:mm:ss"));

            using var r = cmd.ExecuteReader();
            if (!r.Read()) return null;

            var clockInStr = r.IsDBNull(1) ? null : r.GetString(1);
            if (string.IsNullOrEmpty(clockInStr) || !DateTime.TryParse(clockInStr, out var clockIn))
                return null;

            DateTime? clockOut = r.IsDBNull(2) ? null : DateTime.Parse(r.GetString(2));
            return new SessionRow(
                r.GetInt64(0),
                employeeId,
                clockIn,
                clockOut,
                r.GetString(3),
                r.GetString(4),
                r.GetString(5),
                r.GetString(6));
        }

        private long? GetOpenSessionInWindow(string employeeId, ShiftWindow window)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id FROM AttendanceSessions
                WHERE employee_id = $emp
                  AND clock_out IS NULL
                  AND clock_in IS NOT NULL
                  AND clock_in >= $from
                  AND clock_in <= $to
                ORDER BY id DESC LIMIT 1
            ";
            cmd.Parameters.AddWithValue("$emp",  employeeId);
            cmd.Parameters.AddWithValue("$from", window.AllowedStart.ToString("yyyy-MM-dd HH:mm:ss"));
            cmd.Parameters.AddWithValue("$to",   window.AllowedEnd.ToString("yyyy-MM-dd HH:mm:ss"));

            var obj = cmd.ExecuteScalar();
            if (obj == null || obj == DBNull.Value) return null;
            return Convert.ToInt64(obj);
        }

        /// <summary>
        /// Check for any open session on a specific date regardless of shift window.
        /// Catches legacy sessions created by the old system.
        /// </summary>
        private long? GetAnyOpenSessionOnDate(string employeeId, string date)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id FROM AttendanceSessions
                WHERE employee_id = $emp
                  AND date = $date
                  AND clock_out IS NULL
                  AND clock_in IS NOT NULL
                  AND status NOT IN ('Absent', 'Missed Clock-out')
                ORDER BY id DESC LIMIT 1
            ";
            cmd.Parameters.AddWithValue("$emp",  employeeId);
            cmd.Parameters.AddWithValue("$date", date);

            var obj = cmd.ExecuteScalar();
            if (obj == null || obj == DBNull.Value) return null;
            return Convert.ToInt64(obj);
        }

        private SessionRow? GetLatestOpenSession(string employeeId)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, clock_in, clock_out, status,
                       IFNULL(shift_name,''),
                       IFNULL(shift_start_time,''),
                       IFNULL(shift_end_time,'')
                FROM AttendanceSessions
                WHERE employee_id = $emp
                  AND clock_out IS NULL
                  AND clock_in IS NOT NULL
                ORDER BY id DESC LIMIT 1
            ";
            cmd.Parameters.AddWithValue("$emp", employeeId);

            using var r = cmd.ExecuteReader();
            if (!r.Read()) return null;

            var clockInStr = r.IsDBNull(1) ? null : r.GetString(1);
            if (string.IsNullOrEmpty(clockInStr) || !DateTime.TryParse(clockInStr, out var clockIn))
                return null;

            return new SessionRow(
                r.GetInt64(0),
                employeeId,
                clockIn,
                null,
                r.GetString(3),
                r.GetString(4),
                r.GetString(5),
                r.GetString(6));
        }

        private long InsertSession(
            string employeeId, string date,
            DateTime clockIn, DateTime? clockOut,
            double totalHours, string status, string shiftName)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO AttendanceSessions
                    (employee_id, date, clock_in, clock_out, total_hours, status, shift_name)
                VALUES ($emp, $date, $ci, $co, $hrs, $status, $shift);
                SELECT last_insert_rowid();
            ";
            cmd.Parameters.AddWithValue("$emp",    employeeId);
            cmd.Parameters.AddWithValue("$date",   date);
            cmd.Parameters.AddWithValue("$ci",     clockIn.ToString("yyyy-MM-dd HH:mm:ss"));
            cmd.Parameters.AddWithValue("$co",     clockOut.HasValue ? clockOut.Value.ToString("yyyy-MM-dd HH:mm:ss") : DBNull.Value);
            cmd.Parameters.AddWithValue("$hrs",    totalHours);
            cmd.Parameters.AddWithValue("$status", status);
            cmd.Parameters.AddWithValue("$shift",  shiftName);

            var obj = cmd.ExecuteScalar();
            return obj != null && obj != DBNull.Value ? Convert.ToInt64(obj) : -1;
        }

        private void UpdateSessionClockOut(long sessionId, DateTime clockOut, double totalHours, string status)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE AttendanceSessions
                SET clock_out = $co, total_hours = $hrs, status = $status
                WHERE id = $id
            ";
            cmd.Parameters.AddWithValue("$co",     clockOut.ToString("yyyy-MM-dd HH:mm:ss"));
            cmd.Parameters.AddWithValue("$hrs",    totalHours);
            cmd.Parameters.AddWithValue("$status", status);
            cmd.Parameters.AddWithValue("$id",     sessionId);
            cmd.ExecuteNonQuery();
        }

        private void MarkMissedClockOut(long sessionId, DateTime shiftEnd)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE AttendanceSessions
                SET status = 'Missed Clock-out', total_hours = 0
                WHERE id = $id
            ";
            cmd.Parameters.AddWithValue("$id", sessionId);
            cmd.ExecuteNonQuery();
        }

        private bool AbsentRecordExists(string employeeId, string date, string shiftName)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT COUNT(1) FROM AttendanceSessions
                WHERE employee_id = $emp AND date = $date
                  AND shift_name = $shift AND status = 'Absent'
            ";
            cmd.Parameters.AddWithValue("$emp",   employeeId);
            cmd.Parameters.AddWithValue("$date",  date);
            cmd.Parameters.AddWithValue("$shift", shiftName);
            return Convert.ToInt32(cmd.ExecuteScalar()) > 0;
        }

        private void CreateAbsentRecord(string employeeId, string date, string shiftName)
        {
            using var conn = new SqliteConnection(_connString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO AttendanceSessions
                    (employee_id, date, clock_in, clock_out, total_hours, status, shift_name)
                VALUES ($emp, $date, NULL, NULL, 0, 'Absent', $shift)
            ";
            cmd.Parameters.AddWithValue("$emp",   employeeId);
            cmd.Parameters.AddWithValue("$date",  date);
            cmd.Parameters.AddWithValue("$shift", shiftName);
            cmd.ExecuteNonQuery();
        }

        // ─────────────────────────────────────────────────────────────────────
        // 6. Utilities
        // ─────────────────────────────────────────────────────────────────────

        private static (int h, int m) ParseHHmm(string timeStr)
        {
            var parts = timeStr.Split(':');
            if (parts.Length < 2)
                throw new ArgumentException($"Invalid time format: '{timeStr}'. Expected HH:mm");
            return (int.Parse(parts[0]), int.Parse(parts[1]));
        }
    }
}
