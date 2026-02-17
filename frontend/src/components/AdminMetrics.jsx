import { useState, useEffect } from "react";
import { fetchEmployees } from "../api/EmployeeApi";
import { getTodayAttendances } from "../api/AttendanceApi";
import { getEmployeeSchedules, getTemplates } from "../api/ScheduleApi";
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

      const [employees, todayAttendances, employeeSchedules, templates] = await Promise.all([
        fetchEmployees(),
        getTodayAttendances(),
        getEmployeeSchedules(),
        getTemplates()
      ]);

      console.log('📊 Raw data received:', {
        employees: employees.length,
        attendances: todayAttendances.length,
        employeeSchedules: employeeSchedules.length,
        templates: templates.length
      });

      let filteredEmployees = employees;
      let filteredAttendances = todayAttendances;
      let filteredEmployeeSchedules = employeeSchedules;
      let filteredTemplates = templates;

      // For supervisors, show all employees (no department filtering)
      // Only filter out inactive employees
      if (isSupervisor) {
        filteredEmployees = employees.filter(emp => emp.status === "Active");
        // No need to filter attendances, schedules, and templates by department for supervisors
        // They should see all data
      }

      console.log('📊 Filtered data:', {
        employees: filteredEmployees.length,
        attendances: filteredAttendances.length,
        employeeSchedules: filteredEmployeeSchedules.length,
        templates: filteredTemplates.length
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
      
      // Process employee schedules
      filteredEmployeeSchedules.forEach(schedule => {
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

      // Also check template assigned_employees field
      console.log('📊 AdminMetrics: Processing template assignments...');
      filteredTemplates.forEach((template, index) => {
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
            console.log(`    Template is for today! Assigned employees:`, assignedEmployees);
            assignedEmployees.forEach(assignment => {
              console.log(`    ✅ Adding employee ${assignment.employee_id} from template`);
              scheduledEmployeeIds.add(assignment.employee_id);
            });
          } else {
            console.log(`    Template not for today: ${template.specific_date} !== ${todayDate}`);
          }
        }
      });

      const scheduled = scheduledEmployeeIds.size;
      
      console.log('📊 AdminMetrics: Scheduled employees:', {
        scheduledEmployeeIds: Array.from(scheduledEmployeeIds),
        count: scheduled
      });

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

      // Calculate total employees who clocked in today (Present + Late + Overtime)
      const totalClockedIn = present + late + overtime;

      // Count absent - only count actual "Absent" status records
      // Stale records are automatically cleaned up when schedules are assigned
      const absent = filteredAttendances.filter(att => att.status === "Absent").length;

      // Calculate total overtime hours for today
      const totalOvertimeHours = filteredAttendances
        .filter(att => att.status === "Overtime" && att.overtime_hours)
        .reduce((total, att) => total + parseFloat(att.overtime_hours || 0), 0);

      console.log('📊 Final metrics calculated:', {
        totalClockedIn,
        present,
        absent,
        late,
        overtime,
        scheduled,
        totalOvertimeHours
      });

      setMetrics({
        totalEmployees: totalClockedIn,
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
        {/* Total Clocked In (Present + Late + Overtime) */}
        <div className="bg-primary text-white rounded-md p-6 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.totalEmployees}</p>
          <p className="text-sm mt-1">Total Clocked In</p>
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
