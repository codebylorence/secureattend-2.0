import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import EmpAction from "./EmpAction";
import { MdManageAccounts } from "react-icons/md";
import { fetchEmployees, getFingerprintStatus } from "../api/EmployeeApi";

const EmployeeList = forwardRef((props, ref) => {
  const [employees, setEmployees] = useState([]);
  const [fingerprintStatus, setFingerprintStatus] = useState({});
  const [loading, setLoading] = useState(true);

  //  Fetch employees and fingerprint status from API
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [employeesData, fingerprintData] = await Promise.all([
        fetchEmployees(),
        getFingerprintStatus()
      ]);
      console.log('👥 Employees loaded:', employeesData.length);
      console.log('👆 Fingerprint status received:', fingerprintData);
      setEmployees(employeesData);
      setFingerprintStatus(fingerprintData);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  //  Allow parent components to trigger reload
  useImperativeHandle(ref, () => ({
    loadEmployees,
  }));

  //  Initial load
  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <div className="bg-white shadow rounded-md overflow-hidden">
      {/* Header */}
      <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2">
          <MdManageAccounts size={25} />
          <h2 className="font-semibold text-white">Employee Accounts</h2>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto p-6 bg-[#F3F4F6]">
        {loading ? (
          <p className="text-center text-gray-600">Loading employees...</p>
        ) : (
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
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b bg-white hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-4">{emp.employee_id}</td>
                    <td className="py-3 px-4">{emp.fullname}</td>
                    <td className="py-3 px-4">{emp.department}</td>
                    <td className="py-3 px-4">{emp.position}</td>
                    <td className="py-3 px-4">{emp.status}</td>

                    {/* ✅ Pass employee ID, fingerprint status, and refresh function */}
                    <td className="py-3 px-4">
                      <EmpAction
                        id={emp.id}
                        employee={{
                          ...emp,
                          has_fingerprint: fingerprintStatus[emp.employee_id] || false
                        }}
                        onDeleted={loadEmployees}
                        onUpdated={loadEmployees}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-4 text-gray-500 italic bg-white"
                  >
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

export default EmployeeList;
