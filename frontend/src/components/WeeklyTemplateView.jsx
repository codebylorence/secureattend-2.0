import { useState, useEffect } from "react";
import { MdEdit, MdDelete, MdSave, MdContentCopy, MdClose, MdCheck, MdPlayArrow, MdAdd } from "react-icons/md";
import { getTemplates, deleteTemplate, updateTemplate, createTemplate } from "../api/ScheduleApi";

// Day Schedule Modal Component
function DayScheduleModal({ day, schedules, departments, shiftTemplates, onClose, onAddDepartment, onEdit, onDelete, onDeleteFromDay }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localSchedules, setLocalSchedules] = useState(schedules); // Local state for real-time updates
  const [formData, setFormData] = useState({
    departments: [], // Changed to array for multiple selection
    shift_name: "",
    start_time: "",
    end_time: "",
    member_limit: 1
  });

  // Update local schedules when prop changes
  useEffect(() => {
    setLocalSchedules(schedules);
  }, [schedules]);

  const handleShiftTemplateChange = (shiftName) => {
    const selectedShift = shiftTemplates.find(s => s.name === shiftName);
    if (selectedShift) {
      setFormData({
        ...formData,
        shift_name: selectedShift.name,
        start_time: selectedShift.start,
        end_time: selectedShift.end
      });
    }
  };

  const handleDepartmentToggle = (deptName) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(deptName)
        ? prev.departments.filter(d => d !== deptName)
        : [...prev.departments, deptName]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.departments.length === 0 || !formData.shift_name || !formData.start_time || !formData.end_time) {
      alert("Please select at least one department and fill all fields!");
      return;
    }
    
    // Add each selected department
    const results = [];
    const newSchedules = [];
    
    for (const department of formData.departments) {
      const result = await onAddDepartment({
        department,
        shift_name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        member_limit: formData.member_limit
      });
      results.push(result);
      
      // If successful, add to local state immediately
      if (result.success && result.schedule) {
        newSchedules.push(result.schedule);
      }
    }
    
    // Update local schedules immediately
    if (newSchedules.length > 0) {
      setLocalSchedules(prev => [...prev, ...newSchedules]);
    }
    
    // Show summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    let message = "";
    if (successful.length > 0) {
      message += `✅ Successfully added ${successful.length} zone(s):\n`;
      message += successful.map(r => `  • ${r.department}`).join("\n");
    }
    if (failed.length > 0) {
      message += `\n\n⚠️ Failed to add ${failed.length} zone(s):\n`;
      message += failed.map(r => `  • ${r.department} (${r.error})`).join("\n");
    }
    
    alert(message);
    
    setFormData({
      departments: [],
      shift_name: "",
      start_time: "",
      end_time: "",
      member_limit: 1
    });
    setShowAddForm(false);
  };

  // Get available departments (not already scheduled on this day)
  // Filter out pending deletion schedules - they're being deleted
  const scheduledDepartments = localSchedules
    .filter(s => !s.pending_deletion)
    .map(s => s.department);
  const availableDepartments = departments.filter(d => !scheduledDepartments.includes(d.name));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-[#1E3A8A]">{day} Schedule</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Current Schedules - Grouped by Shift */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned Zones</h3>
          {localSchedules.length === 0 ? (
            <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-md text-center">
              No zones scheduled for {day} yet. Click "Add Department" to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Group schedules by shift name */}
              {Object.entries(
                localSchedules.reduce((groups, schedule) => {
                  const shiftName = schedule.shift_name;
                  if (!groups[shiftName]) {
                    groups[shiftName] = [];
                  }
                  groups[shiftName].push(schedule);
                  return groups;
                }, {})
              ).map(([shiftName, shiftSchedules]) => (
                <div key={shiftName} className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Shift Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-lg">{shiftName}</h4>
                      <span className="text-sm opacity-90">
                        {shiftSchedules[0].start_time} - {shiftSchedules[0].end_time}
                      </span>
                    </div>
                  </div>
                  
                  {/* Zones in this shift */}
                  <div className="bg-blue-50 p-3 space-y-2">
                    {shiftSchedules.map((schedule, idx) => {
                      const limit = schedule.day_limits?.[day] || schedule.member_limit || "N/A";
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-blue-200 rounded-md p-3 flex justify-between items-center hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <div>
                              <p className="font-semibold text-blue-900">{schedule.department}</p>
                              <p className="text-sm text-green-700 font-medium">
                                Max Members: {limit}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                onEdit(schedule, day);
                                onClose();
                              }}
                              className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded"
                              title="Edit"
                            >
                              <MdEdit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                // Remove from local state immediately
                                setLocalSchedules(prev => prev.filter(s => s.id !== schedule.id));
                                // Then call the actual delete function
                                onDeleteFromDay(schedule.id, day, schedule.department);
                              }}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded"
                              title="Delete"
                            >
                              <MdDelete size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-600 mt-2 px-2">
                      <strong>{shiftSchedules.length}</strong> zone{shiftSchedules.length !== 1 ? 's' : ''} assigned to this shift
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Department Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-semibold"
          >
            <MdAdd size={20} /> Add Department to {day}
          </button>
        )}

        {/* Add Department Form */}
        {showAddForm && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Add New Department</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Departments/Zones (Multiple Selection)
                </label>
                {availableDepartments.length === 0 ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-center">
                    <p className="text-sm text-orange-600">
                      All departments are already scheduled for {day}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border border-gray-300 rounded-md p-3 bg-white max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {availableDepartments.map((dept) => (
                          <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.departments.includes(dept.name)}
                              onChange={() => handleDepartmentToggle(dept.name)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm">{dept.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {formData.departments.length > 0 && (
                      <p className="text-sm text-blue-600 mt-2">
                        Selected: {formData.departments.join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Template
                </label>
                <select
                  value={formData.shift_name}
                  onChange={(e) => handleShiftTemplateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select Shift Template</option>
                  {shiftTemplates.map((shift, index) => (
                    <option key={index} value={shift.name}>
                      {shift.name} ({shift.start} - {shift.end})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Members
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.member_limit}
                  onChange={(e) => setFormData({ ...formData, member_limit: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formData.departments.length === 0}
                  className="flex-1 bg-[#1E3A8A] text-white rounded-md px-4 py-2 hover:bg-blue-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add {formData.departments.length > 0 ? `${formData.departments.length} Zone${formData.departments.length > 1 ? 's' : ''}` : 'Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      departments: [],
                      shift_name: "",
                      start_time: "",
                      end_time: "",
                      member_limit: 1
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeeklyTemplateView() {
  const [templates, setTemplates] = useState([]);
  const [weeklyView, setWeeklyView] = useState({});
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [viewingSavedTemplate, setViewingSavedTemplate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([
    { name: "Opening Shift", start: "08:00", end: "16:00" },
    { name: "Closing Shift", start: "16:00", end: "00:00" },
    { name: "Graveyard Shift", start: "00:00", end: "08:00" },
  ]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchTemplatesData();
    loadSavedTemplates();
    fetchDepartmentsData();
  }, []);

  useEffect(() => {
    organizeWeeklyView();
  }, [templates]);

  const fetchTemplatesData = async () => {
    try {
      const data = await getTemplates();
      console.log("📥 Fetched templates:", data.length, "templates");
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchDepartmentsData = async () => {
    try {
      const { fetchDepartments } = await import("../api/DepartmentApi");
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const loadSavedTemplates = () => {
    const saved = localStorage.getItem("savedScheduleTemplates");
    if (saved) {
      setSavedTemplates(JSON.parse(saved));
    }
  };

  const organizeWeeklyView = () => {
    const organized = {};
    
    daysOfWeek.forEach(day => {
      organized[day] = [];
    });

    let skippedCount = 0;
    templates.forEach(template => {
      // Skip ONLY templates explicitly marked for deletion (pending_deletion === true)
      if (template.pending_deletion === true) {
        skippedCount++;
        return;
      }
      
      template.days.forEach(day => {
        organized[day].push({
          id: template.id,
          department: template.department,
          shift_name: template.shift_name,
          start_time: template.start_time,
          end_time: template.end_time,
          day_limits: template.day_limits,
          member_limit: template.member_limit,
          pending_deletion: template.pending_deletion
        });
      });
    });

    console.log("📊 Organized weekly view:", {
      totalTemplates: templates.length,
      skippedPendingDeletion: skippedCount,
      daysWithSchedules: Object.entries(organized).filter(([_, schedules]) => schedules.length > 0).length
    });

    setWeeklyView(organized);
  };

  const handleDeleteTemplate = async (id) => {
    const template = templates.find(t => t.id === id);
    if (!window.confirm(`Delete template for ${template?.department}?`)) return;
    
    try {
      await deleteTemplate(id);
      alert("Template deleted successfully!");
      fetchTemplatesData();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template");
    }
  };

  const handleDeleteFromDay = async (scheduleId, day, department) => {
    if (!window.confirm(`Remove ${department} from ${day}?\n\nThis will mark it for deletion. Click "Publish Schedule" to apply changes.`)) return;
    
    try {
      const template = templates.find(t => t.id === scheduleId);
      
      if (!template) {
        alert("Template not found");
        return;
      }

      // Check if this template has multiple days
      if (template.days.length > 1) {
        // Remove only this day from the template
        const updatedDays = template.days.filter(d => d !== day);
        const updatedDayLimits = { ...template.day_limits };
        delete updatedDayLimits[day];

        await updateTemplate(scheduleId, {
          days: updatedDays,
          day_limits: updatedDayLimits
        });

        alert(`✅ ${department} removed from ${day}\n\nClick "Publish Schedule" to apply changes.`);
      } else {
        // This is the only day, mark entire template for deletion
        await deleteTemplate(scheduleId);
        alert(`✅ ${department} marked for deletion\n\nClick "Publish Schedule" to permanently delete.`);
      }
      
      await fetchTemplatesData();
    } catch (error) {
      console.error("Error removing schedule from day:", error);
      alert(`Failed to remove schedule: ${error.message}`);
    }
  };

  const handleDeleteFromDayInModal = async (scheduleId, day, department) => {
    if (!window.confirm(`Remove ${department} from ${day}?`)) return;
    
    try {
      const template = templates.find(t => t.id === scheduleId);
      
      if (!template) {
        alert("Template not found");
        return;
      }

      // Remove from local state immediately
      setLocalSchedules(prev => prev.filter(s => s.id !== scheduleId));

      // Check if this template has multiple days
      if (template.days.length > 1) {
        // Remove only this day from the template
        const updatedDays = template.days.filter(d => d !== day);
        const updatedDayLimits = { ...template.day_limits };
        delete updatedDayLimits[day];

        await updateTemplate(scheduleId, {
          days: updatedDays,
          day_limits: updatedDayLimits
        });

        alert(`✅ ${department} removed from ${day}`);
      } else {
        // This is the only day, delete the entire template
        await deleteTemplate(scheduleId);
        alert(`✅ ${department} schedule deleted`);
      }
      
      fetchTemplatesData();
    } catch (error) {
      console.error("Error removing schedule from day:", error);
      alert("Failed to remove schedule");
      // Revert local state on error
      setLocalSchedules(schedules);
    }
  };

  const handlePublishSchedules = async () => {
    if (!window.confirm("Publish all draft schedules?\n\nThis will make them visible to team leaders and they will be notified.")) {
      return;
    }

    try {
      const { publishSchedules } = await import("../api/ScheduleApi");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const publishedBy = user.employee?.employee_id || "admin";

      const result = await publishSchedules(publishedBy);

      if (result.count === 0) {
        alert("ℹ️ No changes to publish.\n\nAll schedules are up to date.");
      } else {
        let message = `✅ Schedule Changes Published Successfully!\n\n`;
        
        if (result.published > 0) {
          message += `Published: ${result.published} schedule(s)\n`;
        }
        if (result.deleted > 0) {
          message += `Deleted: ${result.deleted} schedule(s)\n`;
        }
        message += `Departments: ${result.departments.join(", ")}\n\n`;
        message += `Team leaders have been notified.`;
        
        alert(message);
      }

      fetchTemplatesData(); // Refresh to show published status
    } catch (error) {
      console.error("Error publishing schedules:", error);
      alert("❌ Failed to publish schedules. Please try again.");
    }
  };

  const handleSaveAsReusable = () => {
    const templateName = prompt("Enter a name for this template:");
    if (!templateName) return;

    const newTemplate = {
      id: Date.now(),
      name: templateName,
      weeklySchedule: { ...weeklyView },
      createdAt: new Date().toISOString()
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem("savedScheduleTemplates", JSON.stringify(updated));
    alert(`Template "${templateName}" saved successfully!`);
  };

  const handleLoadTemplate = (savedTemplate) => {
    setViewingSavedTemplate(savedTemplate);
  };

  const handleApplyTemplate = async (savedTemplate) => {
    if (!window.confirm(`Apply template "${savedTemplate.name}"?\n\nThis will create new schedule templates based on this saved configuration.`)) {
      return;
    }

    try {
      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Iterate through each day in the saved template
      for (const [day, schedules] of Object.entries(savedTemplate.weeklySchedule)) {
        if (!schedules || schedules.length === 0) continue;

        // Create templates for each schedule on this day
        for (const schedule of schedules) {
          try {
            // Check if this exact template already exists
            const exists = templates.find(t => 
              t.department === schedule.department &&
              t.shift_name === schedule.shift_name &&
              t.days.includes(day)
            );

            if (exists) {
              skippedCount++;
              continue;
            }

            // Create the template
            await createTemplate({
              shift_name: schedule.shift_name,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              department: schedule.department,
              days: [day], // Apply to this specific day
              day_limits: schedule.day_limits || {},
              member_limit: schedule.member_limit,
              created_by: "admin"
            });

            createdCount++;
          } catch (error) {
            console.error(`Error creating template for ${schedule.department} on ${day}:`, error);
            errors.push(`${schedule.department} on ${day}`);
          }
        }
      }

      // Show results
      let message = `✅ Template Applied!\n\n`;
      message += `Created: ${createdCount} schedule(s)\n`;
      if (skippedCount > 0) {
        message += `Skipped: ${skippedCount} (already exist)\n`;
      }
      if (errors.length > 0) {
        message += `\n⚠️ Failed to create:\n${errors.join(", ")}`;
      }

      alert(message);
      fetchTemplatesData();
      setViewingSavedTemplate(null);
    } catch (error) {
      console.error("Error applying template:", error);
      alert("Failed to apply template");
    }
  };

  const handleEditSchedule = (schedule, day) => {
    setEditingSchedule({
      ...schedule,
      day: day,
      originalId: schedule.id
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      await updateTemplate(editingSchedule.originalId, {
        shift_name: editingSchedule.shift_name,
        start_time: editingSchedule.start_time,
        end_time: editingSchedule.end_time,
        day_limits: {
          ...editingSchedule.day_limits,
          [editingSchedule.day]: editingSchedule.member_limit
        }
      });
      
      alert("Schedule updated successfully!");
      setEditingSchedule(null);
      fetchTemplatesData();
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule");
    }
  };

  const handleDeleteSavedTemplate = (id) => {
    const template = savedTemplates.find(t => t.id === id);
    if (!window.confirm(`Delete saved template "${template?.name}"?`)) return;
    
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem("savedScheduleTemplates", JSON.stringify(updated));
    alert("Saved template deleted!");
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
  };

  const handleAddDepartmentToDay = async (departmentData) => {
    try {
      const { createTemplate } = await import("../api/ScheduleApi");
      
      console.log("🔍 Adding department:", departmentData.department, "to", selectedDay);
      console.log("📋 Current templates:", templates.length);
      
      // Check if this department already has a shift on this day
      // Ignore schedules marked for deletion - they're being removed
      const matchingTemplates = templates.filter(t => 
        t.department === departmentData.department &&
        t.days.includes(selectedDay)
      );
      
      console.log("🔎 Matching templates:", matchingTemplates.map(t => ({
        id: t.id,
        dept: t.department,
        days: t.days,
        pending_deletion: t.pending_deletion
      })));
      
      const exists = templates.find(t => 
        t.department === departmentData.department &&
        t.days.includes(selectedDay) &&
        t.pending_deletion !== true  // Explicitly check it's not true
      );

      console.log("❓ Exists (not pending deletion):", exists ? "YES - BLOCKING" : "NO - ALLOWING");

      if (exists) {
        throw new Error(`${departmentData.department} already scheduled`);
      }
      
      console.log("✅ Creating new template...");

      const newTemplate = await createTemplate({
        shift_name: departmentData.shift_name,
        start_time: departmentData.start_time,
        end_time: departmentData.end_time,
        department: departmentData.department,
        days: [selectedDay],
        day_limits: { [selectedDay]: departmentData.member_limit || 1 },
        created_by: "admin"
      });

      console.log("✅ Template created successfully:", newTemplate);

      // Immediately refresh templates to update the main view
      await fetchTemplatesData();

      // Return the created schedule for real-time display in modal
      return { 
        success: true, 
        department: departmentData.department,
        schedule: {
          id: newTemplate.id,
          department: departmentData.department,
          shift_name: departmentData.shift_name,
          start_time: departmentData.start_time,
          end_time: departmentData.end_time,
          day_limits: { [selectedDay]: departmentData.member_limit || 1 },
          member_limit: departmentData.member_limit
        }
      };
    } catch (error) {
      console.error("❌ Error adding department to day:", error);
      console.error("❌ Error details:", error.message, error.response?.data);
      return { success: false, department: departmentData.department, error: error.message };
    }
  };

  return (
    <div className="space-y-6">
      {/* Day Schedule Modal */}
      {selectedDay && (
        <DayScheduleModal
          day={selectedDay}
          schedules={weeklyView[selectedDay] || []}
          departments={departments}
          shiftTemplates={shiftTemplates}
          onClose={() => {
            setSelectedDay(null);
            fetchTemplatesData(); // Refresh weekly view when modal closes
          }}
          onAddDepartment={handleAddDepartmentToDay}
          onEdit={handleEditSchedule}
          onDelete={handleDeleteTemplate}
          onDeleteFromDay={handleDeleteFromDay}
        />
      )}

      {/* Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Schedule - {editingSchedule.department} ({editingSchedule.day})
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Shift</label>
                <select
                  value={editingSchedule.shift_name}
                  onChange={(e) => {
                    const selectedShift = shiftTemplates.find(s => s.name === e.target.value);
                    if (selectedShift) {
                      setEditingSchedule({
                        ...editingSchedule,
                        shift_name: selectedShift.name,
                        start_time: selectedShift.start,
                        end_time: selectedShift.end
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  {shiftTemplates.map((shift, index) => (
                    <option key={index} value={shift.name}>
                      {shift.name} ({shift.start} - {shift.end})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {editingSchedule.shift_name} ({editingSchedule.start_time} - {editingSchedule.end_time})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                <input
                  type="number"
                  min="1"
                  value={editingSchedule.member_limit || 1}
                  onChange={(e) => setEditingSchedule({...editingSchedule, member_limit: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-[#1E3A8A] text-white rounded-md px-4 py-2 hover:bg-blue-900 flex items-center justify-center gap-2"
                >
                  <MdCheck /> Save Changes
                </button>
                <button
                  onClick={() => setEditingSchedule(null)}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <MdClose /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Template View Modal */}
      {viewingSavedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Template: {viewingSavedTemplate.name}
              </h3>
              <button
                onClick={() => setViewingSavedTemplate(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Apply Template Button */}
            <div className="mb-4">
              <button
                onClick={() => handleApplyTemplate(viewingSavedTemplate)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold"
              >
                <MdPlayArrow size={20} /> Apply This Template to Current Schedule
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will create new schedule templates based on this configuration. Existing schedules will be skipped.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
              {daysOfWeek.map(day => (
                <div key={day} className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-purple-600 text-white p-2 text-center font-semibold text-sm">
                    {day}
                  </div>
                  <div className="p-2 space-y-2 min-h-[150px] bg-gray-50">
                    {viewingSavedTemplate.weeklySchedule[day]?.length > 0 ? (
                      viewingSavedTemplate.weeklySchedule[day].map((schedule, idx) => {
                        const limit = schedule.day_limits?.[day] || schedule.member_limit || "N/A";
                        return (
                          <div key={idx} className="bg-white border border-purple-200 rounded-md p-2">
                            <p className="font-semibold text-xs text-purple-800">{schedule.department}</p>
                            <p className="text-xs text-gray-700">{schedule.shift_name}</p>
                            <p className="text-xs text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                            <p className="text-xs text-green-700 font-medium mt-1">
                              Max: {limit} {limit === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-xs text-center mt-4">No schedules</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 How to Create Schedules</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Click on any day</strong> (Monday-Sunday) to open the schedule manager</li>
          <li>• <strong>Add departments/zones</strong> to that specific day with shift details</li>
          <li>• <strong>Edit or delete</strong> schedules directly from the day view</li>
          <li>• <strong>Save as template</strong> to reuse this weekly configuration later</li>
        </ul>
      </div>

      {/* Weekly Calendar View */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#1E3A8A]">Weekly Schedule Overview</h2>
          <div className="flex gap-3">
            <button
              onClick={handlePublishSchedules}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold"
            >
              <MdCheck /> Publish Schedule
            </button>
            <button
              onClick={handleSaveAsReusable}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <MdSave /> Save as Template
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
          {daysOfWeek.map(day => (
            <div key={day} className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-blue-500 transition-all">
              <button
                onClick={() => handleDayClick(day)}
                className="w-full bg-[#1E3A8A] text-white p-3 text-center font-semibold hover:bg-blue-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
                title={`Click to manage ${day} schedule`}
              >
                {day}
                <span className="text-xs opacity-75">📝</span>
              </button>
              <div className="p-3 space-y-2 min-h-[200px] bg-gray-50">
                {weeklyView[day]?.length > 0 ? (
                  weeklyView[day].map((schedule, idx) => {
                    const limit = schedule.day_limits?.[day] || schedule.member_limit || "N/A";
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-blue-200 rounded-md p-2 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm text-blue-800">
                            {schedule.department}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditSchedule(schedule, day)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit"
                            >
                              <MdEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteFromDay(schedule.id, day, schedule.department)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete from this day"
                            >
                              <MdDelete size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 font-medium">{schedule.shift_name}</p>
                        <p className="text-xs text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                        <p className="text-xs text-green-700 font-medium mt-1">
                          Max: {limit} {limit === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-xs text-center mt-8">No schedules</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Templates */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Saved Reusable Templates</h3>
        {savedTemplates.length === 0 ? (
          <p className="text-gray-500 text-sm">No saved templates yet. Create a schedule and save it as a template.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedTemplates.map(template => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{template.name}</h4>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="View & Apply Template"
                    >
                      <MdContentCopy size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSavedTemplate(template.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  {Object.entries(template.weeklySchedule).map(([day, schedules]) => (
                    schedules.length > 0 && (
                      <div key={day} className="mb-1">
                        <span className="font-medium">{day}:</span> {schedules.length} zone(s)
                      </div>
                    )
                  ))}
                </div>
                <button
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  <MdPlayArrow size={16} /> Apply Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
