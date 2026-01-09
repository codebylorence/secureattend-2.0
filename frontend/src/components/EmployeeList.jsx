import {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import EmpAction from "./EmpAction";
import { MdManageAccounts } from "react-icons/md";
import { fetchEmployees, getFingerprintStatus } from "../api/EmployeeApi";

const EmployeeList = forwardRef(({ supervisorView = false }, ref) => {
  const [employees, setEmployees] = useState([]);
  const [fingerprintStatus, setFingerprintStatus] = useState({});
  const [loading, setLoading] = useState(true);

  //  Fetch employees and fingerprint status from API
  const loadEmployees = async () => {
    try {
      // Check if user is authenticated before making requests
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('👥 EmployeeList: No token found, skipping employee fetch');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log('🔄 Loading employees...');
      
      const [employeesData, fingerprintData] = await Promise.all([
        fetchEmployees(),
        getFingerprintStatus()
      ]);
      
      console.log('📊 Raw employees data:', employeesData);
      console.log('👆 Raw fingerprint data:', fingerprintData);
      
      let filteredEmployees = employeesData;
      
      // For supervisor view, show all employees but still filter out inactive ones
      if (supervisorView) {
        filteredEmployees = employeesData.filter(emp => 
          emp.status === "Active"
        );
        console.log('👥 Filtered employees for supervisor:', filteredEmployees.length);
      }
      
      console.log('✅ Final employees to display:', filteredEmployees.length);
      setEmployees(filteredEmployees);
      setFingerprintStatus(fingerprintData);
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      console.error("Error details:", error.response?.data || error.message);
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
    <div className="bg-white rounded-lg shadow overflow-hidden">

      {/* Header Bar */}
      <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2">
          <MdManageAccounts size={20} />
          <h2 className="font-semibold text-white">Employee Accounts ({employees.length})</h2>
        </div>
      </div>

      {loading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <MdManageAccounts className="text-4xl mx-auto mb-4 text-gray-300" />
          <p>{supervisorView ? "No active employees found" : "No employees found"}</p>
          <p className="text-sm mt-2">
            {supervisorView 
              ? "All active employees will appear here." 
              : "Click 'Add Employee' to create the first employee record."
            }
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {!supervisorView && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {emp.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {(() => {
                        // Try firstname + lastname first
                        if (emp.firstname && emp.lastname) {
                          return `${emp.firstname} ${emp.lastname}`;
                        }
                        // Try fullname
                        if (emp.fullname && emp.fullname.trim()) {
                          return emp.fullname;
                        }
                        // Try just firstname if lastname is missing
                        if (emp.firstname && emp.firstname.trim()) {
                          return emp.firstname;
                        }
                        // Fallback
                        return `Employee ${emp.employee_id}`;
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {emp.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {emp.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${emp.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {emp.status}
                    </span>
                  </td>
                  {!supervisorView && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default EmployeeList;
