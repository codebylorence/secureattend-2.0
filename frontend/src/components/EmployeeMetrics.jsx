import { useState, useEffect } from "react";
import { getAttendances } from "../api/AttendanceApi";

export default function EmployeeMetrics() {
  const [metrics, setMetrics] = useState({
    present: 0,
    late: 0,
    absent: 0,
    overtime: 0,
    overtimeHours: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;

      if (!employeeId) return;

      // Get last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const allAttendances = await getAttendances({ employee_id: employeeId });
      
      const recentAttendances = allAttendances.filter(att => {
        const attDate = new Date(att.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate >= thirtyDaysAgo;
      });

      // Count by status using the new status system
      const present = recentAttendances.filter(att => 
        att.status === "Present" || att.status === "COMPLETED" // Include legacy
      ).length;
      
      const late = recentAttendances.filter(att => 
        att.status === "Late"
      ).length;

      // Count absent - only count actual "Absent" status records
      // This is consistent with Admin and Team metrics
      const absent = recentAttendances.filter(att => 
        att.status === "Absent"
      ).length;

      // Count overtime status records
      const overtimeStatusCount = recentAttendances.filter(att => 
        att.status === "Overtime"
      ).length;

      // Calculate total overtime hours from both sources:
      // 1. Assigned overtime hours (from overtime_hours field)
      // 2. Hours worked beyond 8 hours per day (legacy calculation)
      const totalOvertimeHours = recentAttendances.reduce((sum, att) => {
        let overtimeForThisDay = 0;
        
        // Add assigned overtime hours if status is Overtime
        if (att.status === "Overtime" && att.overtime_hours) {
          overtimeForThisDay += parseFloat(att.overtime_hours);
        }
        
        // Add calculated overtime if worked more than 8 hours
        if (att.clock_in && att.clock_out) {
          const clockIn = new Date(att.clock_in);
          const clockOut = new Date(att.clock_out);
          const hoursWorked = (clockOut - clockIn) / (1000 * 60 * 60);
          
          // Count overtime if worked more than 8 hours (but don't double count)
          if (hoursWorked > 8 && att.status !== "Overtime") {
            overtimeForThisDay += (hoursWorked - 8);
          }
        }
        
        return sum + overtimeForThisDay;
      }, 0);

      setMetrics({
        present,
        late,
        absent,
        overtime: overtimeStatusCount,
        overtimeHours: totalOvertimeHours
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 w-full">
        {/* Present */}
        <div className="bg-emerald-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.present}</p>
          <p className="text-sm mt-1">Present (30 days)</p>
        </div>

        {/* Late */}
        <div className="bg-amber-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.late}</p>
          <p className="text-sm mt-1">Late</p>
        </div>

        {/* Absent */}
        <div className="bg-red-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.absent}</p>
          <p className="text-sm mt-1">Absent</p>
        </div>

        {/* Overtime Days */}
        <div className="bg-indigo-600 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.overtime}</p>
          <p className="text-sm mt-1">Overtime Days</p>
        </div>

        {/* Overtime Hours */}
        <div className="bg-blue-600 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.overtimeHours.toFixed(1)}</p>
          <p className="text-sm mt-1">Overtime Hours</p>
        </div>
      </div>
    </>
  );
}
