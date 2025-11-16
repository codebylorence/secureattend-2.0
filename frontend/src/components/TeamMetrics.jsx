import { useState, useEffect } from "react";
import { getTodayAttendances } from "../api/AttendanceApi";
import { fetchEmployees } from "../api/EmployeeApi";

export default function TeamMetrics({ department }) {
  const [metrics, setMetrics] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    if (department) {
      fetchMetrics();
    }
  }, [department]);

  const fetchMetrics = async () => {
    try {
      const [attendanceData, employeeData] = await Promise.all([
        getTodayAttendances(),
        fetchEmployees()
      ]);

      // Filter employees by department (exclude team leaders from count)
      const departmentEmployees = employeeData.filter(emp => 
        emp.department === department && 
        emp.status === "Active" &&
        emp.position !== "Team Leader"
      );
      const departmentEmployeeIds = new Set(departmentEmployees.map(emp => emp.employee_id));

      // Filter attendances for this department
      const departmentAttendances = attendanceData.filter(att => 
        departmentEmployeeIds.has(att.employee_id)
      );

      const present = departmentAttendances.filter(att => att.clock_in).length;
      const absent = departmentEmployees.length - present;
      
      // Count late (clock in after 8:15 AM - 15 min grace period)
      const late = departmentAttendances.filter(att => {
        if (!att.clock_in) return false;
        const clockIn = new Date(att.clock_in);
        const hours = clockIn.getHours();
        const minutes = clockIn.getMinutes();
        // Consider late if after 8:15 AM
        return hours > 8 || (hours === 8 && minutes > 15);
      }).length;

      setMetrics({ present, absent, late });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">

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
