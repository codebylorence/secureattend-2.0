import { useState, useEffect } from "react";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdManageAccounts, MdDelete, MdClose } from "react-icons/md";
import { fetchDepartments, deleteDepartment, updateDepartment } from "../api/DepartmentApi";
import { fetchTeamLeaders } from "../api/UserApi";
import axios from "axios";

export default function ManageDepartment() {
  const [departments, setDepartments] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", manager: "" });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentMembers, setDepartmentMembers] = useState([]);

  useEffect(() => {
    loadDepartments();
    loadTeamLeaders();
  }, []);

  const loadTeamLeaders = async () => {
    try {
      const data = await fetchTeamLeaders();
      setTeamLeaders(data);
    } catch (error) {
      console.error("Error loading team leaders:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
      alert("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    setEditForm({
      name: dept.name,
      description: dept.description || "",
      manager: dept.manager || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "", manager: "" });
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateDepartment(id, editForm);
      setEditingId(null);
      setEditForm({ name: "", description: "", manager: "" });
      loadDepartments();
    } catch (error) {
      console.error("Error updating department:", error);
      alert(error.response?.data?.error || "Failed to update department");
    }
  };

  const handleDelete = async (id, name, employeeCount) => {
    if (employeeCount > 0) {
      alert(`Cannot delete ${name}. ${employeeCount} employee(s) are assigned to this department.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDepartment(id);
        loadDepartments();
      } catch (error) {
        console.error("Error deleting department:", error);
        alert(error.response?.data?.error || "Failed to delete department");
      }
    }
  };

  const handleViewMembers = async (dept) => {
    setSelectedDepartment(dept);
    setViewModalOpen(true);
    
    try {
      const response = await axios.get(`http://localhost:5000/employees`);
      const allEmployees = response.data;
      
      // Filter employees by department
      const members = allEmployees.filter(emp => emp.department === dept.name);
      setDepartmentMembers(members);
    } catch (error) {
      console.error("Error loading department members:", error);
      setDepartmentMembers([]);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedDepartment(null);
    setDepartmentMembers([]);
  };

  return (
    <>
      {/* View Members Modal */}
      {viewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1E3A8A] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {selectedDepartment?.name} - Members
              </h3>
              <button
                onClick={closeViewModal}
                className="hover:bg-blue-700 rounded-full p-1"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Department Info */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-semibold">{selectedDepartment?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Team Leader</p>
                    <p className="font-semibold">{selectedDepartment?.manager || "Not Assigned"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="font-semibold">{departmentMembers.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-semibold">{selectedDepartment?.description || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium text-gray-700">Employee ID</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-700">Name</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-700">Position</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-700">Email</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {departmentMembers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                          No members in this department
                        </td>
                      </tr>
                    ) : (
                      departmentMembers.map((member) => {
                        const isTeamLeader = member.fullname === selectedDepartment?.manager;
                        return (
                          <tr 
                            key={member.id} 
                            className={`border-b ${
                              isTeamLeader 
                                ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-600' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="py-3 px-4">{member.employee_id}</td>
                            <td className="py-3 px-4 font-medium">{member.fullname}</td>
                            <td className="py-3 px-4">{member.position}</td>
                            <td className="py-3 px-4">{member.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                member.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={closeViewModal}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-md overflow-hidden">
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <MdManageAccounts size={20} />
            <h2 className="font-semibold text-white">Manage Department</h2>
          </div>
        </div>

        <div className="overflow-x-auto p-6 bg-[#F3F4F6]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#1E3A8A] text-white">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Department</th>
                <th className="py-3 px-4 text-left font-medium">Description</th>
                <th className="py-3 px-4 text-left font-medium">Employee Count</th>
                <th className="py-3 px-4 text-left font-medium">Manager</th>
                <th className="py-3 px-4 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center">Loading...</td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center">No departments found</td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="border-b-1 bg-white">
                    <td className="py-3 px-4">
                      {editingId === dept.id ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="border rounded px-2 py-1 w-full"
                        />
                      ) : (
                        dept.name
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === dept.id ? (
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="border rounded px-2 py-1 w-full"
                        />
                      ) : (
                        dept.description || "-"
                      )}
                    </td>
                    <td className="py-3 px-4">{dept.employeeCount}</td>
                    <td className="py-3 px-4">
                      {editingId === dept.id ? (
                        <select
                          value={editForm.manager}
                          onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                          className="border rounded px-2 py-1 w-full"
                        >
                          <option value="">No Manager</option>
                          {teamLeaders.length === 0 ? (
                            <option disabled>No team leaders available</option>
                          ) : (
                            teamLeaders.map((leader) => (
                              <option key={leader.id} value={leader.employee?.fullname || leader.username}>
                                {leader.employee?.fullname || leader.username} 
                                {leader.employee?.employee_id && ` (${leader.employee.employee_id})`}
                                {leader.employee?.department && leader.employee.department !== dept.name && ` - ${leader.employee.department}`}
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        dept.manager || "-"
                      )}
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      {editingId === dept.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(dept.id)}
                            className="bg-green-600 px-3 py-1 text-white rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-600 px-3 py-1 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleViewMembers(dept)}
                            className="bg-[#10b981] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-green-700"
                            title="View Members"
                          >
                            <FaEye color="white" size="20" />
                          </button>
                          <button
                            onClick={() => handleEdit(dept)}
                            className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-blue-700"
                            title="Edit"
                          >
                            <FaEdit color="white" size="20" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id, dept.name, dept.employeeCount)}
                            className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <MdDelete color="white" size="25" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
