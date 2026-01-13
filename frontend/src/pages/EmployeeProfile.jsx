import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaBriefcase, FaBuilding, FaUserTag, FaArrowLeft } from "react-icons/fa";
import { getEmployeeById } from "../api/EmployeeApi";
import { toast } from 'react-toastify';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const employeeData = await getEmployeeById(employeeId);
      setEmployee(employeeData);
    } catch (error) {
      console.error("Error fetching employee data:", error);
      toast.error("Failed to load employee profile");
      navigate(-1); // Go back if employee not found
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pr-10 bg-gray-50 min-h-screen pb-10">
        <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-primary-50 transition-colors"
              title="Go Back"
            >
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-heading text-[21px] font-semibold">Employee Profile</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employee profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="pr-10 bg-gray-50 min-h-screen pb-10">
        <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-primary-50 transition-colors"
              title="Go Back"
            >
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-heading text-[21px] font-semibold">Employee Profile</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">Employee not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-primary-50 transition-colors"
            title="Go Back"
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 className="text-heading text-[21px] font-semibold">Employee Profile</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-gradient-primary rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Photo */}
            <div className="relative flex-shrink-0">
              {employee.photo ? (
                <img
                  src={employee.photo}
                  alt="Profile"
                  className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg">
                  <FaUser size={80} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-2">
                {employee.firstname && employee.lastname 
                  ? `${employee.firstname} ${employee.lastname}`
                  : employee.fullname || "Employee Name"}
              </h2>
              <p className="text-blue-100 text-lg mb-1">
                {employee.position || "Position"}
              </p>
              <p className="text-blue-200 mb-4">
                {employee.department || "Department"}
              </p>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-medium">ID: {employee.employee_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b-2 border-blue-100">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FaIdCard className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                  <p className="text-gray-900 font-medium">{employee.employee_id || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaUser className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Full Name</p>
                  <p className="text-gray-900 font-medium">
                    {employee.firstname && employee.lastname 
                      ? `${employee.firstname} ${employee.lastname}`
                      : employee.fullname || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaEnvelope className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email Address</p>
                  <p className="text-gray-900 font-medium break-all">{employee.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaPhone className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                  <p className="text-gray-900 font-medium">{employee.contact_number || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b-2 border-blue-100">
              Work Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FaBuilding className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-gray-900 font-medium">{employee.department || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaBriefcase className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Position</p>
                  <p className="text-gray-900 font-medium">{employee.position || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaUserTag className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <p className="text-gray-900 font-medium capitalize">{employee.role || "employee"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full mt-1 flex-shrink-0" 
                     style={{ backgroundColor: employee.status === "Active" ? "#10B981" : "#EF4444" }}>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className={`font-medium ${employee.status === "Active" ? "text-green-600" : "text-red-600"}`}>
                    {employee.status || "N/A"}
                  </p>
                </div>
              </div>

              {employee.hire_date && (
                <div className="flex items-start gap-3">
                  <FaIdCard className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Hire Date</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(employee.hire_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}