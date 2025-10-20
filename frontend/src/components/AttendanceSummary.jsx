import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaClock } from "react-icons/fa";

export default function AttendanceSummary() {
  const attendanceData = [
    { name: "Present", value: 75 },
    { name: "Absent", value: 25 },
  ];

  const COLORS = ["#3B82F6", "#EF4444"];

  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Attendance Summary</h3>
        </div>
      </div>

      <div className="h-48 flex items-center justify-center">
        <ResponsiveContainer width="60%" height="80%">
          <PieChart>
            <Pie
              data={attendanceData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              dataKey="value"
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
