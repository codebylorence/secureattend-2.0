import React, { useState, useEffect } from "react";
import { updateEmployee } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { toast } from 'react-toastify';
import teamLeaderEventManager from "../utils/teamLeaderEvents";

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

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDepartmentsAndPositions();
    }
  }, [isOpen]);

  // 🔁 When modal opens, populate fields with selected employee
  useEffect(() => {
    if (employee) {
      // Handle both old and new data formats
      let firstname = employee.firstname || '';
      let lastname = employee.lastname || '';
      
      // If no firstname/lastname but fullname exists, split it
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
      
      // Load departments
      const deptResponse = await fetchDepartments();
      setDepartments(deptResponse);

      // Load positions
      const posResponse = await fetch('http://localhost:5000/api/positions');
      if (posResponse.ok) {
        const posData = await posResponse.json();
        setPositions(posData);
      } else {
        // Fallback positions
        setPositions([
          { id: 1, name: 'Picker' },
          { id: 2, name: 'Packer' },
          { id: 3, name: 'Inventory Clerk' },
          { id: 4, name: 'Supervisor' },
          { id: 5, name: 'Team Leader' }
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays as fallback - let user know there was an error
      setDepartments([]);
      setPositions([
        { id: 1, name: 'Picker' },
        { id: 2, name: 'Packer' },
        { id: 3, name: 'Inventory Clerk' },
        { id: 4, name: 'Supervisor' },
        { id: 5, name: 'Team Leader' }
      ]);
      toast.error("Failed to load departments. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if position is changing to/from Team Leader
      const oldPosition = employee.position;
      const newPosition = formData.position;
      const isTeamLeaderChange = (oldPosition === "Team Leader" && newPosition !== "Team Leader") ||
                                (oldPosition !== "Team Leader" && newPosition === "Team Leader");

      await updateEmployee(employee.id, formData);
      toast.success("Employee updated successfully!");
      
      // If position changed to/from Team Leader, notify team leader update
      if (isTeamLeaderChange) {
        console.log('🔄 Position changed to/from Team Leader, notifying team leader update');
        teamLeaderEventManager.notifyTeamLeaderUpdate();
      }
      
      onUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h2 className="text-lg font-semibold mb-4 text-primary">Edit Employee</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Employee ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Employee ID</label>
            <input
              type="text"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2"
              disabled
            />
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="e.g., John"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="e.g., Doe"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loading ? 'Loading departments...' : 'Select Department'}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loading ? 'Loading positions...' : 'Select Position'}
              </option>
              {positions.map((position) => (
                <option key={position.id} value={position.name}>
                  {position.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input
              type="text"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
