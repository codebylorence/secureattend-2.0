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
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full font-sans">
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm font-medium text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="w-full font-sans">
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
    <div className="w-full font-sans pt-15 sm:pt-10">

      {/* PRESERVED HEADER */}
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

      <div className="max-w-4xl mx-auto pb-8">

        {/* Profile Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            {/* Profile Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white/20 shadow-2xl p-1 bg-white/10 backdrop-blur-sm">
                {employee.photo ? (
                  <img
                    src={employee.photo}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                    <FaUser size={50} className="text-white/70" />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left pt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight">
                {employee.firstname && employee.lastname
                  ? `${employee.firstname} ${employee.lastname}`
                  : "Employee Name"}
              </h2>
              <p className="text-blue-100 text-sm sm:text-base font-medium mb-1">
                {employee.position || "Position"}
              </p>
              <p className="text-blue-200/80 text-xs sm:text-sm mb-4 flex items-center justify-center md:justify-start gap-2">
                <FaBuilding className="text-blue-300/70" />
                {employee.department || "Department"}
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-white text-xs font-semibold uppercase tracking-wider">{employee.role || "employee"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <FaUser className="text-blue-500" />
              Personal Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaIdCard size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Employee ID</p>
                  <p className="text-sm text-gray-900 font-semibold">{employee.employee_id || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaEnvelope size={18} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Email Address</p>
                  <p className="text-sm text-gray-900 font-medium truncate">{employee.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaPhone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Contact Number</p>
                  <p className="text-sm text-gray-900 font-medium">{employee.contact_number || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <FaBriefcase className="text-blue-500" />
              Work Info
            </h3>
            <div className="space-y-4">

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaBuilding size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Department</p>
                  <p className="text-sm text-gray-900 font-medium">{employee.department || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaBriefcase size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Position</p>
                  <p className="text-sm text-gray-900 font-medium">{employee.position || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaUserTag size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">System Role</p>
                  <p className="text-sm text-gray-900 font-medium capitalize">{employee.role || "employee"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${employee.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  <div className="w-4 h-4 rounded-full border-2 border-current bg-current opacity-80"></div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Account Status</p>
                  <p className={`text-sm font-bold uppercase tracking-wider ${employee.status === "Active" ? "text-emerald-600" : "text-rose-600"}`}>
                    {employee.status || "N/A"}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}