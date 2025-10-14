import EmpAction from "./EmpAction";
import { MdManageAccounts } from "react-icons/md";

export default function EmployeeList() {
  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <MdManageAccounts size={25} />
            <h2 className="font-semibold text-white">Employee Accounts</h2>
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
                <th className="py-3 px-4 text-left font-medium">Employee ID</th>
                <th className="py-3 px-4 text-left font-medium">Name</th>
                <th className="py-3 px-4 text-left font-medium">Department</th>
                <th className="py-3 px-4 text-left font-medium">Position</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
                <th className="py-3 px-4 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b-1 bg-white">
                <td className="py-3 px-4">EMP001</td>
                <td className="py-3 px-4">John Doe</td>
                <td className="py-3 px-4">Zone A</td>
                <td className="py-3 px-4">Picker</td>
                <td className="py-3 px-4">Active</td>
                <td className="py-3 px-4">
                  <EmpAction />
                </td>
              </tr>
              <tr className="bg-white">
                <td className="py-3 px-4">EMP002</td>
                <td className="py-3 px-4">John Doe</td>
                <td className="py-3 px-4">Zone A</td>
                <td className="py-3 px-4">Picker</td>
                <td className="py-3 px-4">Active</td>
                <td className="py-3 px-4">
                  <EmpAction />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
