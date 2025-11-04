import {MdViewList } from "react-icons/md";
import { useState } from "react";

export default function ViewSched() {
  const [assignments, setAssignments] = useState([
    { employee: "John Doe", shift: "Morning Shift", date: "Nov 5, 2025" },
    { employee: "Jane Smith", shift: "Night Shift", date: "Nov 5, 2025" },
  ]);
  return (
    <div className="bg-[#F3F4F6] rounded-lg shadow-md p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
        <MdViewList /> View Assigned Schedules
      </h2>
      <table className="w-full text-sm text-gray-600 bg-white">
        <thead className="bg-[#1E3A8A] text-white">
          <tr>
            <th className="py-3 px-4 font-medium text-left">Employee</th>
            <th className="py-3 px-4 font-medium text-left">Shift</th>
            <th className="py-3 px-4 font-medium text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a, index) => (
            <tr
              key={index}
              className="border-b-1 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4 text-left font-medium">{a.employee}</td>
              <td className="py-3 px-4 text-left font-medium">{a.shift}</td>
              <td className="py-3 px-4 text-left font-medium">{a.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
