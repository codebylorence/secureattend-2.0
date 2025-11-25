import { useState, useEffect } from "react";
import { fetchEmployees } from "../api/EmployeeApi";
import { getTodayAttendances } from "../api/AttendanceApi";

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [employees, todayAttendances] = await Promise.all([
        fetchEmployees(),
        getTodayAttendances()
      ]);

      // Count total active employees
      const totalEmployees = employees.filter(emp => emp.status === "Active").length;

      // Count present (employees who clocked in today)
      const present = todayAttendances.filter(att => att.clock_in).length;

      // Count absent (total employees minus present)
      const absent = totalEmployees - present;

      // Count late (clocked in after 8:15 AM)
      const late = todayAttendances.filter(att => {
        if (!att.clock_in) return false;
        const clockIn = new Date(att.clock_in);
        const hours = clockIn.getHours();
        const minutes = clockIn.getMinutes();
        return hours > 8 || (hours === 8 && minutes > 15);
      }).length;

      setMetrics({
        totalEmployees,
        present,
        absent,
        late
      });
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 w-full">
        {/* Total Employees */}
        <div className="bg-blue-600 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.totalEmployees}</p>
          <p className="text-sm mt-1">Total Employees</p>
        </div>

        {/* Present */}
        <div className="bg-emerald-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.present}</p>
          <p className="text-sm mt-1">Present</p>
        </div>

        {/* Absent */}
        <div className="bg-red-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.absent}</p>
          <p className="text-sm mt-1">Absent</p>
        </div>

        {/* Late */}
        <div className="bg-amber-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">{metrics.late}</p>
          <p className="text-sm mt-1">Late</p>
        </div>
      </div>
    </>
  );
}
