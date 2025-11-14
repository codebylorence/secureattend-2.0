import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import { addDepartment } from "../api/DepartmentApi";
import { fetchTeamLeaders } from "../api/UserApi";

export default function AddDeptButton({ onDepartmentAdded }) {
  const [showModal, setShowModal] = useState(false);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    manager: ""
  });

  useEffect(() => {
    if (showModal) {
      loadTeamLeaders();
    }
  }, [showModal]);

  const loadTeamLeaders = async () => {
    try {
      const data = await fetchTeamLeaders();
      setTeamLeaders(data);
    } catch (error) {
      console.error("Error loading team leaders:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Department name is required");
      return;
    }

    try {
      await addDepartment(formData);
      setFormData({ name: "", description: "", manager: "" });
      setShowModal(false);
      if (onDepartmentAdded) onDepartmentAdded();
    } catch (error) {
      console.error("Error adding department:", error);
      alert(error.response?.data?.error || "Failed to add department");
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition cursor-pointer"
      >
        <span>Add Department</span>
        <div className="bg-white rounded-full p-1">
          <FaPlus color="#1E3A8A" />
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Add New Department</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Department Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Manager</label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">No Manager</option>
                  {teamLeaders.map((leader) => (
                    <option key={leader.id} value={leader.employee?.fullname || leader.username}>
                      {leader.employee?.fullname || leader.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: "", description: "", manager: "" });
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E3A8A] text-white rounded hover:bg-blue-600"
                >
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
