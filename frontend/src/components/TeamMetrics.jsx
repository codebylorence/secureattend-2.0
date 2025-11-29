import { useState, useEffect } from "react";
import { getTodayAttendances } from "../api/AttendanceApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { getEmployeeSchedules } from "../api/ScheduleApi";

export default function TeamMetrics({ department }) {
  const [metrics, setMetrics] = useState({ present: 0, absent: 0, late: 0, scheduled: 0 });

  useEffect(() => {
    if (department) {
      fetchMetrics();
    }
  }, [department]);

  const fetchMetrics = async () => {
    try {
      const [attendanceData, employeeData, schedules] = await Promise.all([
        getTodayAttendances(),
        fetchEmployees(),
        getEmployeeSchedules()
      ]);

      // Filter employees by department (exclude team leaders from count)
      const departmentEmployees = employeeData.filter(emp => 
        emp.department === department && 
        emp.status === "Active" &&
        emp.position !== "Team Leader"
      );
      const departmentEmployeeIds = new Set(departmentEmployees.map(emp => emp.employee_id));

      // Get today's day name and date
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = dayNames[new Date().getDay()];
      const todayDate = new Date().toISOString().split('T')[0];

      // Find department employees scheduled for today
      const scheduledEmployeeIds = new Set();
      schedules.forEach(schedule => {
        // Only count employees from this department
        if (!departmentEmployeeIds.has(schedule.employee_id)) return;
        
        // Check if employee is scheduled today
        if (schedule.schedule_dates) {
          const todaySchedule = schedule.schedule_dates[today];
          if (todaySchedule && todaySchedule.includes(todayDate)) {
            scheduledEmployeeIds.add(schedule.employee_id);
          }
        } else if (schedule.days && schedule.days.includes(today)) {
          scheduledEmployeeIds.add(schedule.employee_id);
        }
      });

      const scheduled = scheduledEmployeeIds.size;

      // Filter attendances for this department
      const departmentAttendances = attendanceData.filter(att => 
        departmentEmployeeIds.has(att.employee_id)
      );

      const present = departmentAttendances.filter(att => att.clock_in).length;
      
      // Count absent (scheduled employees who haven't clocked in)
      const presentEmployeeIds = new Set(departmentAttendances.filter(att => att.clock_in).map(att => att.employee_id));
      const absent = Array.from(scheduledEmployeeIds).filter(empId => !presentEmployeeIds.has(empId)).length;
      
      // Count late (clock in after 8:15 AM - 15 min grace period)
      const late = departmentAttendances.filter(att => {
        if (!att.clock_in) return false;
        const clockIn = new Date(att.clock_in);
        const hours = clockIn.getHours();
        const minutes = clockIn.getMinutes();
        return hours > 8 || (hours === 8 && minutes > 15);
      }).length;

      setMetrics({ present, absent, late, scheduled });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full">
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
