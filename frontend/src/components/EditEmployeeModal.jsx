import React, { useState, useEffect } from "react";
import { updateEmployee } from "../api/EmployeeApi";

export default function EditEmployeeModal({ isOpen, onClose, employee, onUpdated }) {
  const [formData, setFormData] = useState({
    employee_id: "",
    fullname: "",
    department: "",
    position: "",
    contact_number: "",
    email: "",
    status: "Active",
  });

  // 🔁 When modal opens, populate fields with selected employee
  useEffect(() => {
    if (employee) {
      setFormData({
        employee_id: employee.employee_id || "",
        fullname: employee.fullname || "",
        department: employee.department || "",
        position: employee.position || "",
        contact_number: employee.contact_number || "",
        email: employee.email || "",
        status: employee.status || "Active",
      });
    }
  }, [employee]);

  const departments = ["Zone A", "Zone B", "Zone C", "Warehouse Admin", "HR Department"];
  const positions = ["Picker", "Packer", "Inventory Clerk", "Supervisor", "Team Leader"];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateEmployee(employee.id, formData);
      alert("Employee updated successfully!");
      onUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h2 className="text-lg font-semibold mb-4 text-[#1E3A8A]">Edit Employee</h2>

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

          {/* Department */}
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
                <option key={dept} value={dept}>
                  {dept}
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
              className="w-full border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="">Select Position</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
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
              className="px-4 py-2 bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
