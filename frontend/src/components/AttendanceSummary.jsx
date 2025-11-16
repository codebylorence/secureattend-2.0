import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { FaClock } from "react-icons/fa";
import { getAttendances } from "../api/AttendanceApi";

export default function AttendanceSummary() {
  const [attendanceData, setAttendanceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
  ]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, []);

  const fetchAttendanceSummary = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;

      if (!employeeId) return;

      // Get last 30 days of attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const allAttendances = await getAttendances({ employee_id: employeeId });
      
      // Count completed attendances in last 30 days
      const recentAttendances = allAttendances.filter(att => {
        const attDate = new Date(att.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate >= thirtyDaysAgo && att.status === "COMPLETED" && att.clock_in && att.clock_out;
      });

      const present = recentAttendances.length;
      
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

      setAttendanceData([
        { name: "Present", value: present },
        { name: "Absent", value: absent },
      ]);
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
    }
  };

  const COLORS = ["#3B82F6", "#EF4444"];

  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Attendance Summary (Last 30 Days)</h3>
        </div>
      </div>

      <div className="h-48 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={attendanceData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {attendanceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
