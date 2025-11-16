import React, { useState, useEffect } from "react";
import { addEmployee } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";

export default function AddEmployeeModal({ isOpen, onClose, onAdded }) {
  const [formData, setFormData] = useState({
    employee_id: "",
    fullname: "",
    department: "",
    position: "",
    contact_number: "",
    email: "",
    status: "Active",
  });

  const [departments, setDepartments] = useState([]);
  const positions = ["Picker", "Packer", "Inventory Clerk", "Supervisor", "Team Leader"];

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addEmployee(formData);
      onAdded(); // Refresh employee list
      onClose(); // Close modal
      alert("Employee added successfully!");
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h2 className="text-lg font-semibold mb-4 text-[#1E3A8A]">Add New Employee</h2>

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
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          {/* Department Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="">Select Position</option>
              {positions.map((pos, idx) => (
                <option key={idx} value={pos}>
                  {pos}
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
              required
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
              required
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
              className="px-4 py-2 bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
