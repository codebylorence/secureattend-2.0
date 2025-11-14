import { useState, useEffect } from "react";
import { FaEdit } from "react-icons/fa";
import { MdManageAccounts, MdDelete } from "react-icons/md";
import { fetchDepartments, deleteDepartment, updateDepartment } from "../api/DepartmentApi";
import { fetchTeamLeaders } from "../api/UserApi";

export default function ManageDepartment() {
  const [departments, setDepartments] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", manager: "" });

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

  return (
    <>
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
                          {teamLeaders.map((leader) => (
                            <option key={leader.id} value={leader.employee?.fullname || leader.username}>
                              {leader.employee?.fullname || leader.username}
                            </option>
                          ))}
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
                            onClick={() => handleEdit(dept)}
                            className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-blue-700"
                          >
                            <FaEdit color="white" size="25" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id, dept.name, dept.employeeCount)}
                            className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-red-700"
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
