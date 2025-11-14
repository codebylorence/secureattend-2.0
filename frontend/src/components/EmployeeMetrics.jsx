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

      const allAttendances = await getAttendances({ employee_id: employeeId });
      
      const recentAttendances = allAttendances.filter(att => {
        const attDate = new Date(att.date);
        return attDate >= thirtyDaysAgo;
      });

      const present = recentAttendances.filter(att => att.status === "COMPLETED").length;
      
      const late = recentAttendances.filter(att => {
        const clockIn = new Date(att.clock_in);
        return clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 0);
      }).length;

      const workingDays = 30;
      const absent = Math.max(0, workingDays - present);

      // Calculate total overtime (hours worked beyond 8 hours)
      const totalOvertime = recentAttendances.reduce((sum, att) => {
        if (att.total_hours && att.total_hours > 8) {
          return sum + (att.total_hours - 8);
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
        <div className="bg-gray-600 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.overtime.toFixed(1)} hr</p>
          <p className="text-sm mt-1">Overtime</p>
        </div>
      </div>
    </>
  );
}
