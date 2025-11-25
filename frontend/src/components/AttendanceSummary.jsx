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
      // Get all attendances from database (not just for one employee)
      const allAttendances = await getAttendances();
      
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter for today's attendances only
      const todayAttendances = allAttendances.filter(att => {
        const attDate = new Date(att.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime();
      });

      // Count employees who clocked in today
      const present = todayAttendances.filter(att => att.clock_in).length;
      
      // Count late arrivals (after 8:15 AM)
      const late = todayAttendances.filter(att => {
        if (!att.clock_in) return false;
        const clockIn = new Date(att.clock_in);
        const hours = clockIn.getHours();
        const minutes = clockIn.getMinutes();
        return hours > 8 || (hours === 8 && minutes > 15);
      }).length;

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
