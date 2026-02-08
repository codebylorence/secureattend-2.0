import { useState, useEffect } from "react";
import { getTodayAttendances } from "../api/AttendanceApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { getEmployeeSchedules, getTemplates } from "../api/ScheduleApi";

export default function TeamMetrics({ department }) {
  const [metrics, setMetrics] = useState({ present: 0, absent: 0, late: 0, overtime: 0, scheduled: 0, totalOvertimeHours: 0 });

  useEffect(() => {
    if (department) {
      fetchMetrics();
    }
  }, [department]);

  const fetchMetrics = async () => {
    try {
      console.log('🔍 TeamMetrics: Starting fetchMetrics for department:', department);
      
      const [attendanceData, employeeData, employeeSchedules, templates] = await Promise.all([
        getTodayAttendances(),
        fetchEmployees(),
        getEmployeeSchedules(),
        getTemplates()
      ]);

      console.log('🔍 TeamMetrics: API responses received:', {
        attendances: attendanceData?.length || 0,
        employees: employeeData?.length || 0,
        employeeSchedules: employeeSchedules?.length || 0,
        templates: templates?.length || 0
      });

      // Filter employees by department (include team leaders in count)
      const departmentEmployees = employeeData.filter(emp => 
        emp.department === department && 
        emp.status === "Active"
      );
      const departmentEmployeeIds = new Set(departmentEmployees.map(emp => emp.employee_id));

      console.log('🔍 TeamMetrics: Department filtering:', {
        department,
        totalEmployees: employeeData.length,
        departmentEmployees: departmentEmployees.length,
        departmentEmployeeIds: Array.from(departmentEmployeeIds)
      });

      // Get today's day name and date in local timezone
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const now = new Date();
      const today = dayNames[now.getDay()];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      console.log('🔍 TeamMetrics: Date calculation:', { today, todayDate });

      // Find department employees scheduled for today
      const scheduledEmployeeIds = new Set();
      
      console.log('🔍 TeamMetrics: Processing employee schedules...');
      employeeSchedules.forEach((schedule, index) => {
        console.log(`  Employee Schedule ${index + 1}:`, {
          employee_id: schedule.employee_id,
          specific_date: schedule.specific_date,
          department: schedule.department,
          shift_name: schedule.shift_name,
          isDepartmentEmployee: departmentEmployeeIds.has(schedule.employee_id)
        });
        
        // Only count employees from this department
        if (!departmentEmployeeIds.has(schedule.employee_id)) return;
        
        // Check if employee is scheduled today using the new template system
        if (schedule.specific_date) {
          // New template system: check if specific_date matches today's date
          if (schedule.specific_date === todayDate) {
            console.log(`    ✅ Adding employee ${schedule.employee_id} (specific_date match)`);
            scheduledEmployeeIds.add(schedule.employee_id);
          } else {
            console.log(`    ❌ Date mismatch: ${schedule.specific_date} !== ${todayDate}`);
          }
        } else {
          console.log(`    ⚠️ No specific_date, checking legacy system...`);
          // Legacy system: check schedule_dates object for today's date
          if (schedule.schedule_dates && schedule.schedule_dates[today]) {
            const todayScheduleDates = schedule.schedule_dates[today];
            if (Array.isArray(todayScheduleDates) && todayScheduleDates.includes(todayDate)) {
              console.log(`    ✅ Adding employee ${schedule.employee_id} (legacy schedule_dates)`);
              scheduledEmployeeIds.add(schedule.employee_id);
            }
          }
          // Fallback: check if today is in the days array (for schedules without specific dates)
          else if (schedule.days && Array.isArray(schedule.days) && schedule.days.includes(today)) {
            console.log(`    ✅ Adding employee ${schedule.employee_id} (legacy days array)`);
            scheduledEmployeeIds.add(schedule.employee_id);
          }
        }
      });

      // Also check template assigned_employees field
      console.log('🔍 TeamMetrics: Processing template assignments...');
      templates.forEach((template, index) => {
        // Only process templates for this department
        if (template.department !== department) return;
        
        console.log(`  Template ${index + 1}:`, {
          id: template.id,
          shift_name: template.shift_name,
          specific_date: template.specific_date,
          department: template.department,
          assigned_employees: template.assigned_employees
        });
        
        if (template.assigned_employees) {
          let assignedEmployees = [];
          try {
            assignedEmployees = typeof template.assigned_employees === 'string' 
              ? JSON.parse(template.assigned_employees) 
              : template.assigned_employees;
          } catch (e) {
            console.error('Error parsing assigned_employees for template', template.id, e);
            return;
          }
          
          // Check if template is for today
          const isForToday = template.specific_date === todayDate;
          
          if (isForToday) {
            assignedEmployees.forEach(assignment => {
              if (departmentEmployeeIds.has(assignment.employee_id)) {
                console.log(`    ✅ Adding employee ${assignment.employee_id} from template (specific_date match)`);
                scheduledEmployeeIds.add(assignment.employee_id);
              }
            });
          }
        }
      });

      const scheduled = scheduledEmployeeIds.size;
      
      console.log('🔍 TeamMetrics: Final results:', {
        scheduledEmployeeIds: Array.from(scheduledEmployeeIds),
        scheduledCount: scheduled
      });

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

      // Count overtime employees
      const overtime = departmentAttendances.filter(att => 
        att.status === "Overtime"
      ).length;

      // Calculate total overtime hours for this department today
      const totalOvertimeHours = departmentAttendances
        .filter(att => att.status === "Overtime" && att.overtime_hours)
        .reduce((total, att) => total + parseFloat(att.overtime_hours || 0), 0);
      
      // Count absent - only count actual "Absent" status records
      const absentRecords = departmentAttendances.filter(att => att.status === "Absent");
      console.log('🔍 Team Metrics Debug:');
      console.log('  Department:', department);
      console.log('  Department employees (including team leaders):', departmentEmployees.length);
      console.log('  Total department attendances:', departmentAttendances.length);
      console.log('  Absent records:', absentRecords);
      console.log('  Absent count:', absentRecords.length);
      console.log('  Overtime count:', overtime);
      console.log('  Total overtime hours:', totalOvertimeHours);
      const absent = absentRecords.length;

      setMetrics({ present, absent, late, overtime, scheduled, totalOvertimeHours });
    } catch (error) {
      console.error("❌ TeamMetrics Error:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // Set default values on error
      setMetrics({ present: 0, absent: 0, late: 0, overtime: 0, scheduled: 0, totalOvertimeHours: 0 });
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 w-full">
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
        <div className="bg-indigo-600 text-white rounded-md p-6 text-center shadow">
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
