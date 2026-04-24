import { useState, useEffect } from "react";
import { FaPlus, FaXmark} from "react-icons/fa6";
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
      closeAndReset();
      if (onDepartmentAdded) onDepartmentAdded();
    } catch (error) {
      console.error("Error adding department:", error);
      alert(error.response?.data?.error || "Failed to add department");
    }
  };

  const closeAndReset = () => {
    setShowModal(false);
    setFormData({ name: "", description: "", manager: "" });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-md transition cursor-pointer"
      >
        <span>Add Department</span>
        <div className="bg-white rounded-full p-1">
          <FaPlus color="#1E3A8A" size={12} />
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl relative">
            
            {/* Header & Close Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add New Department</h2>
              <button 
                onClick={closeAndReset}
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
                type="button"
              >
                <FaXmark size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Department Name Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all placeholder:text-slate-400 font-medium text-slate-700"
                  required
                />
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Briefly describe the responsibilities..."
                  rows="4"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all placeholder:text-slate-400 resize-none font-medium text-slate-700"
                />
              </div>

              {/* Manager Dropdown */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Manager
                </label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all bg-white font-medium text-slate-700 appearance-none"
                >
                  <option value="">No Manager</option>
                  {teamLeaders.map((leader) => {
                    const leaderFullName = `${leader.employee?.firstname || ''} ${leader.employee?.lastname || ''}`.trim() || leader.username;
                    const leaderDept = leader.employee?.department;
                    const isAssignedElsewhere = leaderDept && leaderDept !== "No Department";

                    return (
                      <option
                        key={leader.id}
                        value={leaderFullName}
                        disabled={isAssignedElsewhere}
                      >
                        {leaderFullName}
                        {isAssignedElsewhere
                          ? ` — assigned to ${leaderDept}`
                          : ""}
                      </option>
                    );
                  })}
                </select>
                {/* Warning when a taken leader is somehow selected */}
                {formData.manager && (() => {
                  const selected = teamLeaders.find((l) => {
                    const n = `${l.employee?.firstname || ''} ${l.employee?.lastname || ''}`.trim() || l.username;
                    return n === formData.manager;
                  });
                  const dept = selected?.employee?.department;
                  return dept && dept !== "No Department" ? (
                    <p className="mt-1.5 text-xs text-amber-600 font-medium">
                      ⚠ This team leader is already assigned to <strong>{dept}</strong>. Remove their assignment there first.
                    </p>
                  ) : null;
                })()}
              </div>

              {/* Footer Buttons */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  type="button"
                  onClick={closeAndReset}
                  className="py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-[#1E3A8A] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/50"
                >
                  Save
                </button>
              </div>
              
            </form>
          </div>
        </div>
      )}
    </>
  );
}