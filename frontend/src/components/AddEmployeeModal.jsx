import React, { useState, useEffect } from "react";
import { MdWarning, MdInfo } from "react-icons/md";
import { addEmployee, fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { toast } from 'react-toastify';
import teamLeaderEventManager from "../utils/teamLeaderEvents";

export default function AddEmployeeModal({ isOpen, onClose, onAdded }) {
  const [formData, setFormData] = useState({
    employee_id: "",
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
      // Reset form when modal opens
      setFormData({
        employee_id: "",
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

  const loadPositions = async () => {
    try {
      setPositionsLoading(true);
      const response = await fetch('http://localhost:5000/api/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      } else {
        console.error('Failed to fetch positions');
        // Fallback to default positions if API fails
        setPositions([
          { id: 1, name: 'Picker' },
          { id: 2, name: 'Packer' },
          { id: 3, name: 'Inventory Clerk' },
          { id: 4, name: 'Supervisor' },
          { id: 5, name: 'Team Leader' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      // Fallback to default positions if network fails
      setPositions([
        { id: 1, name: 'Picker' },
        { id: 2, name: 'Packer' },
        { id: 3, name: 'Inventory Clerk' },
        { id: 4, name: 'Supervisor' },
        { id: 5, name: 'Team Leader' }
      ]);
    } finally {
      setPositionsLoading(false);
    }
  };

  // Get filtered departments based on selected position
  const getAvailableDepartments = () => {
    if (isTeamLeaderPosition(formData.position)) {
      // Only show departments without team leaders
      return allDepartments.filter(
        dept => !departmentsWithTeamLeader.includes(dept.name)
      );
    }
    // Show all departments for other positions
    return allDepartments;
  };

  // Check if position is Team Leader
  const isTeamLeaderPosition = (positionName) => {
    return positionName.toLowerCase().includes('team leader') || 
           positionName.toLowerCase().includes('teamleader');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Validate password length
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      
      // Check if the new employee is a Team Leader
      const isTeamLeader = formData.position === "Team Leader";
      
      // Send employee data including username and password to backend
      const employeeData = {
        ...formData,
        status: "Active" // Default status
      };
      
      await addEmployee(employeeData);
      
      // If a team leader was added, notify team leader update
      if (isTeamLeader) {
        console.log('🔄 New Team Leader added, notifying team leader update');
        teamLeaderEventManager.notifyTeamLeaderUpdate();
      }
      
      onAdded(); // Refresh employee list
      onClose(); // Close modal
      toast.success("Employee and user account created successfully!");
    } catch (error) {
      console.error("Error adding employee:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add employee";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-[#1E3A8A]">Add New Employee</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

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
              disabled={positionsLoading}
              className="w-full border border-gray-300 rounded-md p-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {positionsLoading ? 'Loading positions...' : 'Select Position'}
              </option>
              {positions.map((position) => (
                <option key={position.id} value={position.name}>
                  {position.name}
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
            {isTeamLeaderPosition(formData.position) && getAvailableDepartments().length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <MdWarning size={14} /> All departments already have team leaders assigned
              </p>
            )}
            {isTeamLeaderPosition(formData.position) && getAvailableDepartments().length > 0 && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <MdInfo size={14} /> Only showing departments without team leaders
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

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Login username"
            />
            <p className="text-xs text-gray-500 mt-1">This will be used to log into the system</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Minimum 6 characters"
            />
            <p className="text-xs text-gray-500 mt-1">Employee will use this password to log in</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
