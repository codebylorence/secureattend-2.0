import { MdEditCalendar, MdDelete, MdVisibility, MdPublish, MdCancel, MdLocationOn, MdAccessTime, MdCalendarToday } from "react-icons/md";
import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { confirmAction } from "../utils/confirmToast.jsx";
import { fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { getPublishedTemplates } from "../api/ScheduleApi";
import { 
  getPendingDrafts, 
  getDraftCount, 
  createDraft, 
  deleteDraft, 
  publishDrafts,
  cancelAllDrafts 
} from "../api/ScheduleDraftApi";

export default function AssignSchedWithDrafts() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [draftCount, setDraftCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [formData, setFormData] = useState({
    employee_id: "",
    template_id: "",
    days: [],
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchEmployeesData();
    fetchDepartmentsData();
    fetchTemplatesData();
    fetchDraftsData();
    fetchDraftCountData();
  }, []);

  const fetchEmployeesData = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartmentsData = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchTemplatesData = async () => {
    try {
      const data = await getPublishedTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchDraftsData = async () => {
    try {
      const data = await getPendingDrafts();
      setDrafts(data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };

  const fetchDraftCountData = async () => {
    try {
      const count = await getDraftCount();
      setDraftCount(count);
    } catch (error) {
      console.error("Error fetching draft count:", error);
    }
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.template_id || formData.days.length === 0) {
      return toast.warning("Please fill all fields and select at least one day!");
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const assignedBy = user.employee?.employee_id || "admin";

      const draftData = {
        employee_id: formData.employee_id,
        template_id: parseInt(formData.template_id),
        days: formData.days,
        assigned_by: assignedBy
      };

      console.log("📤 Sending draft data:", draftData);
      const result = await createDraft(draftData);
      console.log("✅ Draft created:", result);
      
      toast.success("Assignment added to drafts! Click 'Publish Assignments' to apply.");
      
      setFormData({
        employee_id: "",
        template_id: "",
        days: [],
      });
      
      fetchDraftsData();
      fetchDraftCountData();
    } catch (error) {
      console.error("❌ Error creating draft:", error);
      console.error("❌ Error response:", error.response);
      const errorMsg = error.response?.data?.message || error.message || "Failed to create draft";
      toast.error(`Failed to create draft: ${errorMsg}`);
    }
  };

  const handleDeleteDraft = async (id) => {
    confirmAction("Remove this draft?", async () => {
      try {
        await deleteDraft(id);
        toast.success("Removed!");
        fetchDraftsData();
        fetchDraftCountData();
      } catch (error) {
        console.error("Error deleting draft:", error);
        toast.error("Remove failed");
      }
    });
  };

  const handlePublish = async () => {
    if (draftCount === 0) {
      return toast.info("No pending assignments to publish!");
    }

    confirmAction(`Publish ${draftCount} assignment(s)?`, async () => {

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const publishedBy = user.employee?.employee_id || "admin";

      const result = await publishDrafts(publishedBy);
      
      toast.success(`Published successfully! Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}, Failed: ${result.failed}`);
      
      fetchDraftsData();
      fetchDraftCountData();
      } catch (error) {
        console.error("Error publishing drafts:", error);
        toast.error("Publish failed");
      }
    });
  };

  const handleCancelAll = async () => {
    if (draftCount === 0) {
      return toast.info("No pending assignments to cancel!");
    }

    confirmAction(`Cancel all ${draftCount} draft(s)?`, async () => {

    try {
      await cancelAllDrafts();
      toast.success("All drafts cancelled!");
      fetchDraftsData();
      fetchDraftCountData();
      } catch (error) {
        console.error("Error cancelling drafts:", error);
        toast.error("Cancel failed");
      }
    });
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.fullname : employeeId;
  };

  const getEmployeeDepartment = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.department : "";
  };

  const getTemplateName = (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    return template ? `${template.department} - ${template.shift_name}` : `Template #${templateId}`;
  };

  const getTemplateDetails = (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    return template || null;
  };

  // Sort employees
  const sortedEmployees = [...employees].sort((a, b) => {
    if (a.department !== b.department) {
      return (a.department || "").localeCompare(b.department || "");
    }
    return (a.fullname || "").localeCompare(b.fullname || "");
  });

  // Filter drafts by department
  const filteredDrafts = selectedDepartment
    ? drafts.filter((draft) => getEmployeeDepartment(draft.employee_id) === selectedDepartment)
    : drafts;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Header with Draft Count */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A]">
          <MdEditCalendar /> Assign Schedule (Draft Mode) ✨
        </h2>
        {draftCount > 0 && (
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {draftCount} Pending
          </span>
        )}
      </div>

      {/* Action Buttons */}
      {draftCount > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800 mb-3">
            You have {draftCount} pending assignment(s). Publish them to make them visible to employees.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-md hover:bg-green-700 px-4 py-2 font-medium"
            >
              <MdPublish size={20} />
              Publish Assignments
            </button>
            <button
              onClick={handleCancelAll}
              className="flex items-center justify-center gap-2 bg-red-600 text-white rounded-md hover:bg-red-700 px-4 py-2 font-medium"
            >
              <MdCancel size={20} />
              Cancel All
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Employee and Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Employee
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Choose Employee</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.employee_id}>
                  {emp.fullname} ({emp.employee_id}) - {emp.department || "No Dept"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Schedule Template
            </label>
            <select
              value={formData.template_id}
              onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Choose Template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.department} - {template.shift_name} ({template.start_time} - {template.end_time})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display Selected Template Details */}
        {formData.template_id && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            {(() => {
              const template = getTemplateDetails(parseInt(formData.template_id));
              return template ? (
                <>
                  <p className="text-sm text-gray-700">
                    <strong>Zone:</strong> {template.department}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Shift:</strong> {template.shift_name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Time:</strong> {template.start_time} - {template.end_time}
                  </p>
                </>
              ) : null;
            })()}
          </div>
        )}

        {/* Days Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Working Days
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData.days.includes(day)
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900 px-4 py-2 font-medium"
        >
          Add to Drafts
        </button>
      </form>

      {/* View Drafts Button */}
      <div className="mt-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 px-4 py-3 font-medium"
        >
          <MdVisibility size={20} />
          View Pending Assignments ({draftCount})
        </button>
      </div>

      {/* Modal for Viewing Drafts */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#1E3A8A]">
                  Pending Assignments ({draftCount})
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Zone/Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {filteredDrafts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {selectedDepartment
                    ? `No pending assignments for ${selectedDepartment}`
                    : "No pending assignments yet."}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredDrafts.map((draft) => {
                    const employee = employees.find(e => e.employee_id === draft.employee_id);
                    const template = getTemplateDetails(draft.template_id);
                    
                    return (
                      <div
                        key={draft.id}
                        className="border border-orange-200 bg-orange-50 rounded-md p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-gray-800">
                                {getEmployeeName(draft.employee_id)}
                              </p>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {getEmployeeDepartment(draft.employee_id)}
                              </span>
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                                DRAFT
                              </span>
                            </div>
                            
                            {template && (
                              <div className="ml-3 space-y-1">
                                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                  <MdLocationOn size={16} /> {template.department} - {template.shift_name}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <MdAccessTime size={16} /> {template.start_time} - {template.end_time}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MdCalendarToday size={14} /> {draft.days.join(", ")}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Remove from drafts"
                          >
                            <MdDelete size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 space-y-2">
              {draftCount > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      handlePublish();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-md hover:bg-green-700 px-4 py-2 font-medium"
                  >
                    <MdPublish size={20} />
                    Publish All ({draftCount})
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      handleCancelAll();
                    }}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white rounded-md hover:bg-red-700 px-4 py-2 font-medium"
                  >
                    <MdCancel size={20} />
                    Cancel All
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 px-4 py-2 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
