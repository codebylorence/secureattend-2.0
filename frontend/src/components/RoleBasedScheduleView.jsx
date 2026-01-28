import { useState, useEffect, useMemo } from "react";
import { 
  MdEdit, MdDelete, MdAdd, MdLightbulb, MdSupervisorAccount, MdPerson,
  MdAdminPanelSettings, MdAssignment
} from "react-icons/md";
import { toast } from 'react-toastify';

// API Imports
import { 
  getEmployeeSchedules, assignSchedule, deleteEmployeeSchedule 
} from "../api/ScheduleApi";
import { 
  getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate 
} from "../api/ShiftTemplateApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { confirmAction } from "../utils/confirmToast.jsx";

// ==========================================
// Shared Helper Functions
// ==========================================

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getDayOfWeek = (date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

// ==========================================
// Sub-Components
// ==========================================

// Role Assignment Card Component
const RoleAssignmentCard = ({ assignment, day, onEdit, onDelete }) => {
  const isDeleted = assignment.pending_deletion === true;
  
  let statusColor = 'border-blue-200 bg-blue-50';
  let dotColor = 'bg-blue-600';
  let textColor = 'text-blue-900';
  
  if (isDeleted) {
    statusColor = 'border-red-300 bg-red-50 opacity-75';
    dotColor = 'bg-red-600';
    textColor = 'text-red-900 line-through';
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'supervisor':
        return <MdSupervisorAccount size={20} className="text-purple-600" />;
      case 'admin':
        return <MdAdminPanelSettings size={20} className="text-blue-600" />;
      default:
        return <MdPerson size={20} className="text-gray-600" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'supervisor':
        return 'text-purple-700 bg-purple-100';
      case 'admin':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white border rounded-md p-3 flex justify-between items-center hover:shadow-sm transition-shadow ${statusColor}`}>
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
        <div className="flex items-center gap-2">
          {getRoleIcon(assignment.employee?.role)}
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-semibold ${textColor}`}>
                {assignment.employee?.fullname || `${assignment.employee?.firstname} ${assignment.employee?.lastname}` || assignment.employee_id}
              </p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(assignment.employee?.role)}`}>
                {assignment.employee?.role?.toUpperCase() || 'UNKNOWN'}
              </span>
              {isDeleted && <span className="text-[10px] bg-red-200 text-red-800 px-1 py-0.5 rounded font-medium">DELETED</span>}
            </div>
            <p className={`text-sm ${isDeleted ? 'text-gray-500 line-through' : 'text-green-700'}`}>
              {assignment.template?.shift_name} ({assignment.template?.start_time} - {assignment.template?.end_time})
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(assignment, day)}
          className={`p-2 rounded ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
          disabled={isDeleted}
          title={isDeleted ? "Cannot edit deleted assignment" : "Edit"}
        >
          <MdEdit size={18} />
        </button>
        <button
          onClick={() => onDelete(assignment.id, day, assignment.employee?.fullname || assignment.employee_id)}
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
// Main Component: RoleScheduleModal
// ==========================================

function RoleScheduleModal({ day, assignments, shiftTemplates, onClose, onAddAssignment, onEdit, onDeleteFromDay }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localAssignments, setLocalAssignments] = useState(assignments);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [availableWarehouseAdmins, setAvailableWarehouseAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    supervisor_id: "",
    warehouse_admin_id: "",
    shift_template_id: "",
    shift_name: "",
    start_time: "",
    end_time: ""
  });

  useEffect(() => { setLocalAssignments(assignments); }, [assignments]);

  // Fetch available supervisors and warehouse admins
  useEffect(() => {
    const loadAvailableEmployees = async () => {
      try {
        setLoading(true);
        const [allEmployees, allSchedules] = await Promise.all([fetchEmployees(), getEmployeeSchedules()]);
        
        // Filter out inactive employees first
        const activeEmployees = allEmployees.filter(emp => emp.status === 'Active');
        
        // Filter for supervisors and warehouse admins separately
        const supervisors = activeEmployees.filter(emp => emp.role === 'supervisor');
        const warehouseAdmins = activeEmployees.filter(emp => emp.role === 'admin');
        
        console.log(`👥 Loaded ${supervisors.length} active supervisors and ${warehouseAdmins.length} active admins for role-based scheduling`);
        
        // Get already assigned employee IDs for this day
        const assignedIds = allSchedules
          .filter(schedule => schedule.days.includes(day))
          .map(schedule => schedule.employee_id);
        
        // Filter out already assigned employees
        const availableSups = supervisors.filter(emp => !assignedIds.includes(emp.employee_id));
        const availableWAdmins = warehouseAdmins.filter(emp => !assignedIds.includes(emp.employee_id));
        
        setAvailableSupervisors(availableSups);
        setAvailableWarehouseAdmins(availableWAdmins);
      } catch (error) {
        console.error("Error loading available employees:", error);
        toast.error("Failed to load available employees");
      } finally {
        setLoading(false);
      }
    };
    
    if (showAddForm) {
      loadAvailableEmployees();
    }
  }, [showAddForm, day]);

  // Handle shift template selection
  const handleShiftTemplateChange = (templateId) => {
    const selected = shiftTemplates.find(s => s.id === parseInt(templateId));
    if (selected) {
      setFormData(prev => ({
        ...prev,
        shift_template_id: templateId,
        shift_name: selected.name,
        start_time: selected.start_time.substring(0, 5),
        end_time: selected.end_time.substring(0, 5)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supervisor_id || !formData.warehouse_admin_id || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please select both supervisor and warehouse admin, and fill all fields!");
      return;
    }

    try {
      setLoading(true);
      
      // Create assignments for both supervisor and warehouse admin
      const supervisorResult = await onAddAssignment({
        employee_id: formData.supervisor_id,
        shift_name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        day: day
      });

      const warehouseAdminResult = await onAddAssignment({
        employee_id: formData.warehouse_admin_id,
        shift_name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        day: day
      });

      if (supervisorResult.success && warehouseAdminResult.success) {
        setLocalAssignments(prev => [...prev, supervisorResult.assignment, warehouseAdminResult.assignment]);
        toast.success("Both supervisor and warehouse admin assigned successfully!");
        setFormData({
          supervisor_id: "",
          warehouse_admin_id: "",
          shift_template_id: "",
          shift_name: "",
          start_time: "",
          end_time: ""
        });
        setShowAddForm(false);
      } else {
        const errors = [];
        if (!supervisorResult.success) errors.push(`Supervisor: ${supervisorResult.error}`);
        if (!warehouseAdminResult.success) errors.push(`Warehouse Admin: ${warehouseAdminResult.error}`);
        toast.error(`Failed to create assignments: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error("Error creating assignments:", error);
      toast.error("Failed to create assignments");
    } finally {
      setLoading(false);
    }
  };

  // Group assignments by shift
  const groupedAssignments = useMemo(() => {
    return localAssignments.reduce((acc, assignment) => {
      const key = `${assignment.template?.shift_name}-${assignment.template?.start_time}-${assignment.template?.end_time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(assignment);
      return acc;
    }, {});
  }, [localAssignments]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <MdAssignment size={28} className="text-blue-600" />
            <div>
              <h2 className="text-2xl font-semibold text-blue-600">{day} Role Assignments</h2>
              <p className="text-sm text-gray-600">Assign both supervisor and warehouse admin to shifts</p>
            </div>
            {day === getDayOfWeek(new Date()) && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">Today</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        {/* Assignments List */}
        <div className="mb-6 space-y-4">
          {localAssignments.length === 0 ? (
            <div className="text-center py-8">
              <MdAssignment size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">No role assignments for {day}</p>
              <p className="text-gray-400 text-sm">Add supervisors or admins to manage this day</p>
            </div>
          ) : (
            Object.entries(groupedAssignments).map(([shiftKey, shiftAssignments]) => {
              const { shift_name, start_time, end_time } = shiftAssignments[0].template;

              return (
                <div key={shiftKey} className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <MdSupervisorAccount size={24} />
                      <div>
                        <h4 className="font-semibold text-lg">{shift_name}</h4>
                        <p className="text-sm opacity-90">{start_time} - {end_time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90">Assigned</p>
                      <p className="font-bold text-lg">{shiftAssignments.length}</p>
                    </div>
                  </div>

                  {/* Role Assignments */}
                  <div className="bg-blue-50 p-3 space-y-2">
                    {shiftAssignments.map((assignment, idx) => (
                      <RoleAssignmentCard 
                        key={idx} 
                        assignment={assignment} 
                        day={day} 
                        onEdit={() => { onEdit(assignment, day); onClose(); }} 
                        onDelete={(id, d, name) => {
                          setLocalAssignments(prev => prev.filter(a => a.id !== id));
                          onDeleteFromDay(id, d, name);
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
          <button 
            onClick={() => setShowAddForm(true)} 
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 font-semibold transition-colors"
          >
            <MdAdd size={20} /> Assign Supervisor & Warehouse Admin to {day}
          </button>
        ) : (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MdAssignment size={20} />
              Assign Supervisor and Warehouse Admin
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Supervisor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Supervisor <span className="text-red-500">*</span>
                </label>
                {loading ? (
                  <div className="w-full border border-gray-300 rounded-md p-3 bg-gray-100 text-center">
                    Loading available supervisors...
                  </div>
                ) : availableSupervisors.length === 0 ? (
                  <div className="w-full border border-orange-300 rounded-md p-3 bg-orange-50 text-orange-700 text-center">
                    No available supervisors for this day
                  </div>
                ) : (
                  <select 
                    value={formData.supervisor_id} 
                    onChange={(e) => setFormData({...formData, supervisor_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Supervisor</option>
                    {availableSupervisors.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.fullname || `${emp.firstname} ${emp.lastname}`} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Warehouse Admin Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Warehouse Admin <span className="text-red-500">*</span>
                </label>
                {loading ? (
                  <div className="w-full border border-gray-300 rounded-md p-3 bg-gray-100 text-center">
                    Loading available warehouse admins...
                  </div>
                ) : availableWarehouseAdmins.length === 0 ? (
                  <div className="w-full border border-orange-300 rounded-md p-3 bg-orange-50 text-orange-700 text-center">
                    No available warehouse admins for this day
                  </div>
                ) : (
                  <select 
                    value={formData.warehouse_admin_id} 
                    onChange={(e) => setFormData({...formData, warehouse_admin_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Warehouse Admin</option>
                    {availableWarehouseAdmins.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.fullname || `${emp.firstname} ${emp.lastname}`} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Shift Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift Template</label>
                <select 
                  value={formData.shift_template_id} 
                  onChange={(e) => handleShiftTemplateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Shift Template</option>
                  {shiftTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Fields (Auto-filled from template) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.start_time} 
                    onChange={e => setFormData({...formData, start_time: e.target.value})} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input 
                    type="time" 
                    value={formData.end_time} 
                    onChange={e => setFormData({...formData, end_time: e.target.value})} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={loading || !formData.supervisor_id || !formData.warehouse_admin_id || availableSupervisors.length === 0 || availableWarehouseAdmins.length === 0} 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? "Assigning..." : "Assign Both Roles"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 font-medium transition-colors"
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

// ==========================================
// Main Component: RoleBasedScheduleView
// ==========================================

export default function RoleBasedScheduleView() {
  // State
  const [assignments, setAssignments] = useState([]);
  const [weeklyView, setWeeklyView] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: "", start: "", end: "" });
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchAssignmentsData();
    fetchShiftTemplatesData();
  }, []);

  // Update View when assignments change
  useEffect(() => {
    const organized = {};
    daysOfWeek.forEach(day => organized[day] = []);

    assignments.forEach(assignment => {
      assignment.days.forEach(day => {
        organized[day].push({ ...assignment });
      });
    });
    setWeeklyView(organized);
  }, [assignments]);

  // Data Fetchers
  const fetchAssignmentsData = async () => {
    try {
      setLoading(true);
      const [schedules, employees] = await Promise.all([getEmployeeSchedules(), fetchEmployees()]);
      
      // Keep all employees for schedule display (including inactive ones with existing schedules)
      // but note that new assignments will only use active employees from the other function
      
      // Filter for supervisor and admin assignments only
      const roleBasedSchedules = schedules.filter(schedule => {
        const employee = employees.find(emp => emp.employee_id === schedule.employee_id);
        return employee && (employee.role === 'supervisor' || employee.role === 'admin');
      });

      // Attach employee data to assignments
      const enrichedAssignments = roleBasedSchedules.map(schedule => ({
        ...schedule,
        employee: employees.find(emp => emp.employee_id === schedule.employee_id)
      }));

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load role assignments");
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftTemplatesData = async () => {
    try {
      const data = await getShiftTemplates();
      setShiftTemplates(data);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      toast.error("Failed to load shift templates");
    }
  };

  // Actions
  const handleDeleteFromDay = async (assignmentId, day, employeeName) => {
    confirmAction(`Remove ${employeeName} from ${day}?`, async () => {
      try {
        await deleteEmployeeSchedule(assignmentId);
        toast.success(`${employeeName} removed from ${day}`);
        fetchAssignmentsData();
      } catch (error) {
        console.error("Error removing assignment:", error);
        toast.error("Failed to remove assignment");
      }
    });
  };

  const handleAddAssignment = async (assignmentData) => {
    try {
      // Create assignment using existing API
      const result = await assignSchedule({
        employee_id: assignmentData.employee_id,
        shift_name: assignmentData.shift_name,
        start_time: assignmentData.start_time,
        end_time: assignmentData.end_time,
        days: [assignmentData.day],
        assigned_by: "admin"
      });

      await fetchAssignmentsData();
      return { success: true, assignment: result };
    } catch (error) {
      console.error("Error creating assignment:", error);
      return { success: false, error: error.message };
    }
  };

  // Shift Template Handlers
  const handleShiftTemplateSubmit = async () => {
    if (!shiftTemplateForm.name || !shiftTemplateForm.start || !shiftTemplateForm.end) {
      toast.warning("Fill all fields");
      return;
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
        toast.success("Shift template updated!");
      } else {
        await createShiftTemplate(payload);
        toast.success("Shift template created!");
      }
      await fetchShiftTemplatesData();
      setShiftTemplateForm({ name: "", start: "", end: "" });
      setEditingShiftIndex(null);
      setShowShiftTemplateModal(false);
    } catch (error) {
      console.error("Error saving shift template:", error);
      toast.error("Failed to save shift template");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading role assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MdSupervisorAccount size={28} className="text-blue-600" />
            Role-Based Scheduling
          </h2>
          <p className="text-gray-600 mt-1">Assign both supervisor and warehouse admin to shifts across the week</p>
        </div>
        <button 
          onClick={() => { 
            setShiftTemplateForm({name:"",start:"",end:""}); 
            setEditingShiftIndex(null); 
            setShowShiftTemplateModal(true); 
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <MdAdd size={20} /> 
          <span className="hidden sm:inline">Manage Shift Templates</span>
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <MdLightbulb size={20} /> How to Manage Role Assignments
        </h3>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>Click on any day to assign both a supervisor and warehouse admin to shifts</li>
          <li>Both roles must be assigned together for each shift</li>
          <li>Only employees with supervisor or admin roles can be assigned</li>
          <li>Each employee can only be assigned to one shift per day</li>
          <li>Use shift templates to maintain consistent scheduling</li>
        </ul>
      </div>

      {/* Weekly View Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h3 className="text-xl font-semibold text-gray-800">Weekly Role Assignment Overview</h3>
          <div className="text-sm text-gray-600">
            Total Assignments: {assignments.length}
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {daysOfWeek.map(day => (
            <div key={day} className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-blue-500 transition-all">
              <button 
                onClick={() => setSelectedDay(day)}
                className="w-full bg-blue-600 text-white p-2 text-center font-semibold hover:bg-blue-700 transition-colors"
              >
                {day}
              </button>
              <div className="p-2 space-y-2 min-h-[150px] bg-gray-50">
                {weeklyView[day]?.length > 0 ? (
                  weeklyView[day].map((assignment, idx) => {
                    const getRoleColor = (role) => {
                      switch (role) {
                        case 'supervisor':
                          return 'bg-purple-100 border-purple-300 text-purple-800';
                        case 'admin':
                          return 'bg-blue-100 border-blue-300 text-blue-800';
                        default:
                          return 'bg-gray-100 border-gray-300 text-gray-800';
                      }
                    };

                    return (
                      <div key={idx} className={`border rounded p-2 text-xs ${getRoleColor(assignment.employee?.role)}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold truncate">
                            {assignment.employee?.fullname || assignment.employee_id}
                          </span>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit
                              }} 
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <MdEdit size={12} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFromDay(assignment.id, day, assignment.employee?.fullname || assignment.employee_id);
                              }} 
                              className="text-red-600 hover:text-red-800"
                            >
                              <MdDelete size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 truncate text-[10px]">
                          {assignment.template?.shift_name}
                        </p>
                        <p className="text-gray-600 truncate text-[10px]">
                          {assignment.template?.start_time?.substring(0, 5)} - {assignment.template?.end_time?.substring(0, 5)}
                        </p>
                        <span className="inline-block text-[9px] px-1 py-0.5 rounded font-medium bg-white bg-opacity-70">
                          {assignment.employee?.role?.toUpperCase()}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-400 text-xs mt-8">
                    <MdAssignment size={24} className="mx-auto mb-2 opacity-50" />
                    <p>No assignments</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedDay && (
        <RoleScheduleModal 
          day={selectedDay} 
          assignments={weeklyView[selectedDay] || []} 
          shiftTemplates={shiftTemplates}
          onClose={() => { setSelectedDay(null); fetchAssignmentsData(); }}
          onAddAssignment={handleAddAssignment} 
          onEdit={() => {}} // TODO: Implement edit functionality
          onDeleteFromDay={handleDeleteFromDay}
        />
      )}

      {/* Shift Template Modal */}
      {showShiftTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MdAdd size={20} />
              {editingShiftIndex !== null ? "Edit" : "Manage"} Shift Templates
            </h3>
            
            <div className="space-y-3 mb-4">
              <input 
                placeholder="Shift Name (e.g., Morning Shift)" 
                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={shiftTemplateForm.name} 
                onChange={e => setShiftTemplateForm({...shiftTemplateForm, name: e.target.value})} 
              />
              <div className="flex gap-2">
                <input 
                  type="time" 
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={shiftTemplateForm.start} 
                  onChange={e => setShiftTemplateForm({...shiftTemplateForm, start: e.target.value})} 
                />
                <input 
                  type="time" 
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={shiftTemplateForm.end} 
                  onChange={e => setShiftTemplateForm({...shiftTemplateForm, end: e.target.value})} 
                />
              </div>
              <button 
                onClick={handleShiftTemplateSubmit} 
                className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 font-medium transition-colors"
              >
                {editingShiftIndex !== null ? "Update" : "Create"} Shift Template
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 border-t pt-4">
              <h4 className="font-semibold text-gray-700 mb-2">Existing Templates</h4>
              {shiftTemplates.map((template, i) => (
                <div key={i} className="flex justify-between items-center border p-2 rounded-md bg-gray-50">
                  <span className="text-sm">
                    {template.name} ({template.start_time?.substring(0, 5)} - {template.end_time?.substring(0, 5)})
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { 
                        setShiftTemplateForm({
                          name: template.name,
                          start: template.start_time?.substring(0, 5) || "",
                          end: template.end_time?.substring(0, 5) || ""
                        }); 
                        setEditingShiftIndex(i); 
                      }} 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <MdEdit size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        confirmAction("Delete shift template?", async () => {
                          try {
                            await deleteShiftTemplate(template.id);
                            await fetchShiftTemplatesData();
                            toast.success("Shift template deleted!");
                          } catch (error) {
                            console.error("Error deleting template:", error);
                            toast.error("Failed to delete template");
                          }
                        });
                      }} 
                      className="text-red-600 hover:text-red-800"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {shiftTemplates.length === 0 && (
                <p className="text-gray-500 text-center py-4">No shift templates created yet</p>
              )}
            </div>
            
            <button 
              onClick={() => setShowShiftTemplateModal(false)} 
              className="w-full mt-4 bg-gray-300 text-gray-700 p-2 rounded-md hover:bg-gray-400 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}