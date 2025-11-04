import { FaClock } from "react-icons/fa6";

export default function TeamTodaysAttend() {
  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20} />
            <h2 className="font-semibold text-white">Today's Attendance</h2>
          </div>

          <div className="flex items-center text-sm">
            <span className="mr-2">Show</span>
            <input
              type="number"
              min="1"
              defaultValue="1"
              className="w-12 text-center border border-gray-300 rounded-md text-black bg-white"
            />
            <span className="ml-2">Entries</span>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto p-6 bg-[#F3F4F6]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#1E3A8A] text-white">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Employee</th>
                <th className="py-3 px-4 text-left font-medium">Clock In</th>
                <th className="py-3 px-4 text-left font-medium">Clock Out</th>
                <th className="py-3 px-4 text-left font-medium">Hour Worked</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b-1 bg-white">
                <td className="py-3 px-4">John Doe</td>
                <td className="py-3 px-4">9:01 AM</td>
                <td className="py-3 px-4">6:01 PM</td>
                <td className="py-3 px-4">8 hrs</td>
                <td className="py-3 px-4 text-green-600 font-medium">
                  On Time
                </td>
              </tr>
              <tr className="bg-white">
                <td className="py-3 px-4">John Doe</td>
                <td className="py-3 px-4">9:05 AM</td>
                <td className="py-3 px-4">6:05 PM</td>
                <td className="py-3 px-4">6 hrs</td>
                <td className="py-3 px-4 text-green-600 font-medium">
                  On Time
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
