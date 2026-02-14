import React, { useState, useEffect } from "react";
import { updateEmployee } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";
import api from "../api/axiosConfig";
import { toast } from 'react-toastify';
import teamLeaderEventManager from "../utils/teamLeaderEvents";
import { MdClose, MdSave, MdPerson, MdEmail, MdPhone, MdBadge, MdBusiness, MdAssignmentInd, MdInfoOutline } from "react-icons/md";

export default function EditEmployeeModal({ isOpen, onClose, employee, onUpdated }) {
  const [formData, setFormData] = useState({
    employee_id: "",
    firstname: "",
    lastname: "",
    department: "",
    position: "",
    contact_number: "",
    email: "",
    status: "Active",
  });

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDepartmentsAndPositions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employee) {
      let firstname = employee.firstname || '';
      let lastname = employee.lastname || '';
      
      if (!firstname && !lastname && employee.fullname) {
        const nameParts = employee.fullname.trim().split(' ');
        firstname = nameParts[0] || '';
        lastname = nameParts.slice(1).join(' ') || '';
      }
      
      setFormData({
        employee_id: employee.employee_id || "",
        firstname,
        lastname,
        department: employee.department || "",
        position: employee.position || "",
        contact_number: employee.contact_number || "",
        email: employee.email || "",
        status: employee.status || "Active",
      });
    }
  }, [employee]);

  const loadDepartmentsAndPositions = async () => {
    try {
      setLoading(true);
      const [deptResponse, posResponse] = await Promise.all([
        fetchDepartments(),
        api.get('/positions')
      ]);
      setDepartments(deptResponse);
      setPositions(posResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setPositions([
        { id: 1, name: 'Picker' },
        { id: 2, name: 'Packer' },
        { id: 3, name: 'Inventory Clerk' },
        { id: 4, name: 'Supervisor' },
        { id: 5, name: 'Team Leader' }
      ]);
      toast.error("Using fallback data for roles.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const oldPosition = employee.position;
      const newPosition = formData.position;
      const isTeamLeaderChange = (oldPosition === "Team Leader" && newPosition !== "Team Leader") ||
                                 (oldPosition !== "Team Leader" && newPosition === "Team Leader");

      await updateEmployee(employee.id, formData);
      toast.success("Employee updated successfully!");
      
      if (isTeamLeaderChange) {
        teamLeaderEventManager.notifyTeamLeaderUpdate();
      }
      
      onUpdated();
      onClose();
    } catch (error) {
      toast.error("Failed to update employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 font-medium";
  const labelClass = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <MdPerson size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Edit Employee Profile</h3>
              <p className="text-xs text-gray-500 font-medium tracking-wide">ID: {formData.employee_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            
            {/* First Name */}
            <div>
              <label className={labelClass}>First Name</label>
              <div className="relative">
                <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="John"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className={labelClass}>Last Name</label>
              <div className="relative">
                <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="example@company.com"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className={labelClass}>Contact Number</label>
              <div className="relative">
                <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="09XXXXXXXXX"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className={labelClass}>Department</label>
              <div className="relative">
                <MdBusiness className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">{loading ? 'Loading...' : 'Select'}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className={labelClass}>Position</label>
              <div className="relative">
                <MdAssignmentInd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">{loading ? 'Loading...' : 'Select'}</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Work Status</label>
              <div className="relative">
                <MdInfoOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-8 mt-4 border-t border-gray-100 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 focus:ring-4 focus:ring-blue-100 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <MdSave size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}