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

      // Get today's day name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = dayNames[new Date().getDay()];
      const todayDate = new Date().toISOString().split('T')[0];

      // Find employees scheduled for today
      const scheduledEmployeeIds = new Set();
      schedules.forEach(schedule => {
        // Check if employee is scheduled today
        if (schedule.schedule_dates) {
          // Check specific dates
          const todaySchedule = schedule.schedule_dates[today];
          if (todaySchedule && todaySchedule.includes(todayDate)) {
            scheduledEmployeeIds.add(schedule.employee_id);
          }
        } else if (schedule.days && schedule.days.includes(today)) {
          // Fallback: check if today is in their days array
          scheduledEmployeeIds.add(schedule.employee_id);
        }
      });

      const scheduled = scheduledEmployeeIds.size;

      // Count present (employees who clocked in today)
      const present = todayAttendances.filter(att => att.clock_in).length;

      // Count absent (scheduled employees who haven't clocked in)
      const presentEmployeeIds = new Set(todayAttendances.filter(att => att.clock_in).map(att => att.employee_id));
      const absent = Array.from(scheduledEmployeeIds).filter(empId => !presentEmployeeIds.has(empId)).length;

      // Count late (clocked in after their shift start time)
      // For now, using 8:15 AM as default, but should check individual shift times
      const late = todayAttendances.filter(att => {
        if (!att.clock_in) return false;
        const clockIn = new Date(att.clock_in);
        const hours = clockIn.getHours();
        const minutes = clockIn.getMinutes();
        // TODO: Check against employee's actual shift start time
        return hours > 8 || (hours === 8 && minutes > 15);
      }).length;

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
