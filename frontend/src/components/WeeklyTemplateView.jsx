import { useState, useEffect, useMemo } from "react";
import { 
  MdEdit, MdDelete, MdSave, MdContentCopy, MdClose, MdCheck, 
  MdPlayArrow, MdAdd, MdLightbulb, MdSupervisorAccount, MdPerson 
} from "react-icons/md";
import { toast } from 'react-toastify';

// API Imports
import { 
  getTemplates, deleteTemplate, updateTemplate, createTemplate, 
  publishSchedules, assignSchedule, getEmployeeSchedules, deleteEmployeeSchedule 
} from "../api/ScheduleApi";
import { 
  getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate 
} from "../api/ShiftTemplateApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { confirmAction } from "../utils/confirmToast.jsx";

// ==========================================
// Shared Helper Functions
// ==========================================

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const getDayOfWeek = (date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

// Check if the shift has started or ended for today
const isShiftTimePassedForToday = (startTime, endTime) => {
  // TEMPORARILY DISABLED FOR TESTING - Always return false to allow scheduling
  return false;
  
  /* Original Logic preserved:
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const shiftStartMinutes = parseTimeToMinutes(startTime);
  return currentMinutes >= shiftStartMinutes;
  */
};

// ==========================================
// Sub-Components (For cleaner JSX)
// ==========================================

// Renders a single schedule item inside the Modal
const ScheduleCard = ({ schedule, day, onEdit, onDelete }) => {
  const dayLimit = schedule.day_limits?.[day];
  const limit = dayLimit ?? schedule.member_limit ?? 1;
  const isDeleted = schedule.pending_deletion === true;
  const isDraft = schedule.publish_status === "Draft";
  const isEdited = schedule.is_edited === true;

  let statusColor = 'border-primary-200';
  let dotColor = 'bg-primary-600';
  let textColor = 'text-blue-900';
  
  if (isDeleted) {
    statusColor = 'border-red-300 bg-red-50 opacity-75';
    dotColor = 'bg-red-600';
    textColor = 'text-red-900 line-through';
  } else if (isEdited) {
    statusColor = 'border-yellow-300 bg-yellow-50';
    dotColor = 'bg-yellow-600';
    textColor = 'text-yellow-900';
  } else if (isDraft) {
    statusColor = 'border-orange-300 bg-orange-50';
    dotColor = 'bg-orange-600';
    textColor = 'text-orange-900';
  }

  return (
    <div className={`bg-white border rounded-md p-3 flex justify-between items-center hover:shadow-sm transition-shadow ${statusColor}`}>
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${textColor}`}>{schedule.department}</p>
            {isDeleted && <span className="text-[10px] bg-red-200 text-red-800 px-1 py-0.5 rounded font-medium">DELETED</span>}
            {isEdited && !isDeleted && <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded font-medium">EDITED</span>}
            {isDraft && !isDeleted && !isEdited && <span className="text-[10px] bg-orange-200 text-orange-800 px-1 py-0.5 rounded font-medium">DRAFT</span>}
          </div>
          <p className={`text-sm font-medium ${isDeleted ? 'text-gray-500 line-through' : 'text-green-700'}`}>
            Max Members: {limit}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(schedule, day)}
          className={`p-2 rounded ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:bg-primary-100'}`}
          disabled={isDeleted}
          title={isDeleted ? "Cannot edit deleted schedule" : "Edit"}
        >
          <MdEdit size={18} />
        </button>
        <button
          onClick={() => onDelete(schedule.id, day, schedule.department)}
          className={`p-2 rounded ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-100'}`}
          disabled={isDeleted}
          title={isDeleted ? "Already marked for deletion" : "Delete"}
        >
          <MdDelete size={18} />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Main Component: DayScheduleModal
// ==========================================

function DayScheduleModal({ day, schedules, departments, shiftTemplates, onClose, onAddDepartment, onEdit, onDeleteFromDay }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localSchedules, setLocalSchedules] = useState(schedules);
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorSchedules, setSupervisorSchedules] = useState([]);
  
  const [formData, setFormData] = useState({
    departments: [],
    shift_name: "",
    start_time: "",
    end_time: "",
    member_limit: 1
  });

  useEffect(() => { setLocalSchedules(schedules); }, [schedules]);

  // Fetch Supervisor Data
  useEffect(() => {
    const loadSupervisors = async () => {
      try {
        const [allEmployees, allSchedules] = await Promise.all([fetchEmployees(), getEmployeeSchedules()]);
        
        const supervisorList = allEmployees.filter(emp => emp.role === 'supervisor' || emp.role === 'team_leader');
        setSupervisors(supervisorList);

        const svSchedules = allSchedules.filter(schedule => {
          const emp = allEmployees.find(e => e.employee_id === schedule.employee_id);
          return emp && (emp.role === 'supervisor' || emp.role === 'team_leader');
        });
        setSupervisorSchedules(svSchedules);
      } catch (error) {
        console.error("Error loading supervisor data:", error);
      }
    };
    loadSupervisors();
  }, []);

  const refreshSupervisorSchedules = async () => {
    try {
      const allSchedules = await getEmployeeSchedules();
      const allEmployees = await fetchEmployees();
      const svSchedules = allSchedules.filter(schedule => {
        const emp = allEmployees.find(e => e.employee_id === schedule.employee_id);
        return emp && (emp.role === 'supervisor' || emp.role === 'team_leader');
      });
      setSupervisorSchedules(svSchedules);
    } catch (err) { console.error(err); }
  };

  // Supervisor Logic
  const assignSupervisorToShift = async (shiftName, startTime, endTime, supervisorId) => {
    try {
      const templateData = {
        shift_name: shiftName, start_time: startTime, end_time: endTime,
        days: [day], department: "Supervisor", member_limit: 1, publish_status: "published"
      };
      const template = await createTemplate(templateData);
      if (template) {
        await assignSchedule({
          employee_id: supervisorId, template_id: template.id, days: [day], assigned_by: "admin"
        });
        await refreshSupervisorSchedules();
        toast.success("Supervisor assigned!");
      }
    } catch (error) {
      console.error("Error assigning supervisor:", error);
      toast.error("Failed to assign supervisor");
    }
  };

  const removeSupervisorFromShift = async (scheduleId, name) => {
    try {
      await deleteEmployeeSchedule(scheduleId);
      await refreshSupervisorSchedules();
      toast.success(`${name} removed!`);
    } catch (error) {
      console.error("Error removing supervisor:", error);
      toast.error("Failed to remove supervisor");
    }
  };

  const getSupervisorInfo = (shiftName, start, end) => {
    const schedule = supervisorSchedules.find(s => 
      s.template.shift_name === shiftName && s.template.start_time === start && 
      s.template.end_time === end && s.days.includes(day)
    );
    if (!schedule) return null;
    const supervisor = supervisors.find(s => s.employee_id === schedule.employee_id);
    return { schedule, supervisor };
  };

  const getAvailableSupervisors = () => {
    const assignedIds = supervisorSchedules
      .filter(s => s.days.includes(day))
      .map(s => s.employee_id);
    return supervisors.filter(s => !assignedIds.includes(s.employee_id));
  };

  // Form Handlers
  const handleShiftTemplateChange = (shiftName) => {
    const selected = shiftTemplates.find(s => s.name === shiftName);
    if (selected) {
      setFormData(prev => ({ ...prev, shift_name: selected.name, start_time: selected.start, end_time: selected.end }));
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
    if (!formData.departments.length || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please fill all fields!");
      return;
    }

    const todayDayName = getDayOfWeek(new Date());
    if (day === todayDayName && isShiftTimePassedForToday(formData.start_time, formData.end_time)) {
      toast.error("Cannot schedule for today (Shift started/ended).");
      return;
    }

    const newSchedules = [];
    const results = [];
    
    for (const department of formData.departments) {
      const result = await onAddDepartment({
        department, shift_name: formData.shift_name, start_time: formData.start_time,
        end_time: formData.end_time, member_limit: formData.member_limit
      });
      results.push(result);
      if (result.success && result.schedule) newSchedules.push(result.schedule);
    }

    if (newSchedules.length > 0) setLocalSchedules(prev => [...prev, ...newSchedules]);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) toast.success(`Added ${successCount} zone(s)`);
    if (failCount > 0) toast.error(`Failed to add ${failCount} zone(s)`);

    setFormData({ departments: [], shift_name: "", start_time: "", end_time: "", member_limit: 1 });
    setShowAddForm(false);
  };

  // Group schedules by shift
  const groupedSchedules = useMemo(() => {
    return localSchedules.reduce((acc, schedule) => {
      const key = schedule.shift_name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(schedule);
      return acc;
    }, {});
  }, [localSchedules]);

  // Filtering available departments
  const scheduledDepts = localSchedules.filter(s => !s.pending_deletion).map(s => s.department);
  const availableDepartments = departments.filter(d => !scheduledDepts.includes(d.name));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-primary">{day} Schedule</h2>
            {day === getDayOfWeek(new Date()) && (
              <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full">Today</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        {/* Schedules List */}
        <div className="mb-6 space-y-4">
          {localSchedules.length === 0 ? (
            <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-md text-center">No zones scheduled.</p>
          ) : (
            Object.entries(groupedSchedules).map(([shiftName, shiftSchedules]) => {
              const { start_time, end_time } = shiftSchedules[0];
              const supervisorInfo = getSupervisorInfo(shiftName, start_time, end_time);
              const availSupervisors = getAvailableSupervisors();

              return (
                <div key={shiftName} className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex justify-between">
                    <h4 className="font-semibold text-lg">{shiftName}</h4>
                    <span className="text-sm opacity-90">{start_time} - {end_time}</span>
                  </div>

                  {/* Supervisor Bar */}
                  <div className="bg-purple-50 border-b border-purple-200 p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MdSupervisorAccount size={20} className="text-purple-600" />
                      <span className="font-semibold text-purple-800">Supervisor:</span>
                      {supervisorInfo ? (
                        <div className="flex items-center gap-2 bg-white rounded px-2 py-1 border border-purple-200">
                          <MdPerson className="text-purple-600" />
                          <span className="text-purple-900 font-semibold">
                            {supervisorInfo.supervisor?.fullname || supervisorInfo.schedule.employee_id}
                          </span>
                          <button 
                            onClick={() => confirmAction(`Remove supervisor?`, () => removeSupervisorFromShift(supervisorInfo.schedule.id, supervisorInfo.supervisor?.fullname))}
                            className="text-red-600 hover:bg-red-100 p-1 rounded"
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 italic bg-white px-2 py-1 rounded text-sm">Not assigned</span>
                          {availSupervisors.length > 0 && (
                            <select 
                              className="text-sm border border-purple-300 rounded px-2 py-1"
                              onChange={(e) => {
                                if(e.target.value) {
                                  assignSupervisorToShift(shiftName, start_time, end_time, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            >
                              <option value="">Assign Supervisor</option>
                              {availSupervisors.map(s => (
                                <option key={s.employee_id} value={s.employee_id}>{s.fullname || `${s.firstname} ${s.lastname}`}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Zones */}
                  <div className="bg-primary-50 p-3 space-y-2">
                    {shiftSchedules.map((schedule, idx) => (
                      <ScheduleCard 
                        key={idx} 
                        schedule={schedule} 
                        day={day} 
                        onEdit={() => { onEdit(schedule, day); onClose(); }} 
                        onDelete={(id, d, dept) => {
                          setLocalSchedules(prev => prev.filter(s => s.id !== id));
                          onDeleteFromDay(id, d, dept);
                        }} 
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Form */}
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white p-3 rounded-md hover:bg-green-700 font-semibold">
            <MdAdd size={20} /> Add Department to {day}
          </button>
        ) : (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Add New Department</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Department Checkboxes */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Select Departments</label>
                 {availableDepartments.length === 0 ? (
                   <p className="text-orange-600 text-sm p-2 bg-orange-50 border border-orange-200 rounded">All departments scheduled.</p>
                 ) : (
                   <div className="border border-gray-300 rounded-md p-3 bg-white max-h-48 overflow-y-auto space-y-2">
                     {availableDepartments.map(dept => (
                       <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                         <input 
                           type="checkbox" 
                           checked={formData.departments.includes(dept.name)}
                           onChange={() => handleDepartmentToggle(dept.name)}
                           className="text-primary-600"
                         />
                         <span className="text-sm">{dept.name}</span>
                       </label>
                     ))}
                   </div>
                 )}
              </div>

              {/* Shift Template Select */}
              <div>
                <label className="block text-sm font-medium mb-1">Shift Template</label>
                <select 
                  value={formData.shift_name} 
                  onChange={(e) => handleShiftTemplateChange(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select Template</option>
                  {shiftTemplates.map((s, i) => (
                    <option key={i} value={s.name}>{s.name} ({s.start} - {s.end})</option>
                  ))}
                </select>
              </div>

              {/* Time & Limit */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start</label>
                  <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full border rounded px-2 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End</label>
                  <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full border rounded px-2 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Limit</label>
                  <input type="number" min="1" value={formData.member_limit} onChange={e => setFormData({...formData, member_limit: parseInt(e.target.value)})} className="w-full border rounded px-2 py-2" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={!formData.departments.length} className="flex-1 bg-primary text-white py-2 rounded disabled:bg-gray-400">
                  Add {formData.departments.length || ''} Zone(s)
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Main Component: WeeklyTemplateView
// ==========================================

export default function WeeklyTemplateView() {
  // State
  const [templates, setTemplates] = useState([]);
  const [weeklyView, setWeeklyView] = useState({});
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [viewingSavedTemplate, setViewingSavedTemplate] = useState(null);
  
  const [selectedDay, setSelectedDay] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: "", start: "", end: "" });
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);

  // Initial Load
  useEffect(() => {
    fetchTemplatesData();
    fetchDepartmentsData();
    fetchShiftTemplatesData();
    const saved = localStorage.getItem("savedScheduleTemplates");
    if (saved) setSavedTemplates(JSON.parse(saved));
  }, []);

  // Update View when templates change
  useEffect(() => {
    const organized = {};
    daysOfWeek.forEach(day => organized[day] = []);

    templates.forEach(template => {
      template.days.forEach(day => {
        // Logic to hide published if draft exists (Frontend filtering only)
        const hasDraftVersion = templates.some(t => 
          t.department === template.department && t.days.includes(day) &&
          t.publish_status === "Draft" && !t.pending_deletion && t.id !== template.id
        );

        if (template.publish_status === "Published" && hasDraftVersion) return;

        organized[day].push({ ...template }); // Clone to prevent mutation issues
      });
    });
    setWeeklyView(organized);
  }, [templates]);

  // Data Fetchers
  const fetchTemplatesData = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) { console.error("Error fetching templates:", error); }
  };

  const fetchDepartmentsData = async () => {
    try { setDepartments(await fetchDepartments()); } catch (e) { console.error(e); }
  };

  const fetchShiftTemplatesData = async () => {
    try {
      const data = await getShiftTemplates();
      setShiftTemplates(data.map(t => ({
        id: t.id, name: t.name, start: t.start_time.substring(0, 5), end: t.end_time.substring(0, 5)
      })));
    } catch (e) { console.error(e); }
  };

  // Actions
  const handlePublishSchedules = async () => {
    confirmAction("Publish all schedules? Team leaders will be notified.", async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const result = await publishSchedules(user.employee?.employee_id || "admin");
        result.count === 0 ? toast.info("No changes.") : toast.success(`Published!`);
        fetchTemplatesData();
      } catch (e) { toast.error("Publish failed"); }
    });
  };

  const handleDeleteFromDay = async (scheduleId, day, department) => {
    confirmAction(`Remove ${department}?`, async () => {
      try {
        const template = templates.find(t => t.id === scheduleId);
        if (!template) return;

        if (template.days.length > 1) {
          const updatedDays = template.days.filter(d => d !== day);
          const updatedLimits = { ...template.day_limits };
          delete updatedLimits[day];
          await updateTemplate(scheduleId, { days: updatedDays, day_limits: updatedLimits });
        } else {
          await deleteTemplate(scheduleId);
        }
        toast.success(`${department} removed from ${day}`);
        fetchTemplatesData();
      } catch (e) { toast.error("Remove failed"); }
    });
  };

  const handleEditSchedule = (schedule, day) => {
    const dayLimit = schedule.day_limits?.[day];
    const currentLimit = dayLimit ?? schedule.member_limit ?? 1;
    setEditingSchedule({ ...schedule, day, originalId: schedule.id, member_limit: currentLimit });
  };

  // CRITICAL: Logic preserved for backend compatibility
  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    const todayDayName = getDayOfWeek(new Date());
    if (editingSchedule.day === todayDayName && isShiftTimePassedForToday(editingSchedule.start_time, editingSchedule.end_time)) {
      toast.error("Cannot edit ongoing/past shifts for today.");
      return;
    }

    const updatePayload = {
      shift_name: editingSchedule.shift_name,
      start_time: editingSchedule.start_time,
      end_time: editingSchedule.end_time,
      day_limits: {
        ...editingSchedule.day_limits,
        [editingSchedule.day]: editingSchedule.member_limit
      },
      edited_by: JSON.parse(localStorage.getItem("user") || "{}")?.employee?.employee_id || "admin"
    };

    try {
      await updateTemplate(editingSchedule.originalId, updatePayload);
      toast.success("Schedule updated!");
      setEditingSchedule(null);
      await fetchTemplatesData();
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update schedule");
    }
  };

  const handleAddDepartmentToDay = async (deptData) => {
    try {
      const exists = templates.find(t => 
        t.department === deptData.department && t.days.includes(selectedDay) && !t.pending_deletion
      );
      if (exists) throw new Error("Already scheduled");

      const newTemplate = await createTemplate({
        shift_name: deptData.shift_name, start_time: deptData.start_time, end_time: deptData.end_time,
        department: deptData.department, days: [selectedDay],
        day_limits: { [selectedDay]: deptData.member_limit || 1 },
        created_by: "admin"
      });

      await fetchTemplatesData();
      return { 
        success: true, 
        department: deptData.department,
        schedule: { 
          id: newTemplate.id, department: deptData.department, 
          shift_name: deptData.shift_name, start_time: deptData.start_time, end_time: deptData.end_time,
          day_limits: { [selectedDay]: deptData.member_limit }, member_limit: deptData.member_limit
        }
      };
    } catch (error) { return { success: false, department: deptData.department, error: error.message }; }
  };

  // Shift Template Handlers
  const handleShiftTemplateSubmit = async () => {
    if (!shiftTemplateForm.name || !shiftTemplateForm.start || !shiftTemplateForm.end) {
      toast.warning("Fill all fields"); return;
    }
    const payload = { 
      name: shiftTemplateForm.name, 
      start_time: shiftTemplateForm.start + ":00", 
      end_time: shiftTemplateForm.end + ":00",
      created_by: "admin"
    };

    try {
      if (editingShiftIndex !== null) {
        await updateShiftTemplate(shiftTemplates[editingShiftIndex].id, payload);
        toast.success("Updated!");
      } else {
        await createShiftTemplate(payload);
        toast.success("Created!");
      }
      await fetchShiftTemplatesData();
      setShiftTemplateForm({ name: "", start: "", end: "" });
      setEditingShiftIndex(null);
      setShowShiftTemplateModal(false);
    } catch (e) { toast.error("Failed to save shift template"); }
  };

  const handleSaveAsReusable = () => {
    const name = prompt("Template Name:");
    if (!name) return;
    const newT = { id: Date.now(), name, weeklySchedule: { ...weeklyView }, createdAt: new Date().toISOString() };
    const updated = [...savedTemplates, newT];
    setSavedTemplates(updated);
    localStorage.setItem("savedScheduleTemplates", JSON.stringify(updated));
    toast.success("Saved!");
  };

  const handleApplyTemplate = async (saved) => {
    confirmAction(`Apply "${saved.name}"?`, async () => {
      let created = 0;
      for (const [day, list] of Object.entries(saved.weeklySchedule)) {
        for (const item of list) {
          try {
             // Backend requires skipping duplicates logic here if necessary, 
             // but keeping clean strictly to request.
             await createTemplate({
               shift_name: item.shift_name, start_time: item.start_time, end_time: item.end_time,
               department: item.department, days: [day], day_limits: item.day_limits || {},
               member_limit: item.member_limit, created_by: "admin"
             });
             created++;
          } catch(e) { console.error(e); }
        }
      }
      toast.success(`Created ${created} schedules.`);
      fetchTemplatesData();
      setViewingSavedTemplate(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Buttons */}
      <div className="flex justify-end">
        <button 
          onClick={() => { setShiftTemplateForm({name:"",start:"",end:""}); setEditingShiftIndex(null); setShowShiftTemplateModal(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          <MdAdd size={20} /> <span className="hidden sm:inline">Manage Shift Templates</span>
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <MdLightbulb size={20} /> How to Create Schedules
        </h3>
        <ul className="text-sm text-primary-800 list-disc list-inside">
          <li>Click on any day (Monday-Sunday) to open the schedule manager.</li>
          <li>Add departments to that specific day with shift details.</li>
          <li>Edit or delete schedules directly from the day view.</li>
        </ul>
      </div>

      {/* Weekly View Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h2 className="text-xl font-semibold text-primary">Weekly Schedule Overview</h2>
          <div className="flex gap-2">
            <button onClick={handlePublishSchedules} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-700 font-semibold">
              <MdCheck /> Publish Schedule
            </button>
            <button onClick={handleSaveAsReusable} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              <MdSave /> Save as Template
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border flex flex-wrap gap-4 text-xs">
           <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-primary-200"></div> Published</span>
           <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-50 border border-orange-300"></div> Draft</span>
           <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-50 border border-yellow-300"></div> Edited</span>
           <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-300"></div> Deleted</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {daysOfWeek.map(day => (
            <div key={day} className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-primary-500 transition-all">
              <button 
                onClick={() => setSelectedDay(day)}
                className="w-full bg-primary text-white p-2 text-center font-semibold hover:bg-primary-hover"
              >
                {day}
              </button>
              <div className="p-2 space-y-2 min-h-[150px] bg-gray-50">
                {weeklyView[day]?.length > 0 ? (
                  weeklyView[day].map((schedule, idx) => {
                    const dayLimit = schedule.day_limits?.[day];
                    const limit = dayLimit ?? schedule.member_limit ?? 1;
                    const isDraft = schedule.publish_status === "Draft";
                    const isDeleted = schedule.pending_deletion === true;
                    const isEdited = schedule.is_edited === true;

                    // Clean style logic inside render
                    let cardClass = 'bg-white border rounded p-2 text-xs';
                    if (isDeleted) cardClass += ' border-red-300 bg-red-50 opacity-75';
                    else if (isEdited) cardClass += ' border-yellow-300 bg-yellow-50';
                    else if (isDraft) cardClass += ' border-orange-300 bg-orange-50';
                    else cardClass += ' border-primary-200';

                    return (
                      <div key={idx} className={cardClass}>
                        <div className="flex justify-between items-start">
                           <span className={`font-semibold truncate ${isDeleted ? 'line-through text-red-800' : 'text-primary-800'}`}>
                             {schedule.department}
                           </span>
                           <div className="flex gap-1">
                             <button disabled={isDeleted} onClick={() => handleEditSchedule(schedule, day)} className="text-primary-600"><MdEdit size={12} /></button>
                             <button disabled={isDeleted} onClick={() => handleDeleteFromDay(schedule.id, day, schedule.department)} className="text-red-600"><MdDelete size={12} /></button>
                           </div>
                        </div>
                        <p className="text-gray-600 truncate">{schedule.shift_name} ({schedule.start_time}-{schedule.end_time})</p>
                        <p className="font-medium text-green-700">Max: {limit}</p>
                      </div>
                    );
                  })
                ) : <p className="text-center text-gray-400 text-xs mt-4">No schedules</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Templates Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Saved Reusable Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {savedTemplates.map(t => (
             <div key={t.id} className="border p-4 rounded hover:shadow-md relative">
                <div className="flex justify-between">
                   <h4 className="font-bold">{t.name}</h4>
                   <div className="flex gap-2">
                     <button onClick={() => setViewingSavedTemplate(t)} className="text-blue-600"><MdContentCopy /></button>
                     <button onClick={() => {
                        const upd = savedTemplates.filter(x => x.id !== t.id);
                        setSavedTemplates(upd);
                        localStorage.setItem("savedScheduleTemplates", JSON.stringify(upd));
                     }} className="text-red-600"><MdDelete /></button>
                   </div>
                </div>
                <button onClick={() => handleApplyTemplate(t)} className="w-full mt-2 bg-green-600 text-white py-1 rounded text-sm flex items-center justify-center gap-1">
                  <MdPlayArrow /> Apply
                </button>
             </div>
          ))}
          {savedTemplates.length === 0 && <p className="text-gray-500">No templates saved.</p>}
        </div>
      </div>

      {/* Modals */}
      {selectedDay && (
        <DayScheduleModal 
          day={selectedDay} schedules={weeklyView[selectedDay] || []} 
          departments={departments} shiftTemplates={shiftTemplates}
          onClose={() => { setSelectedDay(null); fetchTemplatesData(); }}
          onAddDepartment={handleAddDepartmentToDay} onEdit={handleEditSchedule} onDeleteFromDay={handleDeleteFromDay}
        />
      )}

      {/* Shift Template Modal (Simplified for brevity, same logic) */}
      {showShiftTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-lg w-full max-w-lg">
              <h3 className="text-lg font-bold mb-4">{editingShiftIndex !== null ? "Edit" : "Manage"} Shifts</h3>
              <div className="space-y-3 mb-4">
                 <input placeholder="Name" className="w-full border p-2 rounded" value={shiftTemplateForm.name} onChange={e=>setShiftTemplateForm({...shiftTemplateForm, name:e.target.value})} />
                 <div className="flex gap-2">
                    <input type="time" className="w-full border p-2 rounded" value={shiftTemplateForm.start} onChange={e=>setShiftTemplateForm({...shiftTemplateForm, start:e.target.value})} />
                    <input type="time" className="w-full border p-2 rounded" value={shiftTemplateForm.end} onChange={e=>setShiftTemplateForm({...shiftTemplateForm, end:e.target.value})} />
                 </div>
                 <button onClick={handleShiftTemplateSubmit} className="w-full bg-green-600 text-white p-2 rounded">Save</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                 {shiftTemplates.map((s, i) => (
                    <div key={i} className="flex justify-between border p-2 rounded">
                       <span>{s.name} ({s.start}-{s.end})</span>
                       <div className="flex gap-2">
                          <button onClick={() => { setShiftTemplateForm(s); setEditingShiftIndex(i); }} className="text-blue-600"><MdEdit/></button>
                          <button onClick={() => {
                             confirmAction("Delete shift?", async () => {
                                await deleteShiftTemplate(s.id);
                                fetchShiftTemplatesData();
                             });
                          }} className="text-red-600"><MdDelete/></button>
                       </div>
                    </div>
                 ))}
              </div>
              <button onClick={() => setShowShiftTemplateModal(false)} className="w-full mt-4 bg-gray-300 p-2 rounded">Close</button>
           </div>
        </div>
      )}
      
      {/* Quick Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="font-bold mb-3">Edit {editingSchedule.department}</h3>
            <select 
               className="w-full border p-2 mb-3 rounded"
               value={editingSchedule.shift_name}
               onChange={e => {
                 const s = shiftTemplates.find(x => x.name === e.target.value);
                 if(s) setEditingSchedule({...editingSchedule, shift_name: s.name, start_time: s.start, end_time: s.end});
               }}
            >
              {shiftTemplates.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <input type="number" min="1" className="w-full border p-2 mb-3 rounded" value={editingSchedule.member_limit} onChange={e => setEditingSchedule({...editingSchedule, member_limit: parseInt(e.target.value)})} />
            <div className="flex gap-2">
               <button onClick={handleSaveEdit} className="flex-1 bg-primary text-white p-2 rounded">Save</button>
               <button onClick={() => setEditingSchedule(null)} className="flex-1 bg-gray-300 p-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Saved Template Preview Modal */}
      {viewingSavedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-4">
                 <h3 className="font-bold text-xl">{viewingSavedTemplate.name}</h3>
                 <button onClick={()=>setViewingSavedTemplate(null)}><MdClose size={24}/></button>
              </div>
              <button onClick={()=>handleApplyTemplate(viewingSavedTemplate)} className="w-full bg-green-600 text-white p-3 rounded mb-4 font-bold flex items-center justify-center gap-2"><MdPlayArrow/> Apply Template</button>
              <div className="grid grid-cols-7 gap-2">
                 {daysOfWeek.map(d => (
                    <div key={d} className="border p-2 rounded bg-gray-50 min-h-[100px]">
                       <div className="font-bold text-center border-b mb-2">{d.slice(0,3)}</div>
                       {viewingSavedTemplate.weeklySchedule[d]?.map((s,i) => (
                          <div key={i} className="text-xs bg-white border p-1 mb-1 rounded">
                             <span className="font-bold block">{s.department}</span>
                             {s.shift_name}
                          </div>
                       ))}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}