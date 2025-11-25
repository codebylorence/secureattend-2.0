import { useState, useEffect } from "react";
import { getAttendances } from "../api/AttendanceApi";

export default function EmployeeMetrics() {
  const [metrics, setMetrics] = useState({
    present: 0,
    late: 0,
    absent: 0,
    overtime: 0
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

      // Count present days (completed attendance records)
      const present = recentAttendances.filter(att => 
        att.status === "COMPLETED" && att.clock_in && att.clock_out
      ).length;
      
      // Count late arrivals (clock in after scheduled start time or default 8:00 AM)
      const late = recentAttendances.filter(att => {
        if (!att.clock_in) return false;
        const clockIn = new Date(att.clock_in);
        const hours = clockIn.getHours();
        const minutes = clockIn.getMinutes();
        // Consider late if after 8:15 AM (15 min grace period)
        return hours > 8 || (hours === 8 && minutes > 15);
      }).length;

      // Calculate working days (excluding weekends)
      let workingDays = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Count Monday to Friday as working days
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
      }
      
      const absent = Math.max(0, workingDays - present);

      // Calculate total overtime (hours worked beyond 8 hours per day)
      const totalOvertime = recentAttendances.reduce((sum, att) => {
        if (att.clock_in && att.clock_out) {
          const clockIn = new Date(att.clock_in);
          const clockOut = new Date(att.clock_out);
          const hoursWorked = (clockOut - clockIn) / (1000 * 60 * 60);
          
          // Count overtime if worked more than 8 hours
          if (hoursWorked > 8) {
            return sum + (hoursWorked - 8);
          }
        }
        return sum;
      }, 0);

      setMetrics({
        present,
        late,
        absent,
        overtime: totalOvertime
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 w-full">
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

        {/* Overtime */}
        <div className="bg-blue-600 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.overtime.toFixed(1)} hr</p>
          <p className="text-sm mt-1">Overtime</p>
        </div>
      </div>
    </>
  );
}
