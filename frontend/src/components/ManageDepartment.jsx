import { FaEdit } from "react-icons/fa";
import { MdManageAccounts } from "react-icons/md";
import { MdDelete } from "react-icons/md";

export default function ManageDepartment() {
  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <MdManageAccounts size={20} />
            <h2 className="font-semibold text-white">Manage Department</h2>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto p-6 bg-[#F3F4F6]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#1E3A8A] text-white">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Department</th>
                <th className="py-3 px-4 text-left font-medium">Description</th>
                <th className="py-3 px-4 text-left font-medium">
                  Employee Count
                </th>
                <th className="py-3 px-4 text-left font-medium">Assigned</th>
                <th className="py-3 px-4 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b-1 bg-white">
                <td className="py-3 px-4">Zone A</td>
                <td className="py-3 px-4">Picker</td>
                <td className="py-3 px-4">20</td>
                <td className="py-3 px-4">John Doe</td>
                <td className="py-3 px-4 flex gap-2">
                  {/* Edit button */}
                  <button
                    className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-blue-700"
                  >
                    <FaEdit color="white" size="25" />
                  </button>

                  <button
                    className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-red-700"
                  >
                    <MdDelete color="white" size="25" />
                  </button>
                </td>
              </tr>
              <tr className="bg-white">
                <td className="py-3 px-4">Zone B</td>
                <td className="py-3 px-4">Receiver</td>
                <td className="py-3 px-4">10</td>
                <td className="py-3 px-4">John Doe</td>
                <td className="py-3 px-4 flex gap-2">
                  {/* Edit button */}
                  <button
                    className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-blue-700"
                  >
                    <FaEdit color="white" size="25" />
                  </button>

                  <button
                    className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-red-700"
                  >
                    <MdDelete color="white" size="25" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
