import React, { useState, useEffect } from "react";
import { 
  MdWarning, MdInfo, MdClose, MdPerson, MdEmail, 
  MdPhone, MdBadge, MdBusiness, MdAssignmentInd, 
  MdLock, MdSave, MdAccountCircle 
} from "react-icons/md";
import { addEmployee, fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { toast } from 'react-toastify';
import teamLeaderEventManager from "../utils/teamLeaderEvents";
import api from "../api/axiosConfig";

export default function AddEmployeeModal({ isOpen, onClose, onAdded }) {
  const [formData, setFormData] = useState({
    employee_id: "TSI",
    firstname: "",
    lastname: "",
    department: "No Department",
    position: "",
    contact_number: "",
    email: "",
    username: "",
    password: "",
  });

  const [allDepartments, setAllDepartments] = useState([]);
  const [departmentsWithTeamLeader, setDepartmentsWithTeamLeader] = useState([]);
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      loadPositions();
      setFormData({
        employee_id: "TSI",
        firstname: "",
        lastname: "",
        department: "No Department",
        position: "",
        contact_number: "",
        email: "",
        username: "",
        password: "",
      });
      setError("");
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const [depts, allEmployees] = await Promise.all([
        fetchDepartments(),
        fetchEmployees()
      ]);
      setAllDepartments(depts);
      const deptsWithLeader = allEmployees
        .filter(emp => emp.position === "Team Leader")
        .map(emp => emp.department);
      setDepartmentsWithTeamLeader(deptsWithLeader);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const loadPositions = async () => {
    try {
      setPositionsLoading(true);
      const response = await api.get('/positions');
      setPositions(response.data);
    } catch (error) {
      setPositions([
        { id: 1, name: 'Picker' }, { id: 2, name: 'Packer' },
        { id: 3, name: 'Inventory Clerk' }, { id: 4, name: 'Supervisor' },
        { id: 5, name: 'Team Leader' }
      ]);
    } finally {
      setPositionsLoading(false);
    }
  };

  const getAvailableDepartments = () => {
    if (isTeamLeaderPosition(formData.position)) {
      return allDepartments.filter(dept => !departmentsWithTeamLeader.includes(dept.name));
    }
    return allDepartments;
  };

  const isTeamLeaderPosition = (positionName) => {
    return positionName.toLowerCase().includes('team leader') || 
           positionName.toLowerCase().includes('teamleader');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'employee_id') {
      let formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (!formattedValue.startsWith('TSI')) {
        formattedValue = formattedValue.length <= 3 ? 'TSI' : 'TSI' + formattedValue.substring(3);
      }
      if (formattedValue.length > 8) formattedValue = formattedValue.substring(0, 8);
      setFormData({ ...formData, [name]: formattedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const employeeIdPattern = /^TSI\d{5}$/;
      if (!employeeIdPattern.test(formData.employee_id)) throw new Error("Employee ID must be TSI followed by 5 digits");
      if (formData.password.length < 6) throw new Error("Password must be at least 6 characters");
      
      const isTeamLeader = formData.position === "Team Leader";
      await addEmployee({ ...formData, status: "Active" });
      
      if (isTeamLeader) teamLeaderEventManager.notifyTeamLeaderUpdate();
      onAdded();
      onClose();
      toast.success("Employee and user account created successfully!");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to add employee";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 font-medium";
  const labelClass = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto transform transition-all">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <MdAccountCircle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Onboard New Employee</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full transition-colors"><MdClose size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <MdWarning size={18} /> {error}
            </div>
          )}

          {/* SECTION: Personal Information */}
          <div className="mb-6">
            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="h-px w-4 bg-blue-600"></div> Personal Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Employee ID</label>
                <div className="relative">
                  <MdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} required className={inputClass} placeholder="TSI00000" maxLength={8} />
                </div>
              </div>
              <div className="hidden md:block"></div> {/* Spacer */}
              <div>
                <label className={labelClass}>First Name</label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} required className={inputClass} placeholder="First name" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} required className={inputClass} placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="email@company.com" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact Number</label>
                <div className="relative">
                  <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} required className={inputClass} placeholder="09XXXXXXXXX" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Assignment */}
          <div className="mb-6">
            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="h-px w-4 bg-blue-600"></div> Work Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Position</label>
                <div className="relative">
                  <MdAssignmentInd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select name="position" value={formData.position} onChange={handleChange} required className={`${inputClass} appearance-none`}>
                    <option value="">Select Position</option>
                    {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <div className="relative">
                  <MdBusiness className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select name="department" value={formData.department} onChange={handleChange} className={`${inputClass} appearance-none`}>
                    <option value="No Department">No Department</option>
                    {getAvailableDepartments().map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                {isTeamLeaderPosition(formData.position) && (
                  <p className="text-[10px] font-medium text-amber-600 mt-1.5 flex items-center gap-1">
                    <MdInfo size={12} /> Showing available team leader slots
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: Account Credentials */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Account Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Username</label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required className={inputClass} placeholder="Login username" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Initial Password</label>
                <div className="relative">
                  <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required className={inputClass} placeholder="Min. 6 characters" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-8 mt-4 border-t border-gray-100 sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none px-6 py-2.5 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Processing</> : <><MdSave size={18} /> Save Employee</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}