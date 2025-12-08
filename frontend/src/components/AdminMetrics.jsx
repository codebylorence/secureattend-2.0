import { useState, useEffect } from "react";
import { fetchEmployees } from "../api/EmployeeApi";
import { getTodayAttendances } from "../api/AttendanceApi";
import { getEmployeeSchedules } from "../api/ScheduleApi";

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    scheduled: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [employees, todayAttendances, schedules] = await Promise.all([
        fetchEmployees(),
        getTodayAttendances(),
        getEmployeeSchedules()
      ]);

      // Count total active employees
      const totalEmployees = employees.filter(emp => emp.status === "Active").length;

      // Get today's day name and date in local timezone
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const now = new Date();
      const today = dayNames[now.getDay()];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      // Find employees scheduled for today
      const scheduledEmployeeIds = new Set();
      schedules.forEach(schedule => {
        // Check if employee is scheduled today
        // First check schedule_dates object for today's date
        if (schedule.schedule_dates && schedule.schedule_dates[today]) {
          const todayScheduleDates = schedule.schedule_dates[today];
          if (Array.isArray(todayScheduleDates) && todayScheduleDates.includes(todayDate)) {
            scheduledEmployeeIds.add(schedule.employee_id);
          }
        }
        // Fallback: check if today is in the days array (for schedules without specific dates)
        else if (schedule.days && Array.isArray(schedule.days) && schedule.days.includes(today)) {
          scheduledEmployeeIds.add(schedule.employee_id);
        }
      });

      const scheduled = scheduledEmployeeIds.size;

      // Count by status using the new status system
      const present = todayAttendances.filter(att => 
        att.status === "Present" || att.status === "COMPLETED" // Include legacy
      ).length;

      const late = todayAttendances.filter(att => 
        att.status === "Late"
      ).length;

      // Count absent - only count actual "Absent" status records
      // Stale records are automatically cleaned up when schedules are assigned
      const absent = todayAttendances.filter(att => att.status === "Absent").length;

      setMetrics({
        totalEmployees,
        present,
        absent,
        late,
        scheduled
      });
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 w-full">
        {/* Total Employees */}
        <div className="bg-blue-600 text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.totalEmployees}</p>
          <p className="text-sm mt-1">Total Employees</p>
        </div>

        {/* Scheduled Today */}
        <div className="bg-purple-600 text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.scheduled}</p>
          <p className="text-sm mt-1">Scheduled Today</p>
        </div>

        {/* Present */}
        <div className="bg-emerald-500 text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.present}</p>
          <p className="text-sm mt-1">Present</p>
        </div>

        {/* Absent */}
        <div className="bg-red-500 text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.absent}</p>
          <p className="text-sm mt-1">Absent</p>
        </div>

        {/* Late */}
        <div className="bg-amber-500 text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.late}</p>
          <p className="text-sm mt-1">Late</p>
        </div>
      </div>
    </>
  );
}
