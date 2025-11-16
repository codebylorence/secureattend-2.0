import { MdAddCircle, MdDelete, MdEdit } from "react-icons/md";
import { useState, useEffect } from "react";
import { fetchDepartments } from "../api/DepartmentApi";
import { createSchedule, getAllTemplates, deleteSchedule } from "../api/ScheduleApi";

export default function TemplateSched() {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([
    { name: "Opening Shift", start: "08:00", end: "16:00" },
    { name: "Closing Shift", start: "16:00", end: "00:00" },
    { name: "Graveyard Shift", start: "00:00", end: "08:00" },
  ]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);
  const [shiftForm, setShiftForm] = useState({ name: "", start: "", end: "" });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const [newTemplate, setNewTemplate] = useState({ 
    name: "", 
    department: "",
    days: [],
    dayLimits: {} // Store member limits per day: { "Monday": 5, "Tuesday": 3, ... }
  });

  useEffect(() => {
    fetchDepartmentsData();
    fetchTemplatesData();
  }, []);

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
      const data = await getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleDayToggle = (day) => {
    setNewTemplate((prev) => {
      const isRemoving = prev.days.includes(day);
      const newDays = isRemoving 
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day];
      
      // Remove limit if day is being removed
      const newDayLimits = { ...prev.dayLimits };
      if (isRemoving) {
        delete newDayLimits[day];
      } else {
        // Set default limit of 1 for new day
        newDayLimits[day] = 1;
      }
      
      return {
        ...prev,
        days: newDays,
        dayLimits: newDayLimits
      };
    });
  };

  const handleDayLimitChange = (day, limit) => {
    setNewTemplate((prev) => ({
      ...prev,
      dayLimits: {
        ...prev.dayLimits,
        [day]: parseInt(limit) || 1
      }
    }));
  };

  const checkShiftConflict = () => {
    // Check if there's already ANY shift for the same department on any of the selected days
    const conflicts = [];
    
    newTemplate.days.forEach((day) => {
      const existingShift = templates.find(
        (template) =>
          template.department === newTemplate.department &&
          template.days.includes(day)
      );
      
      if (existingShift) {
        conflicts.push({ day, existingShift: existingShift.shift_name });
      }
    });
    
    return conflicts;
  };

  const handleShiftTemplateChange = (shiftName) => {
    const selectedShift = shiftTemplates.find(s => s.name === shiftName);
    if (selectedShift) {
      setNewTemplate({
        ...newTemplate,
        name: selectedShift.name,
        startTime: selectedShift.start,
        endTime: selectedShift.end
      });
    }
  };

  const handleAddShiftTemplate = () => {
    if (!shiftForm.name || !shiftForm.start || !shiftForm.end) {
      return alert("Please fill all shift template fields!");
    }
    
    if (editingShiftIndex !== null) {
      const updated = [...shiftTemplates];
      updated[editingShiftIndex] = shiftForm;
      setShiftTemplates(updated);
    } else {
      setShiftTemplates([...shiftTemplates, shiftForm]);
    }
    
    setShiftForm({ name: "", start: "", end: "" });
    setEditingShiftIndex(null);
    setShowShiftModal(false);
  };

  const handleEditShiftTemplate = (index) => {
    setShiftForm(shiftTemplates[index]);
    setEditingShiftIndex(index);
    setShowShiftModal(true);
  };

  const handleDeleteShiftTemplate = (index) => {
    if (!window.confirm("Delete this shift template?")) return;
    setShiftTemplates(shiftTemplates.filter((_, i) => i !== index));
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.startTime || !newTemplate.endTime || !newTemplate.department || newTemplate.days.length === 0) {
      return alert("Fill all fields and select at least one day!");
    }

    // Validate all day limits are set and >= 1
    for (const day of newTemplate.days) {
      if (!newTemplate.dayLimits[day] || newTemplate.dayLimits[day] < 1) {
        return alert(`Please set a valid member limit (minimum 1) for ${day}!`);
      }
    }

    // Check for conflicts
    const conflicts = checkShiftConflict();
    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(c => `${c.day} (${c.existingShift})`).join(", ");
      return alert(
        `Cannot create template: ${newTemplate.department} already has a shift on ${conflictMessages}.\n\nOnly 1 shift per day per zone is allowed.`
      );
    }

    try {
      await createSchedule({
        shift_name: newTemplate.name,
        start_time: newTemplate.startTime,
        end_time: newTemplate.endTime,
        department: newTemplate.department,
        days: newTemplate.days,
        day_limits: newTemplate.dayLimits,
        is_template: true,
        created_by: "admin"
      });
      alert(
        `✅ Template created successfully!\n\n` +
        `📋 ${newTemplate.name} for ${newTemplate.department}\n` +
        `📅 Days: ${newTemplate.days.join(", ")}\n` +
        `⏰ Time: ${newTemplate.startTime} - ${newTemplate.endTime}\n\n` +
        `👤 This schedule has been automatically assigned to the team leader of ${newTemplate.department}.`
      );
      setNewTemplate({ name: "", startTime: "", endTime: "", department: "", days: [], dayLimits: {} });
      fetchTemplatesData();
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template");
    }
  };

  const handleDelete = async (id) => {
    const template = templates.find(t => t.id === id);
    const confirmMessage = template 
      ? `⚠️ Delete Schedule Template?\n\n` +
        `Template: ${template.shift_name}\n` +
        `Department: ${template.department}\n\n` +
        `This will also delete the team leader's assigned schedule for this shift.\n\n` +
        `Are you sure you want to continue?`
      : "Are you sure you want to delete this template?";
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await deleteSchedule(id);
      alert(
        `✅ Template deleted successfully!\n\n` +
        `The team leader's schedule has also been removed.`
      );
      fetchTemplatesData();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template");
    }
  };
  return (
    <>
      {/* Shift Template Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingShiftIndex !== null ? "Edit" : "Add"} Shift Template
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Name
                </label>
                <input
                  type="text"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Morning Shift"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={shiftForm.start}
                  onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={shiftForm.end}
                  onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddShiftTemplate}
                  className="flex-1 bg-[#1E3A8A] text-white rounded-md px-4 py-2 hover:bg-blue-900"
                >
                  {editingShiftIndex !== null ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftModal(false);
                    setShiftForm({ name: "", start: "", end: "" });
                    setEditingShiftIndex(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Templates Management - Compact Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Shift Templates</h3>
          <button
            type="button"
            onClick={() => setShowShiftModal(true)}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
          >
            <MdAddCircle /> Add Shift
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {shiftTemplates.map((shift, index) => (
            <div
              key={index}
              className="flex justify-between items-center border border-gray-200 rounded-md p-2 bg-gray-50"
            >
              <div>
                <p className="font-medium text-sm text-gray-800">{shift.name}</p>
                <p className="text-xs text-gray-600">{shift.start} - {shift.end}</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleEditShiftTemplate(index)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit"
                >
                  <MdEdit size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteShiftTemplate(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete"
                >
                  <MdDelete size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Schedule Template - Maximized */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-[#1E3A8A] mb-6">
          <MdAddCircle /> Add Schedule Template
        </h2>
        <form onSubmit={handleAddTemplate} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Department/Zone
              </label>
              <select
                value={newTemplate.department}
                onChange={(e) => setNewTemplate({ ...newTemplate, department: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-white text-base"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Shift Template
              </label>
              <select
                value={newTemplate.name}
                onChange={(e) => handleShiftTemplateChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-white text-base"
              >
                <option value="">Select Shift Template</option>
                {shiftTemplates.map((shift, index) => (
                  <option key={index} value={shift.name}>
                    {shift.name} ({shift.start} - {shift.end})
                  </option>
                ))}
              </select>
            </div>
          </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Working Days & Member Limits
          </label>
          
          {!newTemplate.department ? (
            <div className="p-6 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500 text-base">
                ⚠️ Please select a Department/Zone first to enable day selection
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {daysOfWeek.map((day) => {
                  // Check if ANY shift exists for this department on this day
                  const existingShift = newTemplate.department && templates.find(
                    (template) =>
                      template.department === newTemplate.department &&
                      template.days.includes(day)
                  );
                  
                  const hasConflict = !!existingShift;
                  const isSelected = newTemplate.days.includes(day);
                  
                  return (
                    <div key={day} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <button
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        disabled={hasConflict}
                        className={`w-36 px-4 py-3 rounded-md text-base font-medium transition-colors ${
                          hasConflict
                            ? "bg-red-200 text-red-800 cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-[#1E3A8A] text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        title={hasConflict ? `${existingShift.shift_name} already exists for ${newTemplate.department} on ${day}` : ""}
                      >
                        {day}
                        {hasConflict && " ⚠️"}
                      </button>
                      
                      {isSelected && (
                        <div className="flex items-center gap-3 flex-1">
                          <label className="text-base text-gray-600 whitespace-nowrap font-medium">
                            Max Members:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={newTemplate.dayLimits[day] || 1}
                            onChange={(e) => handleDayLimitChange(day, e.target.value)}
                            className="w-24 border border-gray-300 rounded-md px-4 py-2 text-base"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                ⚠️ Days marked with warning already have a shift for the selected department
              </p>
              <p className="text-sm text-gray-500 mt-2">
                💡 Select days and set individual member limits for each day
              </p>
            </>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900 px-6 py-4 font-semibold text-lg"
        >
          Create Template
        </button>
      </form>
      </div>

      {/* Active Schedule Templates - Compact */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Active Schedule Templates</h3>
        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">No templates created yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex justify-between items-center border border-gray-200 rounded-md p-3 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {template.shift_name} - <span className="text-blue-600">{template.department}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Time: {template.start_time} - {template.end_time}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.day_limits ? (
                      <>
                        Days & Limits: {Object.entries(template.day_limits).map(([day, limit]) => `${day}(${limit})`).join(", ")}
                      </>
                    ) : (
                      <>Days: {template.days.join(", ")} | Max Members: {template.member_limit || "N/A"}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Delete Template"
                >
                  <MdDelete size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
