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

      // Filter employees by department (include team leaders in count)
      const departmentEmployees = employeeData.filter(emp => 
        emp.department === department && 
        emp.status === "Active"
      );
      const departmentEmployeeIds = new Set(departmentEmployees.map(emp => emp.employee_id));

      // Get today's day name and date in local timezone
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const now = new Date();
      const today = dayNames[now.getDay()];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      // Find department employees scheduled for today
      const scheduledEmployeeIds = new Set();
      schedules.forEach(schedule => {
        // Only count employees from this department
        if (!departmentEmployeeIds.has(schedule.employee_id)) return;
        
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

      // Filter attendances for this department (include team leaders)
      const departmentAttendances = attendanceData.filter(att => 
        departmentEmployeeIds.has(att.employee_id)
      );

      // Count by status using the new status system
      const present = departmentAttendances.filter(att => 
        att.status === "Present" || att.status === "COMPLETED" // Include legacy
      ).length;

      const late = departmentAttendances.filter(att => 
        att.status === "Late"
      ).length;
      
      // Count absent - only count actual "Absent" status records
      const absentRecords = departmentAttendances.filter(att => att.status === "Absent");
      console.log('🔍 Team Metrics Debug:');
      console.log('  Department:', department);
      console.log('  Department employees (including team leaders):', departmentEmployees.length);
      console.log('  Total department attendances:', departmentAttendances.length);
      console.log('  Absent records:', absentRecords);
      console.log('  Absent count:', absentRecords.length);
      const absent = absentRecords.length;

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
