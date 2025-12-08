import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaClock } from "react-icons/fa";
import { getAttendances } from "../api/AttendanceApi";

export default function AttendanceSummary() {
  const [attendanceData, setAttendanceData] = useState([
    { name: "Present", value: 0 },
    { name: "Late", value: 0 },
  ]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, []);

  const fetchAttendanceSummary = async () => {
    try {
      // Get current user's employee_id from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;

      if (!employeeId) return;

      // Get employee's attendances
      const allAttendances = await getAttendances({ employee_id: employeeId });
      
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter for today's attendances only
      const todayAttendances = allAttendances.filter(att => {
        const attDate = new Date(att.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime();
      });

      // Count by actual status from database
      const present = todayAttendances.filter(att => 
        att.status === "Present" || att.status === "COMPLETED" // Include legacy
      ).length;
      
      const late = todayAttendances.filter(att => 
        att.status === "Late"
      ).length;

      setAttendanceData([
        { name: "Present", value: present },
        { name: "Late", value: late },
      ]);
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
    }
  };

  const COLORS = ["#10B981", "#F59E0B"]; // Green for Present, Amber for Late

  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Today's Attendance Summary</h3>
        </div>
      </div>

      <div className="h-48 flex items-center justify-center">
        {attendanceData.every(item => item.value === 0) ? (
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No attendance recorded today</p>
            <p className="text-sm mt-1">Clock in to see your attendance summary</p>
          </div>
        ) : (
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
                {attendanceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
