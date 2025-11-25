import React, { useState, useEffect } from "react";
import { addEmployee, fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";

export default function AddEmployeeModal({ isOpen, onClose, onAdded }) {
  const [formData, setFormData] = useState({
    employee_id: "",
    firstname: "",
    lastname: "",
    department: "No Department",
    position: "",
    contact_number: "",
    email: "",
  });

  const [allDepartments, setAllDepartments] = useState([]);
  const [departmentsWithTeamLeader, setDepartmentsWithTeamLeader] = useState([]);
  const positions = ["Picker", "Packer", "Inventory Clerk", "Supervisor", "Team Leader"];

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const [depts, allEmployees] = await Promise.all([
        fetchDepartments(),
        fetchEmployees()
      ]);

      // Store all departments
      setAllDepartments(depts);

      // Find departments that already have a team leader
      const deptsWithLeader = allEmployees
        .filter(emp => emp.position === "Team Leader")
        .map(emp => emp.department);

      setDepartmentsWithTeamLeader(deptsWithLeader);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  // Get filtered departments based on selected position
  const getAvailableDepartments = () => {
    if (formData.position === "Team Leader") {
      // Only show departments without team leaders
      return allDepartments.filter(
        dept => !departmentsWithTeamLeader.includes(dept.name)
      );
    }
    // Show all departments for other positions
    return allDepartments;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Combine firstname and lastname into fullname for backend
      const employeeData = {
        ...formData,
        fullname: `${formData.firstname} ${formData.lastname}`.trim(),
        status: "Active" // Default status
      };
      
      await addEmployee(employeeData);
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

          {/* Position Dropdown - Moved before Department */}
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

          {/* Department Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="No Department">No Department</option>
              {getAvailableDepartments().map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                  {formData.position === "Team Leader" && " (Available)"}
                </option>
              ))}
            </select>
            {formData.position === "Team Leader" && getAvailableDepartments().length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ All departments already have team leaders assigned
              </p>
            )}
            {formData.position === "Team Leader" && getAvailableDepartments().length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                ℹ️ Only showing departments without team leaders
              </p>
            )}
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
              placeholder="e.g., john.doe@example.com"
            />
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
