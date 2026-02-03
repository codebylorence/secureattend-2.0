import { useState, useEffect } from "react";
import { fetchEmployees } from "../api/EmployeeApi";
import { getTodayAttendances } from "../api/AttendanceApi";
import { getEmployeeSchedules } from "../api/ScheduleApi";
import { isAuthenticated } from "../utils/auth";

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    overtime: 0,
    scheduled: 0,
    totalOvertimeHours: 0
  });

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds to sync with biometric app data
    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // Check if user is authenticated before making requests
      if (!isAuthenticated()) {
        console.log('📊 AdminMetrics: User not authenticated, skipping metrics fetch');
        return;
      }
      
      // Get user role and department from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userRole = user.role;
      const userDepartment = user.department;
      const isSupervisor = userRole === "supervisor";

      console.log('📊 Fetching metrics for:', { userRole, userDepartment, isSupervisor });

      const [employees, todayAttendances, schedules] = await Promise.all([
        fetchEmployees(),
        getTodayAttendances(),
        getEmployeeSchedules()
      ]);

      console.log('📊 Raw data received:', {
        employees: employees.length,
        attendances: todayAttendances.length,
        schedules: schedules.length
      });

      let filteredEmployees = employees;
      let filteredAttendances = todayAttendances;
      let filteredSchedules = schedules;

      // For supervisors, show all employees (no department filtering)
      // Only filter out inactive employees
      if (isSupervisor) {
        filteredEmployees = employees.filter(emp => emp.status === "Active");
        // No need to filter attendances and schedules by department for supervisors
        // They should see all attendance data
      }

      console.log('📊 Filtered data:', {
        employees: filteredEmployees.length,
        attendances: filteredAttendances.length,
        schedules: filteredSchedules.length
      });

      // Count total active employees
      const totalEmployees = isSupervisor 
        ? filteredEmployees.length 
        : employees.filter(emp => emp.status === "Active").length;

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
      filteredSchedules.forEach(schedule => {
        // Check if employee is scheduled today
        // For template-based schedules, prioritize specific_date over days array
        if (schedule.specific_date) {
          // If template has a specific date, only count it if it matches today
          if (schedule.specific_date === todayDate) {
            scheduledEmployeeIds.add(schedule.employee_id);
          }
        }
        // For legacy schedules or templates without specific_date, check days array
        else if (schedule.days && Array.isArray(schedule.days) && schedule.days.includes(today)) {
          scheduledEmployeeIds.add(schedule.employee_id);
        }
        // Fallback: check schedule_dates object for today's date (legacy system)
        else if (schedule.schedule_dates && schedule.schedule_dates[today]) {
          const todayScheduleDates = schedule.schedule_dates[today];
          if (Array.isArray(todayScheduleDates) && todayScheduleDates.includes(todayDate)) {
            scheduledEmployeeIds.add(schedule.employee_id);
          }
        }
      });

      const scheduled = scheduledEmployeeIds.size;

      // Count by status using the new status system
      const present = filteredAttendances.filter(att => 
        att.status === "Present" || att.status === "COMPLETED" // Include legacy
      ).length;

      const late = filteredAttendances.filter(att => 
        att.status === "Late"
      ).length;

      // Count overtime employees
      const overtime = filteredAttendances.filter(att => 
        att.status === "Overtime"
      ).length;

      // Count absent - only count actual "Absent" status records
      // Stale records are automatically cleaned up when schedules are assigned
      const absent = filteredAttendances.filter(att => att.status === "Absent").length;

      // Calculate total overtime hours for today
      const totalOvertimeHours = filteredAttendances
        .filter(att => att.status === "Overtime" && att.overtime_hours)
        .reduce((total, att) => total + parseFloat(att.overtime_hours || 0), 0);

      console.log('📊 Final metrics calculated:', {
        totalEmployees,
        present,
        absent,
        late,
        overtime,
        scheduled,
        totalOvertimeHours
      });

      setMetrics({
        totalEmployees,
        present,
        absent,
        late,
        overtime,
        scheduled,
        totalOvertimeHours
      });
    } catch (error) {
      console.error("❌ Error fetching admin metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 w-full">
        {/* Total Employees */}
        <div className="bg-primary text-white rounded-md p-6 text-center shadow">
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

        {/* Overtime */}
        <div className="bg-[#A9A9A9] text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.overtime}</p>
          <p className="text-sm mt-1">Overtime</p>
          <p className="text-xs mt-1 opacity-90">{metrics.totalOvertimeHours.toFixed(1)}h total</p>
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
