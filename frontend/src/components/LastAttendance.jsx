import { FaClock } from "react-icons/fa6";

export default function LastAttendance() {
  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20}/> 
            <h2 className="font-semibold text-white">Last Attendance</h2>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto p-6 bg-[#F3F4F6]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#1E3A8A] text-white">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Date</th>
                <th className="py-3 px-4 text-left font-medium">Clock In</th>
                <th className="py-3 px-4 text-left font-medium">Clock Out</th>
                <th className="py-3 px-4 text-left font-medium">Hour Worked</th>
                <th className="py-3 px-4 text-left font-medium">Shift</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b-1 bg-white">
                <td className="py-3 px-4">Sept. 18, 2025</td>
                <td className="py-3 px-4">9:01 AM</td>
                <td className="py-3 px-4">6:01 PM</td>
                <td className="py-3 px-4">8 hrs</td>
                <td className="py-3 px-4">Opening</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
