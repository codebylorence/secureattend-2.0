import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { 
  MdAdd, MdEdit, MdDelete, MdClose, MdCalendarToday,
  MdInfo, MdCheck, MdPeople, MdPersonAdd, MdLocationOn, MdSupervisorAccount, MdAdminPanelSettings
} from "react-icons/md";
import { toast } from 'react-toastify';

import { 
  getTemplates, deleteTemplate, removeEmployeesFromTemplate, createTemplate, updateTemplate, assignEmployees
} from "../api/ScheduleApi";
import { 
  getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate
} from "../api/ShiftTemplateApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { confirmAction } from "../utils/confirmToast.jsx";
import { formatTime24Short } from "../utils/timeFormat";

// ==========================================
// Helper Functions
// ==========================================

const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

const getShiftColor = (shiftName) => {
  const colors = {
    'Opening': '#22c55e',
    'Closing': '#3b82f6', 
    'Graveyard': '#8b5cf6',
    'Morning': '#f59e0b',
    'Afternoon': '#ef4444',
    'Evening': '#6366f1',
    'Night': '#7c3aed',
  };
  
  for (const [key, color] of Object.entries(colors)) {
    if (shiftName.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  
  return '#6b7280'; // Default gray
};

// ==========================================
// Schedule Modal Component
// ==========================================

function ScheduleModal({ selectedDate, reassignShiftData, onClose, onSave, departments, shiftTemplates, existingSchedules, onEditSchedule, onDeleteSchedule }) {
  const [formData, setFormData] = useState({
    departments: [],
    shift_name: "",
    start_time: "",
    end_time: "",
    member_limit: 1
  });
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedScheduleForAssign, setSelectedScheduleForAssign] = useState(null);

  // Pre-populate form data when reassigning
  useEffect(() => {
    if (reassignShiftData) {
      // Get already assigned zones and roles
      const assignedZones = reassignShiftData.existingZones?.map(zone => zone.department) || [];
      const assignedRoleIds = [];
      
      // Get individual role assignments (supervisors and admins)
      if (reassignShiftData.existingRoles) {
        reassignShiftData.existingRoles.forEach(role => {
          if (role.members) {
            role.members.forEach(member => {
              // Determine if this is a supervisor or admin based on employee data
              const employee = employees.find(emp => emp.employee_id === member.employee_id);
              if (employee) {
                if (employee.role === 'supervisor') {
                  assignedRoleIds.push(`supervisor_${member.employee_id}`);
                } else if (employee.role === 'admin') {
                  assignedRoleIds.push(`admin_${member.employee_id}`);
                }
              }
            });
          }
        });
      }
      
      setFormData(prev => ({
        ...prev,
        shift_name: reassignShiftData.shift_name,
        start_time: reassignShiftData.start_time,
        end_time: reassignShiftData.end_time,
        departments: [...assignedZones, ...assignedRoleIds] // Pre-select already assigned items
      }));
    }
  }, [reassignShiftData, employees]);

  // Fetch employees when modal opens
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeesData = await fetchEmployees();
        // Filter out inactive employees for scheduling
        const activeEmployees = employeesData.filter(emp => emp.status === 'Active');
        console.log(`👥 Loaded ${activeEmployees.length} active employees for scheduling (filtered from ${employeesData.length} total)`);
        setEmployees(activeEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    loadEmployees();
  }, []);

  const dateStr = selectedDate ? formatDateForAPI(selectedDate) : "";
  const dayName = selectedDate ? getDayName(selectedDate) : "";
  
  // Get existing schedules for this specific date
  const daySchedules = existingSchedules.filter(schedule => 
    schedule.specific_date === dateStr
  );
  
  // Filter departments based on whether we're reassigning or creating new
  let scheduledDepts, availableDepartments, existingAssignedZones, existingAssignedRoles;
  
  if (reassignShiftData) {
    // When reassigning, show all departments (including already assigned ones)
    // but mark which ones are already assigned
    existingAssignedZones = reassignShiftData.existingZones?.map(zone => zone.department) || [];
    existingAssignedRoles = reassignShiftData.existingRoles?.length > 0 ? ['Role-Based'] : [];
    
    // Show all departments except Role-Based for zone selection
    availableDepartments = departments.filter(dept => dept.name !== 'Role-Based');
  } else {
    // Normal creation: filter out departments already scheduled for this date
    scheduledDepts = daySchedules.map(schedule => schedule.department);
    availableDepartments = departments.filter(dept => 
      !scheduledDepts.includes(dept.name) && dept.name !== 'Role-Based'
    );
    existingAssignedZones = [];
    existingAssignedRoles = [];
  }

  const handleShiftTemplateChange = (shiftName) => {
    const selected = shiftTemplates.find(s => s.name === shiftName);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        shift_name: selected.name,
        start_time: selected.start_time.substring(0, 5),
        end_time: selected.end_time.substring(0, 5)
      }));
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

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      setLoading(true);
      const updatePayload = {
        shift_name: editingSchedule.shift_name,
        start_time: editingSchedule.start_time,
        end_time: editingSchedule.end_time,
        member_limit: editingSchedule.member_limit,
        edited_by: "admin"
      };

      await updateTemplate(editingSchedule.id, updatePayload);
      toast.success("Schedule updated!");
      setEditingSchedule(null);
      onSave();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployees = (schedule) => {
    setSelectedScheduleForAssign(schedule);
    setShowAssignModal(true);
  };

  const handleDeleteSchedule = async (scheduleId, department) => {
    confirmAction(`Delete ${department} schedule for ${dateStr}?`, async () => {
      try {
        await onDeleteSchedule(scheduleId, dayName, department);
        onSave();
      } catch (error) {
        console.error("Error deleting schedule:", error);
        toast.error("Failed to delete schedule");
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.departments.length || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please select a shift and at least one zone or management role!");
      return;
    }

    setLoading(true);
    
    try {
      const results = [];
      
      if (reassignShiftData) {
        // When reassigning, handle both additions and removals
        
        // Get currently assigned items
        const existingZones = reassignShiftData.existingZones?.map(zone => zone.department) || [];
        const existingRoleIds = [];
        
        if (reassignShiftData.existingRoles) {
          reassignShiftData.existingRoles.forEach(role => {
            if (role.members) {
              role.members.forEach(member => {
                const employee = employees.find(emp => emp.employee_id === member.employee_id);
                if (employee) {
                  if (employee.role === 'supervisor') {
                    existingRoleIds.push(`supervisor_${member.employee_id}`);
                  } else if (employee.role === 'admin') {
                    existingRoleIds.push(`admin_${member.employee_id}`);
                  }
                }
              });
            }
          });
        }
        
        const currentlyAssigned = [...existingZones, ...existingRoleIds];
        const selectedItems = formData.departments;
        
        // Find items to add (selected but not currently assigned)
        const itemsToAdd = selectedItems.filter(item => !currentlyAssigned.includes(item));
        
        // Find items to remove (currently assigned but not selected)
        const itemsToRemove = currentlyAssigned.filter(item => !selectedItems.includes(item));
        
        // Remove unchecked items
        for (const itemToRemove of itemsToRemove) {
          try {
            if (itemToRemove.startsWith('supervisor_') || itemToRemove.startsWith('admin_')) {
              // Remove individual role assignment
              const employeeId = itemToRemove.replace('supervisor_', '').replace('admin_', '');
              const roleTemplate = reassignShiftData.existingRoles?.[0]; // All roles share same template
              if (roleTemplate) {
                await removeEmployeesFromTemplate(roleTemplate.template_id, [employeeId]);
                results.push({ success: true, action: 'removed', item: itemToRemove });
              }
            } else {
              // Remove zone template
              const zoneToRemove = reassignShiftData.existingZones?.find(zone => zone.department === itemToRemove);
              if (zoneToRemove) {
                await deleteTemplate(zoneToRemove.template_id);
                results.push({ success: true, action: 'removed', item: itemToRemove });
              }
            }
          } catch (error) {
            console.error(`Error removing ${itemToRemove}:`, error);
            results.push({ success: false, action: 'removed', item: itemToRemove, error: error.message });
          }
        }
        
        // Add new items (only process items that are new)
        if (itemsToAdd.length > 0) {
          const roleDepartments = itemsToAdd.filter(dept => 
            dept.startsWith('supervisor_') || dept.startsWith('admin_')
          );
          const zoneDepartments = itemsToAdd.filter(dept => 
            !dept.startsWith('supervisor_') && !dept.startsWith('admin_')
          );
          
          // Handle new role-based assignments
          if (roleDepartments.length > 0) {
            try {
              // Find any existing Role-Based template for this shift and date
              let existingRoleTemplate = null;
              
              // Check if we have existing roles from reassign data
              if (reassignShiftData?.existingRoles && reassignShiftData.existingRoles.length > 0) {
                // Use the first Role-Based template (they should all be merged anyway)
                existingRoleTemplate = { template_id: reassignShiftData.existingRoles[0].template_id };
                console.log('🔄 Using existing Role-Based template from reassign data:', existingRoleTemplate.template_id);
              } else {
                // If not found in reassignShiftData, check all templates for this date and shift
                console.log('🔍 Searching for existing Role-Based template...');
                const existingTemplates = await getTemplates();
                const roleBasedTemplate = existingTemplates.find(template => 
                  template.specific_date === dateStr &&
                  template.shift_name === formData.shift_name &&
                  template.department === 'Role-Based'
                );
                
                if (roleBasedTemplate) {
                  existingRoleTemplate = { template_id: roleBasedTemplate.id };
                  console.log('✅ Found existing Role-Based template:', roleBasedTemplate.id);
                } else {
                  console.log('❌ No existing Role-Based template found');
                }
              }
              
              if (existingRoleTemplate) {
                // Add to existing Role-Based template
                console.log('➕ Adding roles to existing template:', existingRoleTemplate.template_id);
                const selectedEmployeeIds = roleDepartments.map(dept => {
                  if (dept.startsWith('supervisor_')) {
                    return dept.replace('supervisor_', '');
                  } else if (dept.startsWith('admin_')) {
                    return dept.replace('admin_', '');
                  }
                  return null;
                }).filter(id => id !== null);
                
                if (selectedEmployeeIds.length > 0) {
                  await assignEmployees({
                    template_id: existingRoleTemplate.template_id,
                    employee_ids: selectedEmployeeIds,
                    assigned_by: 'admin'
                  });
                  
                  results.push({ success: true, action: 'added', item: 'Management Roles' });
                }
              } else {
                // Create new Role-Based template only if none exists
                console.log('🆕 Creating new Role-Based template');
                const templateData = {
                  shift_name: formData.shift_name,
                  start_time: formData.start_time,
                  end_time: formData.end_time,
                  department: 'Role-Based',
                  specific_date: dateStr,
                  member_limit: null, // No member limit for Role-Based templates
                  created_by: "admin"
                };
                
                const result = await createTemplate(templateData);
                console.log('✅ Created new Role-Based template:', result.id);
                
                const selectedEmployeeIds = roleDepartments.map(dept => {
                  if (dept.startsWith('supervisor_')) {
                    return dept.replace('supervisor_', '');
                  } else if (dept.startsWith('admin_')) {
                    return dept.replace('admin_', '');
                  }
                  return null;
                }).filter(id => id !== null);
                
                if (selectedEmployeeIds.length > 0) {
                  await assignEmployees({
                    template_id: result.id,
                    employee_ids: selectedEmployeeIds,
                    assigned_by: 'admin'
                  });
                }
                
                results.push({ success: true, action: 'added', item: 'Management Roles' });
              }
            } catch (error) {
              console.error(`Error adding management roles:`, error);
              results.push({ success: false, action: 'added', item: 'Management Roles', error: error.message });
            }
          }
          
          // Handle new zone-based assignments
          for (const department of zoneDepartments) {
            try {
              // Check if this zone already has a shift scheduled for this date
              const existingTemplates = await getTemplates();
              const existingZoneShift = existingTemplates.find(template => 
                template.specific_date === dateStr &&
                template.department === department &&
                template.department !== 'Role-Based' // Exclude role-based templates
              );
              
              if (existingZoneShift) {
                results.push({ 
                  success: false, 
                  action: 'added', 
                  item: department, 
                  error: `${department} already has a ${existingZoneShift.shift_name} shift scheduled for this date. Only one shift per zone per day is allowed.` 
                });
                continue; // Skip creating this template
              }
              
              const templateData = {
                shift_name: formData.shift_name,
                start_time: formData.start_time,
                end_time: formData.end_time,
                department: department,
                specific_date: dateStr,
                member_limit: formData.member_limit,
                created_by: "admin"
              };
              
              const result = await createTemplate(templateData);
              results.push({ success: true, action: 'added', item: department });
            } catch (error) {
              console.error(`Error adding ${department}:`, error);
              results.push({ success: false, action: 'added', item: department, error: error.message });
            }
          }
        }
        
        // Show results
        const addedCount = results.filter(r => r.success && r.action === 'added').length;
        const removedCount = results.filter(r => r.success && r.action === 'removed').length;
        const failCount = results.filter(r => !r.success).length;
        
        if (addedCount > 0 || removedCount > 0) {
          let message = '';
          if (addedCount > 0) message += `Added ${addedCount} item(s)`;
          if (removedCount > 0) {
            if (message) message += ', ';
            message += `Removed ${removedCount} item(s)`;
          }
          toast.success(message);
          onSave();
        }
        if (failCount > 0) {
          toast.error(`Failed to process ${failCount} item(s)`);
        }
        
      } else {
        // Original creation logic for new schedules
        // Separate role-based and zone-based departments
        const roleDepartments = formData.departments.filter(dept => 
          dept.startsWith('supervisor_') || dept.startsWith('admin_')
        );
        const zoneDepartments = formData.departments.filter(dept => 
          !dept.startsWith('supervisor_') && !dept.startsWith('admin_')
        );
        
        // Handle role-based scheduling (Individual supervisors & admins)
        if (roleDepartments.length > 0) {
          try {
            const templateData = {
              shift_name: formData.shift_name,
              start_time: formData.start_time,
              end_time: formData.end_time,
              department: 'Role-Based',
              specific_date: dateStr,
              member_limit: null, // No member limit for Role-Based templates
              created_by: "admin"
            };
            
            const result = await createTemplate(templateData);
            
            // Get the specific employees selected
            const selectedEmployeeIds = roleDepartments.map(dept => {
              if (dept.startsWith('supervisor_')) {
                return dept.replace('supervisor_', '');
              } else if (dept.startsWith('admin_')) {
                return dept.replace('admin_', '');
              }
              return null;
            }).filter(id => id !== null);
            
            // Auto-assign the selected employees
            if (selectedEmployeeIds.length > 0) {
              await assignEmployees({
                template_id: result.id,
                employee_ids: selectedEmployeeIds,
                assigned_by: 'admin'
              });
            }
            
            const roleNames = roleDepartments.map(dept => {
              if (dept.startsWith('supervisor_')) {
                const empId = dept.replace('supervisor_', '');
                const emp = employees.find(e => e.employee_id === empId);
                const name = emp ? (emp.firstname && emp.lastname ? `${emp.firstname} ${emp.lastname}` : emp.fullname || empId) : empId;
                return `Supervisor: ${name}`;
              } else if (dept.startsWith('admin_')) {
                const empId = dept.replace('admin_', '');
                const emp = employees.find(e => e.employee_id === empId);
                const name = emp ? (emp.firstname && emp.lastname ? `${emp.firstname} ${emp.lastname}` : emp.fullname || empId) : empId;
                return `Warehouse Admin: ${name}`;
              }
              return dept;
            });
            
            results.push({ success: true, department: `Management (${roleNames.join(', ')})`, result });
          } catch (error) {
            console.error(`Error creating role-based schedule:`, error);
            results.push({ success: false, department: `Management Roles`, error: error.message });
          }
        }
        
        // Handle zone-based scheduling
        for (const department of zoneDepartments) {
          try {
            // Check if this zone already has a shift scheduled for this date
            const existingTemplates = await getTemplates();
            const existingZoneShift = existingTemplates.find(template => 
              template.specific_date === dateStr &&
              template.department === department &&
              template.department !== 'Role-Based' // Exclude role-based templates
            );
            
            if (existingZoneShift) {
              results.push({ 
                success: false, 
                department: department, 
                error: `${department} already has a ${existingZoneShift.shift_name} shift scheduled for this date. Only one shift per zone per day is allowed.` 
              });
              continue; // Skip creating this template
            }
            
            const templateData = {
              shift_name: formData.shift_name,
              start_time: formData.start_time,
              end_time: formData.end_time,
              department: department,
              specific_date: dateStr,
              member_limit: formData.member_limit,
              created_by: "admin"
            };
            
            const result = await createTemplate(templateData);
            results.push({ success: true, department, result });
          } catch (error) {
            console.error(`Error creating schedule for ${department}:`, error);
            results.push({ success: false, department, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          toast.success(`Created ${successCount} schedule(s) for ${dateStr}`);
          onSave();
        }
        if (failCount > 0) {
          toast.error(`Failed to create ${failCount} schedule(s)`);
        }
      }
      
      onClose();
    } catch (error) {
      console.error("Error processing schedules:", error);
      toast.error("Failed to process schedules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-blue-600">
              {reassignShiftData ? `Reassign to ${reassignShiftData.shift_name} Shift` : `Manage Schedule for ${dateStr}`}
            </h2>
            <p className="text-sm text-gray-600">
              {reassignShiftData ? `Add more zones or management roles to existing ${reassignShiftData.shift_name} shift` : dayName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            <MdClose />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Create New Schedule - Full Width */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Create New Schedule</h3>
            
            {editingSchedule ? (
              /* Edit Schedule Form */
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <MdEdit size={18} />
                  Editing: {editingSchedule.department}
                </h4>
                
                <div className="space-y-3">
                  {/* Shift Template for Edit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Template</label>
                    <select
                      value={editingSchedule.shift_name}
                      onChange={(e) => {
                        const selected = shiftTemplates.find(s => s.name === e.target.value);
                        if (selected) {
                          setEditingSchedule(prev => ({
                            ...prev,
                            shift_name: selected.name,
                            start_time: selected.start_time.substring(0, 5),
                            end_time: selected.end_time.substring(0, 5)
                          }));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {shiftTemplates.map((template) => (
                        <option key={template.id} value={template.name}>
                          {template.name} ({template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Member Limit for Edit */}
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Member Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={editingSchedule.member_limit || ''}
                        onChange={e => {
                          const value = e.target.value;
                          setEditingSchedule(prev => ({
                            ...prev,
                            member_limit: value === '' ? null : parseInt(value) || 1
                          }));
                        }}
                        onBlur={e => {
                          // Ensure minimum value of 1 when field loses focus
                          if (!e.target.value || parseInt(e.target.value) < 1) {
                            setEditingSchedule(prev => ({
                              ...prev,
                              member_limit: 1
                            }));
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Edit Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <MdCheck size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setEditingSchedule(null)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-400 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Create New Schedule Form */
              <div className="space-y-6">
                {/* Step 1: Select Shift Type */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm font-bold mr-2">1</span>
                    Select Shift Type
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {shiftTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          if (!reassignShiftData) { // Only allow changing shift if not reassigning
                            setFormData(prev => ({
                              ...prev,
                              shift_name: template.name,
                              start_time: template.start_time.substring(0, 5),
                              end_time: template.end_time.substring(0, 5),
                              selectedShiftTemplate: template
                            }));
                          }
                        }}
                        disabled={reassignShiftData} // Disable shift selection when reassigning
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                          formData.shift_name === template.name
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : reassignShiftData
                            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className={`font-semibold ${reassignShiftData ? 'text-gray-500' : 'text-gray-800'}`}>
                              {template.name}
                              {reassignShiftData && formData.shift_name === template.name && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Current Shift
                                </span>
                              )}
                            </h5>
                            <p className={`text-sm ${reassignShiftData ? 'text-gray-400' : 'text-gray-600'}`}>
                              {template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)}
                            </p>
                          </div>
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: getShiftColor(template.name) }}
                          ></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Select Zones and Management (only show if shift is selected) */}
                {formData.shift_name && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm font-bold mr-2">2</span>
                      Select Zones & Management
                    </h4>

                    <div className="space-y-4">
                      {/* Management Roles Section */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-medium text-purple-700">
                            Management Roles
                          </h5>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allManagementIds = employees
                                  .filter(emp => emp.role === 'supervisor' || emp.role === 'admin')
                                  .map(emp => emp.role === 'supervisor' ? `supervisor_${emp.employee_id}` : `admin_${emp.employee_id}`);
                                setFormData(prev => ({
                                  ...prev,
                                  departments: [...new Set([...prev.departments, ...allManagementIds])]
                                }));
                              }}
                              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const managementIds = employees
                                  .filter(emp => emp.role === 'supervisor' || emp.role === 'admin')
                                  .map(emp => emp.role === 'supervisor' ? `supervisor_${emp.employee_id}` : `admin_${emp.employee_id}`);
                                setFormData(prev => ({
                                  ...prev,
                                  departments: prev.departments.filter(dept => !managementIds.includes(dept))
                                }));
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {/* Individual Supervisors */}
                          {employees.filter(emp => emp.role === 'supervisor').map(supervisor => {
                            const supervisorName = supervisor.firstname && supervisor.lastname 
                              ? `${supervisor.firstname} ${supervisor.lastname}` 
                              : supervisor.fullname || supervisor.employee_id;
                            
                            // Check if this supervisor is already assigned (for styling only)
                            const isAlreadyAssigned = reassignShiftData?.existingRoles?.some(role => 
                              role.members?.some(member => member.employee_id === supervisor.employee_id)
                            );
                            
                            return (
                              <div key={supervisor.employee_id}>
                                <label className="flex items-center gap-3 p-3 border-2 border-purple-200 rounded-lg cursor-pointer transition-colors hover:bg-purple-50">
                                  <input
                                    type="checkbox"
                                    checked={formData.departments.includes(`supervisor_${supervisor.employee_id}`)}
                                    onChange={() => handleDepartmentToggle(`supervisor_${supervisor.employee_id}`)}
                                    className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-purple-800">Supervisor</span>
                                    <div className="text-xs text-purple-600 mt-1">
                                      {supervisorName}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            );
                          })}

                          {/* Individual Warehouse Admins */}
                          {employees.filter(emp => emp.role === 'admin').map(admin => {
                            const adminName = admin.firstname && admin.lastname 
                              ? `${admin.firstname} ${admin.lastname}` 
                              : admin.fullname || admin.employee_id;
                            
                            // Check if this admin is already assigned (for styling only)
                            const isAlreadyAssigned = reassignShiftData?.existingRoles?.some(role => 
                              role.members?.some(member => member.employee_id === admin.employee_id)
                            );
                            
                            return (
                              <div key={admin.employee_id}>
                                <label className="flex items-center gap-3 p-3 border-2 border-purple-200 rounded-lg cursor-pointer transition-colors hover:bg-purple-50">
                                  <input
                                    type="checkbox"
                                    checked={formData.departments.includes(`admin_${admin.employee_id}`)}
                                    onChange={() => handleDepartmentToggle(`admin_${admin.employee_id}`)}
                                    className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-purple-800">Warehouse Admin</span>
                                    <div className="text-xs text-purple-600 mt-1">
                                      {adminName}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                          
                          {/* Show message if no supervisors or admins found */}
                          {employees.filter(emp => emp.role === 'supervisor' || emp.role === 'admin').length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No supervisors or warehouse admins found
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Zone Departments Section */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-medium text-blue-700">
                            Zone Departments
                            {reassignShiftData && existingAssignedZones.length > 0 && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({existingAssignedZones.length} already assigned)
                              </span>
                            )}
                          </h5>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allZoneNames = availableDepartments.map(dept => dept.name);
                                setFormData(prev => ({
                                  ...prev,
                                  departments: [...new Set([...prev.departments, ...allZoneNames])]
                                }));
                              }}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const zoneNames = availableDepartments.map(dept => dept.name);
                                setFormData(prev => ({
                                  ...prev,
                                  departments: prev.departments.filter(dept => !zoneNames.includes(dept))
                                }));
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>
                        
                        {availableDepartments.length === 0 ? (
                          <div className="text-orange-600 text-sm p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            {reassignShiftData ? "No additional zones available to assign." : "All departments are already scheduled for this day."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                            {availableDepartments.map(dept => {
                              return (
                                <label key={dept.id} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                                  <input
                                    type="checkbox"
                                    checked={formData.departments.includes(dept.name)}
                                    onChange={() => handleDepartmentToggle(dept.name)}
                                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">{dept.name}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Member Limit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Member Limit per Zone
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.member_limit || ''}
                          onChange={e => {
                            const value = e.target.value;
                            setFormData({
                              ...formData, 
                              member_limit: value === '' ? null : parseInt(value) || 1
                            });
                          }}
                          onBlur={e => {
                            // Ensure minimum value of 1 when field loses focus
                            if (!e.target.value || parseInt(e.target.value) < 1) {
                              setFormData({
                                ...formData,
                                member_limit: 1
                              });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter member limit"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Button (only show if shift is selected) */}
                {formData.shift_name && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !formData.departments.length}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 text-lg"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          {reassignShiftData ? 'Adding...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          {reassignShiftData ? 'Add to Shift' : 'Create Schedule'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Employee Assignment Modal */}
      {showAssignModal && selectedScheduleForAssign && (
        <EmployeeAssignmentModal
          schedule={selectedScheduleForAssign}
          employees={employees}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedScheduleForAssign(null);
          }}
          onSave={() => {
            setShowAssignModal(false);
            setSelectedScheduleForAssign(null);
            onSave();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// Employee Assignment Modal Component
// ==========================================

function EmployeeAssignmentModal({ schedule, employees, onClose, onSave }) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [initiallyAssignedEmployees, setInitiallyAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get currently assigned employees
  useEffect(() => {
    if (schedule.assigned_employees) {
      try {
        const assignedEmployees = typeof schedule.assigned_employees === 'string' 
          ? JSON.parse(schedule.assigned_employees) 
          : schedule.assigned_employees;
        const employeeIds = assignedEmployees.map(emp => emp.employee_id);
        setSelectedEmployees(employeeIds);
        setInitiallyAssignedEmployees(employeeIds); // Track initial state
      } catch (e) {
        setSelectedEmployees([]);
        setInitiallyAssignedEmployees([]);
      }
    }
  }, [schedule]);

  // Filter employees by department and position
  const departmentEmployees = employees.filter(emp => {
    // For Role-Based (Management Roles), only include supervisors and warehouse admins
    if (schedule.department === 'Role-Based') {
      return emp.role === 'supervisor' || emp.role === 'admin';
    }
    
    // For regular zones, only include employees from the same department or Company-wide
    const isDepartmentMatch = emp.department === schedule.department || emp.department === "Company-wide";
    
    // Only include regular employees (exclude supervisors, warehouse admins, team leaders)
    const isRegularEmployee = emp.position && 
      !emp.position.toLowerCase().includes('supervisor') &&
      !emp.position.toLowerCase().includes('admin') &&
      !emp.position.toLowerCase().includes('team leader') &&
      !emp.position.toLowerCase().includes('teamleader') &&
      !emp.position.toLowerCase().includes('team-leader') &&
      !emp.position.toLowerCase().includes('manager');
    
    console.log(`🔍 Employee filter - ${emp.employee_id} (${emp.position}):`, {
      department: emp.department,
      isDepartmentMatch,
      isRegularEmployee,
      included: isDepartmentMatch && isRegularEmployee
    });
    
    return isDepartmentMatch && isRegularEmployee;
  });

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      const isCurrentlySelected = prev.includes(employeeId);
      
      // Only apply member limit restrictions to zones, not management roles
      if (!isCurrentlySelected && schedule.department !== 'Role-Based' && schedule.member_limit && prev.length >= schedule.member_limit) {
        toast.warning(`Cannot assign more than ${schedule.member_limit} employees to this zone`);
        return prev;
      }
      
      return isCurrentlySelected 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId];
    });
  };

  const handleSave = async () => {
    // Check member limit restriction only for zones, not management roles
    if (schedule.department !== 'Role-Based' && schedule.member_limit && selectedEmployees.length > schedule.member_limit) {
      toast.error(`Cannot assign more than ${schedule.member_limit} employees to this zone`);
      return;
    }
    
    setLoading(true);
    try {
      // Find employees to add (selected but not initially assigned)
      const employeesToAdd = selectedEmployees.filter(empId => !initiallyAssignedEmployees.includes(empId));
      
      // Find employees to remove (initially assigned but not selected)
      const employeesToRemove = initiallyAssignedEmployees.filter(empId => !selectedEmployees.includes(empId));
      
      console.log('🔄 Employee assignment changes:', {
        employeesToAdd,
        employeesToRemove,
        initiallyAssigned: initiallyAssignedEmployees,
        currentlySelected: selectedEmployees
      });
      
      let operationsCompleted = 0;
      
      // Add new employees
      if (employeesToAdd.length > 0) {
        await assignEmployees({
          template_id: schedule.id,
          employee_ids: employeesToAdd,
          assigned_by: 'admin'
        });
        operationsCompleted++;
        console.log(`✅ Added ${employeesToAdd.length} employees`);
      }
      
      // Remove deselected employees
      if (employeesToRemove.length > 0) {
        await removeEmployeesFromTemplate(schedule.id, employeesToRemove);
        operationsCompleted++;
        console.log(`✅ Removed ${employeesToRemove.length} employees`);
      }
      
      if (operationsCompleted > 0) {
        toast.success('Employee assignments updated successfully!');
        onSave(); // Refresh the parent component
      } else {
        toast.info('No changes made to employee assignments');
      }
    } catch (error) {
      console.error('Error updating employee assignments:', error);
      toast.error('Failed to update employee assignments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              <MdPeople size={20} />
              {schedule.department === 'Role-Based' ? 'Assign Management Roles' : `Assign Employees to ${schedule.department}`}
            </h3>
            <p className="text-sm text-gray-600">
              {schedule.shift_name} • {schedule.start_time} - {schedule.end_time}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            <MdClose />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-600">
              {schedule.department === 'Role-Based' 
                ? `Select supervisors and warehouse admins to assign:`
                : `Select employees to assign to this schedule:`
              }
            </p>
            {schedule.member_limit && schedule.department !== 'Role-Based' && (
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                selectedEmployees.length >= schedule.member_limit 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedEmployees.length}/{schedule.member_limit} assigned
              </div>
            )}
          </div>
          
          {/* Currently Assigned Section */}
          {selectedEmployees.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Currently Assigned ({selectedEmployees.length}):</h4>
              <div className="flex flex-wrap gap-2">
                {selectedEmployees.map(empId => {
                  const employee = departmentEmployees.find(emp => emp.employee_id === empId);
                  if (!employee) return null;
                  
                  const employeeName = employee.firstname && employee.lastname 
                    ? `${employee.firstname} ${employee.lastname}`
                    : employee.fullname || employee.employee_id;
                  
                  return (
                    <div key={empId} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      <span>{employeeName}</span>
                      <button
                        onClick={() => handleEmployeeToggle(empId)}
                        className="text-blue-600 hover:text-blue-800 ml-1"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {departmentEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MdPeople size={48} className="mx-auto mb-3 text-gray-300" />
              <p>
                {schedule.department === 'Role-Based' 
                  ? 'No supervisors or warehouse admins found'
                  : `No employees found in ${schedule.department}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {schedule.department === 'Role-Based' ? 'Available Management:' : 'Available Employees:'}
              </h4>
              {departmentEmployees.map(employee => {
                const employeeName = employee.firstname && employee.lastname 
                  ? `${employee.firstname} ${employee.lastname}`
                  : employee.fullname || employee.employee_id;
                
                const isSelected = selectedEmployees.includes(employee.employee_id);
                const isTeamLeader = employee.position === "Team Leader";
                const isSupervisor = employee.position === "Supervisor";
                // Only apply member limit restrictions to zones, not management roles
                const isAtLimit = schedule.department !== 'Role-Based' && schedule.member_limit && selectedEmployees.length >= schedule.member_limit && !isSelected;
                
                return (
                  <label key={employee.employee_id} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 
                    isAtLimit ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 
                    'border-gray-200 hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleEmployeeToggle(employee.employee_id)}
                      disabled={isAtLimit}
                      className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isSelected ? 'text-blue-800' : isAtLimit ? 'text-gray-500' : 'text-gray-800'}`}>
                          {employeeName}
                        </span>
                        {isSupervisor && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                            Supervisor
                          </span>
                        )}
                        {isTeamLeader && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                            Team Leader
                          </span>
                        )}
                      </div>
                      <div className={`text-sm ${isAtLimit ? 'text-gray-400' : 'text-gray-600'}`}>
                        ID: {employee.employee_id} | Position: {employee.position || 'Employee'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Shift Details Modal Component
// ==========================================

function ShiftDetailsModal({ shiftData, onClose, employees, onSave, onReassign }) {
  if (!shiftData) return null;

  const [showShiftAssignModal, setShowShiftAssignModal] = useState(false);
  const [selectedShiftZoneForAssign, setSelectedShiftZoneForAssign] = useState(null);
  const [editingZone, setEditingZone] = useState(null);

  // Get all employees for name lookup
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employee_id === employeeId);
    if (employee) {
      return employee.firstname && employee.lastname 
        ? `${employee.firstname} ${employee.lastname}`
        : employee.fullname || employeeId;
    }
    return employeeId;
  };

  // Separate zones and roles, and merge all Role-Based zones into one
  const zones = shiftData.zones.filter(zone => 
    zone.department !== 'Role-Based'
  );
  
  const roleBasedZones = shiftData.zones.filter(zone => 
    zone.department === 'Role-Based'
  );
  
  // Merge all Role-Based zones into a single logical role group
  const roles = roleBasedZones.length > 0 ? [{
    department: 'Role-Based',
    template_id: roleBasedZones[0].template_id, // Use the first template_id for operations
    member_limit: null, // Role-Based templates don't have member limits
    assigned_count: roleBasedZones.reduce((sum, zone) => sum + zone.assigned_count, 0),
    members: roleBasedZones.reduce((allMembers, zone) => [...allMembers, ...(zone.members || [])], [])
  }] : [];

  const handleAssignEmployees = (zone) => {
    // Convert zone data to schedule format for the assignment modal
    const scheduleData = {
      id: zone.template_id,
      department: zone.department,
      shift_name: shiftData.shift_name,
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      member_limit: zone.member_limit,
      assigned_employees: zone.members
    };
    setSelectedShiftZoneForAssign(scheduleData);
    setShowShiftAssignModal(true);
  };

  const handleAssignManagementRoles = () => {
    // Get the role-based template (all management roles share the same template)
    const roleBasedTemplate = roles[0];
    if (!roleBasedTemplate) return;
    
    // Convert role data to schedule format for the assignment modal
    const scheduleData = {
      id: roleBasedTemplate.template_id,
      department: 'Role-Based',
      shift_name: shiftData.shift_name,
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      member_limit: roleBasedTemplate.member_limit,
      assigned_employees: roleBasedTemplate.members
    };
    setSelectedShiftZoneForAssign(scheduleData);
    setShowShiftAssignModal(true);
  };

  const handleReassignSchedule = () => {
    // Close the shift details modal and open the schedule creation modal for the same date
    const scheduleDate = new Date(shiftData.date);
    onClose(); // Close current modal
    
    // Trigger the parent component to open the schedule modal with current shift data
    // We need to pass this up to the parent component
    if (onReassign) {
      onReassign(scheduleDate, {
        shift_name: shiftData.shift_name,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        existingZones: zones,
        existingRoles: roles
      });
    }
  };

  const handleEditZone = (zone) => {
    setEditingZone({
      id: zone.template_id,
      department: zone.department,
      shift_name: shiftData.shift_name,
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      member_limit: zone.member_limit
    });
  };

  const handleSaveEdit = async () => {
    if (!editingZone) return;

    try {
      const updatePayload = {
        member_limit: editingZone.member_limit === '' ? 1 : editingZone.member_limit,
        edited_by: "admin"
      };

      await updateTemplate(editingZone.id, updatePayload);
      toast.success("Member limit updated!");
      setEditingZone(null);
      onSave();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    }
  };

  const handleDeleteZone = async (zone) => {
    confirmAction(`Delete ${zone.department} schedule?`, async () => {
      try {
        await deleteTemplate(zone.template_id);
        toast.success(`${zone.department} schedule deleted!`);
        onSave();
        onClose(); // Close modal after deletion
      } catch (error) {
        console.error("Error deleting schedule:", error);
        toast.error("Failed to delete schedule");
      }
    });
  };

  const handleDeleteAllManagementRoles = async () => {
    const roleBasedZones = shiftData.zones.filter(zone => zone.department === 'Role-Based');
    if (roleBasedZones.length === 0) return;
    
    confirmAction(`Remove all management roles from this shift?`, async () => {
      try {
        // Delete all Role-Based templates
        const deletePromises = roleBasedZones.map(zone => deleteTemplate(zone.template_id));
        await Promise.all(deletePromises);
        
        toast.success("All management roles removed from shift!");
        onSave();
        onClose(); // Close modal since the templates are gone
      } catch (error) {
        console.error("Error removing all management roles:", error);
        toast.error("Failed to remove management roles");
      }
    });
  };

  const handleDeleteManagementRole = async (role, employeeId, employeeName) => {
    confirmAction(`Remove ${employeeName} from this shift?`, async () => {
      try {
        // Find which Role-Based template contains this employee
        const roleBasedZones = shiftData.zones.filter(zone => zone.department === 'Role-Based');
        let targetTemplateId = null;
        
        for (const zone of roleBasedZones) {
          if (zone.members && zone.members.some(member => member.employee_id === employeeId)) {
            targetTemplateId = zone.template_id;
            break;
          }
        }
        
        if (!targetTemplateId) {
          toast.error("Could not find employee assignment to remove");
          return;
        }
        
        await removeEmployeesFromTemplate(targetTemplateId, [employeeId]);
        toast.success(`${employeeName} removed from shift!`);
        
        // Check if this was the last employee in any Role-Based template
        const updatedZone = roleBasedZones.find(zone => zone.template_id === targetTemplateId);
        const remainingMembers = updatedZone?.members?.filter(member => member.employee_id !== employeeId) || [];
        
        // If no more members in this template, delete it
        if (remainingMembers.length === 0) {
          await deleteTemplate(targetTemplateId);
          toast.info("Role-based template removed as it has no more assigned employees");
          
          // Check if this was the last Role-Based template
          const otherRoleTemplates = roleBasedZones.filter(zone => zone.template_id !== targetTemplateId);
          if (otherRoleTemplates.length === 0) {
            onClose(); // Close modal since no more role templates exist
          }
        }
        
        onSave();
      } catch (error) {
        console.error("Error removing employee from schedule:", error);
        toast.error("Failed to remove employee from schedule");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: getShiftColor(shiftData.shift_name) }}
              ></div>
              {shiftData.shift_name} Shift Details
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>{shiftData.date}</span>
              <span>{shiftData.start_time} - {shiftData.end_time}</span>
              <span>{zones.length} Zone{zones.length !== 1 ? 's' : ''}</span>
              <span>{roles.length} Role{roles.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReassignSchedule()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              title="Add more zones or management roles to this schedule"
            >
              <MdAdd size={16} />
              Reassign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone Assignments */}
          <div>
            <h4 className="text-lg font-semibold text-blue-700 mb-3">
              Zone Assignments ({zones.length})
            </h4>
            
            {zones.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">No zones scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {zones.map((zone, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                    {editingZone && editingZone.id === zone.template_id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-semibold text-gray-800">{zone.department}</h5>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingZone(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Member Limit</label>
                            <input
                              type="number"
                              min="1"
                              value={editingZone.member_limit || ''}
                              onChange={e => {
                                const value = e.target.value;
                                setEditingZone(prev => ({
                                  ...prev,
                                  member_limit: value === '' ? null : parseInt(value) || 1
                                }));
                              }}
                              onBlur={e => {
                                // Ensure minimum value of 1 when field loses focus
                                if (!e.target.value || parseInt(e.target.value) < 1) {
                                  setEditingZone(prev => ({
                                    ...prev,
                                    member_limit: 1
                                  }));
                                }
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getShiftColor(shiftData.shift_name) }}
                            ></div>
                            <h5 className="font-semibold text-gray-800">{zone.department}</h5>
                          </div>
                          <p className="text-xs text-gray-500">
                            Assigned: {zone.assigned_count}/{zone.member_limit}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAssignEmployees(zone)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Assign Employees"
                          >
                            <MdPersonAdd size={16} />
                          </button>
                          <button
                            onClick={() => handleEditZone(zone)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Edit Schedule"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete Schedule"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Assigned Employees */}
                    {!editingZone && zone.members && zone.members.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-600 mb-2">Assigned Employees:</p>
                        <div className="flex flex-wrap gap-1">
                          {zone.members.map((member, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {getEmployeeName(member.employee_id)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Management Roles */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-purple-700">
                Management Roles ({roles.reduce((total, role) => total + (role.members?.length || 0), 0)})
              </h4>
            </div>
            
            {roles.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">No management roles scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map((role, index) => {
                  const roleMembers = role.members || [];
                  
                  // Show role-based template card if no members assigned yet
                  if (roleMembers.length === 0) {
                    return (
                      <div key={`role-${index}`} className="border-2 border-purple-200 bg-purple-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h5 className="font-semibold text-purple-800">Role-Based Template</h5>
                            <p className="text-sm text-gray-700">No assignments yet</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteManagementRole(role, null, "Role-Based Template")}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Remove Template"
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Create individual cards for each assigned management employee
                  return roleMembers.map((member, memberIndex) => {
                    const employee = employees.find(emp => emp.employee_id === member.employee_id);
                    const employeeName = employee ? 
                      (employee.firstname && employee.lastname ? 
                        `${employee.firstname} ${employee.lastname}` : 
                        employee.fullname || member.employee_id) : 
                      member.employee_id;
                    
                    const employeeRole = employee?.role;
                    const roleTitle = employeeRole === 'supervisor' ? 'Supervisor' : 'Warehouse Admin';
                    const cardColor = employeeRole === 'supervisor' ? 'border-purple-200 bg-purple-50' : 'border-blue-200 bg-blue-50';
                    const textColor = employeeRole === 'supervisor' ? 'text-purple-800' : 'text-blue-800';
                    
                    return (
                      <div key={`${index}-${memberIndex}`} className={`border rounded-lg p-4 ${cardColor}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h5 className={`font-semibold ${textColor}`}>{roleTitle}</h5>
                            <p className="text-sm text-gray-700 font-medium">{employeeName}</p>
                            <p className="text-xs text-gray-500">ID: {member.employee_id}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteManagementRole(role, member.employee_id, employeeName)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Remove from Schedule"
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                }).flat()}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Employee Assignment Modal */}
      {showShiftAssignModal && selectedShiftZoneForAssign && (
        <EmployeeAssignmentModal
          schedule={selectedShiftZoneForAssign}
          employees={employees}
          onClose={() => {
            setShowShiftAssignModal(false);
            setSelectedShiftZoneForAssign(null);
          }}
          onSave={async () => {
            setShowShiftAssignModal(false);
            setSelectedShiftZoneForAssign(null);
            // Refresh the parent data first
            await onSave();
            // The shift details modal will automatically update with fresh data
            // since the parent component will re-render with new data
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// Main Component: CalendarScheduleView
// ==========================================

export default function CalendarScheduleView() {
  // State
  const [templates, setTemplates] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [reassignShiftData, setReassignShiftData] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);
  const [selectedShiftData, setSelectedShiftData] = useState(null);
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: "", start: "", end: "" });
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Initial Load
  useEffect(() => {
    fetchTemplatesData();
    fetchDepartmentsData();
    fetchShiftTemplatesData();
    fetchEmployeesData();
  }, []);

  // Generate calendar events from templates
  useEffect(() => {
    generateCalendarEvents();
  }, [templates]);

  // Function to refresh shift details modal data
  const refreshShiftDetailsData = async () => {
    // First refresh the templates data
    try {
      setLoading(true);
      const freshTemplates = await getTemplates();
      setTemplates(freshTemplates);
      
      // If shift details modal is open, refresh its data with the fresh templates
      if (selectedShiftData && showShiftDetailsModal) {
        // Find the updated shift data from the fresh templates
        const shiftsByDate = {};
        
        // Rebuild the shifts data structure using fresh templates
        freshTemplates.forEach(template => {
          if (!template.specific_date) return;
          
          const dateKey = template.specific_date;
          
          if (!shiftsByDate[dateKey]) {
            shiftsByDate[dateKey] = {};
          }
          
          if (!shiftsByDate[dateKey][template.shift_name]) {
            shiftsByDate[dateKey][template.shift_name] = {
              shift_name: template.shift_name,
              start_time: template.start_time,
              end_time: template.end_time,
              date: dateKey,
              zones: []
            };
          }
          
          // Find assigned employees for this template
          let templateAssignedEmployees = [];
          if (template.assigned_employees) {
            try {
              const assignedEmployeesData = typeof template.assigned_employees === 'string' 
                ? JSON.parse(template.assigned_employees) 
                : template.assigned_employees;
              
              templateAssignedEmployees = assignedEmployeesData.map(assignment => ({
                employee_id: assignment.employee_id,
                assigned_date: assignment.assigned_date,
                assigned_by: assignment.assigned_by,
                template_id: template.id
              }));
            } catch (e) {
              console.error('Error parsing assigned_employees for template', template.id, e);
            }
          }
          
          // Add this template as a zone with assigned members
          shiftsByDate[dateKey][template.shift_name].zones.push({
            department: template.department,
            template_id: template.id,
            member_limit: template.member_limit,
            assigned_count: templateAssignedEmployees.length,
            members: templateAssignedEmployees
          });
        });
        
        // Find the updated shift data that matches the currently selected shift
        const updatedShiftData = shiftsByDate[selectedShiftData.date]?.[selectedShiftData.shift_name];
        
        if (updatedShiftData) {
          setSelectedShiftData(updatedShiftData);
        }
      }
    } catch (error) {
      console.error("Error refreshing shift details:", error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  // Data Fetchers
  const fetchTemplatesData = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      
      // Include all templates (both zone-based and role-based)
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentsData = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
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

  const fetchEmployeesData = async () => {
    try {
      const data = await fetchEmployees();
      // Filter out inactive employees for scheduling
      const activeEmployees = data.filter(emp => emp.status === 'Active');
      console.log(`👥 Loaded ${activeEmployees.length} active employees for scheduling (filtered from ${data.length} total)`);
      setEmployees(activeEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const generateCalendarEvents = useCallback(() => {
    const events = [];
    const shiftsByDate = {};

    console.log(`🗓️ Generating calendar events from ${templates.length} templates`);

    // Group templates by date and shift
    templates.forEach(template => {
      if (!template.specific_date) {
        console.log(`⏭️ Skipping template ${template.id} - no specific date`);
        return; // Skip templates without specific dates
      }

      const dateKey = template.specific_date;
      
      if (!shiftsByDate[dateKey]) {
        shiftsByDate[dateKey] = {};
      }
      
      if (!shiftsByDate[dateKey][template.shift_name]) {
        shiftsByDate[dateKey][template.shift_name] = {
          shift_name: template.shift_name,
          start_time: template.start_time,
          end_time: template.end_time,
          date: dateKey,
          zones: []
        };
      }
      
      // Find assigned employees for this template
      let templateAssignedEmployees = [];
      if (template.assigned_employees) {
        try {
          const assignedEmployeesData = typeof template.assigned_employees === 'string' 
            ? JSON.parse(template.assigned_employees) 
            : template.assigned_employees;
          
          templateAssignedEmployees = assignedEmployeesData.map(assignment => ({
            employee_id: assignment.employee_id,
            assigned_date: assignment.assigned_date,
            assigned_by: assignment.assigned_by,
            template_id: template.id
          }));
        } catch (e) {
          console.error('Error parsing assigned_employees for template', template.id, e);
        }
      }
      
      // Add this template as a zone with assigned members
      shiftsByDate[dateKey][template.shift_name].zones.push({
        department: template.department,
        template_id: template.id,
        member_limit: template.member_limit,
        assigned_count: templateAssignedEmployees.length,
        members: templateAssignedEmployees
      });
    });

    console.log(`📅 Shifts by date:`, Object.keys(shiftsByDate).length, 'dates');

    // Create calendar events for each shift
    Object.entries(shiftsByDate).forEach(([date, shifts]) => {
      Object.entries(shifts).forEach(([shiftName, shiftData]) => {
        const startTime = formatTime24Short(shiftData.start_time);
        const endTime = formatTime24Short(shiftData.end_time);
        
        console.log(`🕐 Time conversion for ${shiftName}:`, {
          original_start: shiftData.start_time,
          original_end: shiftData.end_time,
          converted_start: startTime,
          converted_end: endTime
        });
        const backgroundColor = getShiftColor(shiftName);
        
        // Check if this is a past date
        const eventDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDate = eventDate < today;
        
        // Calculate total assigned members across all zones
        const totalAssigned = shiftData.zones.reduce((sum, zone) => sum + zone.assigned_count, 0);
        
        console.log(`📅 Creating event: ${date} - ${shiftName} (${shiftData.zones.length} zones, ${totalAssigned} assigned)`);
        
        events.push({
          id: `${date}-${shiftName}`,
          title: `${startTime} - ${endTime} ${shiftName}`,
          start: `${date}T${startTime}`,
          end: `${date}T${endTime}`,
          backgroundColor: isPastDate ? '#9ca3af' : backgroundColor, // Gray for past dates
          borderColor: isPastDate ? '#6b7280' : backgroundColor,
          textColor: "white",
          classNames: isPastDate ? ['past-event'] : [],
          extendedProps: {
            shiftData: shiftData,
            zoneCount: shiftData.zones.length,
            totalAssigned: totalAssigned,
            shiftName: shiftName,
            startTime: shiftData.start_time,
            endTime: shiftData.end_time,
            specificDate: date,
            isPast: isPastDate
          }
        });
      });
    });

    console.log(`📊 Generated ${events.length} calendar events`);
    setCalendarEvents(events);
  }, [templates]);

  // Event Handlers
  const handleDateClick = (info) => {
    console.log('📅 Date clicked:', info.date);
    const clickedDate = new Date(info.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    // Prevent scheduling on past dates
    if (clickedDate < today) {
      toast.warning("Cannot schedule on past dates");
      return;
    }
    
    setSelectedDate(clickedDate);
    setShowScheduleModal(true);
    console.log('📅 Modal should open now');
  };

  const handleEventClick = (info) => {
    const event = info.event;
    const props = event.extendedProps;
    
    // Prevent interaction with past events
    if (props.isPast) {
      toast.info("Cannot modify past schedules");
      return;
    }
    
    if (props.shiftData) {
      // Show shift details modal
      setSelectedShiftData(props.shiftData);
      setShowShiftDetailsModal(true);
    } else {
      // Fallback for old format
      const message = `
        Department: ${props.department}
        Shift: ${props.shiftName}
        Time: ${props.startTime} - ${props.endTime}
        Date: ${props.date}
      `;
      
      toast.info(message, { autoClose: 5000 });
    }
  };

  const handleDeleteEvent = async (shiftData, specificDate, shiftName) => {
    confirmAction(`Remove all ${shiftName} schedules for ${specificDate}?`, async () => {
      try {
        // Delete all templates for this shift on this date
        const deletePromises = shiftData.zones.map(zone => 
          deleteTemplate(zone.template_id)
        );
        
        await Promise.all(deletePromises);
        
        toast.success(`${shiftName} schedules removed for ${specificDate}`);
        fetchTemplatesData();
      } catch (error) {
        console.error("Error deleting schedules:", error);
        toast.error("Failed to delete schedules");
      }
    });
  };

  const handleEditSchedule = (schedule, day) => {
    // This will be handled within the modal
    console.log("Edit schedule:", schedule, day);
  };
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
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">

        </div>
        
        <button
          onClick={() => {
            setShiftTemplateForm({name:"",start:"",end:""});
            setEditingShiftIndex(null);
            setShowShiftTemplateModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <span className="hidden sm:inline">Manage Shift Templates</span>
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <style jsx>{`
          .fc-day-past {
            background-color: #f3f4f6 !important;
            color: #9ca3af !important;
          }
          .fc-day-past .fc-daygrid-day-number {
            color: #9ca3af !important;
          }
          .fc-day-past:hover {
            background-color: #f3f4f6 !important;
            cursor: not-allowed !important;
          }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "", // Removed week and day views, only month view available
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDisplay="block"
          displayEventTime={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          height="auto"
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          moreLinkClick="popover"
          selectConstraint={{
            start: new Date().toISOString().split('T')[0] // Prevent selecting past dates
          }}
          eventMouseEnter={(info) => {
            info.el.style.cursor = 'pointer';
            if (!info.event.extendedProps.isPast) {
              info.el.style.transform = 'scale(1.02)';
              info.el.style.transition = 'transform 0.2s ease';
            }
          }}
          eventMouseLeave={(info) => {
            info.el.style.transform = 'scale(1)';
          }}
          eventDidMount={(info) => {
            // Add opacity to past events
            if (info.event.extendedProps.isPast) {
              info.el.style.opacity = '0.6';
              info.el.style.cursor = 'default';
            }
          }}
          dayCellDidMount={(info) => {
            // Gray out past dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const cellDate = new Date(info.date);
            
            if (cellDate < today) {
              info.el.classList.add('fc-day-past');
              info.el.style.cursor = 'not-allowed';
            }
          }}
        />
      </div>

      {/* Modals */}
      {console.log('📅 Modal render check:', { showScheduleModal, selectedDate, departments: departments.length, shiftTemplates: shiftTemplates.length })}
      {showScheduleModal && selectedDate && (
        <ScheduleModal
          selectedDate={selectedDate}
          reassignShiftData={reassignShiftData}
          onClose={() => {
            console.log('📅 Closing schedule modal');
            setShowScheduleModal(false);
            setSelectedDate(null);
            setReassignShiftData(null); // Clear reassign data
          }}
          onSave={fetchTemplatesData}
          departments={departments}
          shiftTemplates={shiftTemplates}
          existingSchedules={templates}
          onEditSchedule={handleEditSchedule}
          onDeleteSchedule={handleDeleteEvent}
        />
      )}

      {/* Shift Template Modal */}
      {showShiftTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
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

      {/* Shift Details Modal */}
      {showShiftDetailsModal && selectedShiftData && (
        <ShiftDetailsModal
          shiftData={selectedShiftData}
          employees={employees}
          onSave={refreshShiftDetailsData}
          onReassign={(date, shiftData) => {
            // Open the schedule modal for the same date with existing shift data
            setSelectedDate(date);
            setReassignShiftData(shiftData); // Store the existing shift data
            setShowScheduleModal(true);
          }}
          onClose={() => {
            setShowShiftDetailsModal(false);
            setSelectedShiftData(null);
          }}
        />
      )}
    </div>
  );
}