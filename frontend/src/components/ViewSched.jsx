import {MdViewList } from "react-icons/md";
import { useState } from "react";

export default function ViewSched() {
  const [assignments, setAssignments] = useState([
    { employee: "John Doe", shift: "Morning Shift", date: "Nov 5, 2025" },
    { employee: "Jane Smith", shift: "Night Shift", date: "Nov 5, 2025" },
  ]);
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assignments.map((a, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.employee}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.shift}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
