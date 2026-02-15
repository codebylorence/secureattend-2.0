import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { 
  MdAdd, MdEdit, MdDelete, MdClose, MdCalendarToday,
  MdInfo, MdCheck, MdPeople, MdPersonAdd, MdLocationOn, MdSupervisorAccount, MdAdminPanelSettings, MdSearch, MdCheckCircle
} from "react-icons/md";
import { toast } from 'react-toastify';

import { 
  getTemplates, deleteTemplate, removeEmployeesFromTemplate, createTemplate, updateTemplate, assignEmployees
} from "../api/ScheduleApi";
import { 
  getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate
} from "../api/ShiftTemplateApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { fetchEmployees, getFingerprintStatus } from "../api/EmployeeApi";
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
// Schedule Modal Component (ENHANCED UI)
// ==========================================

function ScheduleModal({ selectedDate, reassignShiftData, onClose, onSave, departments, shiftTemplates, existingSchedules, onEditSchedule, onDeleteSchedule, isSupervisor }) {
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
  const [fingerprintStatus, setFingerprintStatus] = useState({});
  const [loadingFingerprints, setLoadingFingerprints] = useState(true);
  const [managementSearchTerm, setManagementSearchTerm] = useState("");

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
                if (employee.position === 'Supervisor') {
                  assignedRoleIds.push(`supervisor_${member.employee_id}`);
                } else if (employee.position === 'Warehouse Admin' || employee.position === 'Warehouse Manager') {
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
        setEmployees(activeEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    loadEmployees();
  }, []);

  // Fetch fingerprint status for all employees
  useEffect(() => {
    const fetchFingerprintStatus = async () => {
      try {
        setLoadingFingerprints(true);
        const status = await getFingerprintStatus();
        setFingerprintStatus(status);
      } catch (error) {
        console.error('❌ Error fetching fingerprint status:', error);
        setFingerprintStatus({});
      } finally {
        setLoadingFingerprints(false);
      }
    };

    fetchFingerprintStatus();
  }, []);

  // Filter management employees based on search term
  const filteredManagementEmployees = employees
    .filter(emp => emp.position === 'Supervisor' || emp.position === 'Warehouse Admin' || emp.position === 'Warehouse Manager')
    .filter(emp => {
      if (!managementSearchTerm) return true;
      
      const employeeName = emp.firstname && emp.lastname 
        ? `${emp.firstname} ${emp.lastname}` 
        : emp.employee_id;
      
      const searchLower = managementSearchTerm.toLowerCase();
      return (
        employeeName.toLowerCase().includes(searchLower) ||
        emp.employee_id.toLowerCase().includes(searchLower) ||
        emp.position.toLowerCase().includes(searchLower)
      );
    });

  const dateStr = selectedDate ? formatDateForAPI(selectedDate) : "";
  const dayName = selectedDate ? getDayName(selectedDate) : "";
  
  // Get existing schedules for this specific date
  const daySchedules = existingSchedules.filter(schedule => 
    schedule.specific_date === dateStr
  );
  
  // Filter departments based on whether we're reassigning or creating new
  let scheduledDepts, availableDepartments, existingAssignedZones, existingAssignedRoles;
  
  if (reassignShiftData) {
    existingAssignedZones = reassignShiftData.existingZones?.map(zone => zone.department) || [];
    existingAssignedRoles = reassignShiftData.existingRoles?.length > 0 ? ['Role-Based'] : [];
    availableDepartments = departments.filter(dept => dept.name !== 'Role-Based');
  } else {
    scheduledDepts = daySchedules.map(schedule => schedule.department);
    availableDepartments = departments.filter(dept => 
      !scheduledDepts.includes(dept.name) && dept.name !== 'Role-Based'
    );
    existingAssignedZones = [];
    existingAssignedRoles = [];
  }

  const handleDepartmentToggle = (deptName) => {
    // Check if this is a management role selection
    if (deptName.startsWith('supervisor_') || deptName.startsWith('admin_')) {
      const employeeId = deptName.replace('supervisor_', '').replace('admin_', '');
      const hasFingerprint = fingerprintStatus[employeeId];
      
      // If trying to select a management role without fingerprint, show error and prevent selection
      if (!formData.departments.includes(deptName) && !hasFingerprint) {
        toast.error(`Cannot assign employee ${employeeId}. Employee must have fingerprint enrolled.`);
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(deptName)
        ? prev.departments.filter(d => d !== deptName)
        : [...prev.departments, deptName]
    }));
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

  const handleSubmit = async () => {
    if (!formData.departments.length || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please select a shift and at least one zone or management role!");
      return;
    }

    setLoading(true);
    
    try {
      const results = [];
      
      if (reassignShiftData) {
        // [Existing reassignment logic perfectly preserved...]
        const existingZones = reassignShiftData.existingZones?.map(zone => zone.department) || [];
        const existingRoleIds = [];
        
        if (reassignShiftData.existingRoles) {
          reassignShiftData.existingRoles.forEach(role => {
            if (role.members) {
              role.members.forEach(member => {
                const employee = employees.find(emp => emp.employee_id === member.employee_id);
                if (employee) {
                  if (employee.position === 'Supervisor') {
                    existingRoleIds.push(`supervisor_${member.employee_id}`);
                  } else if (employee.position === 'Warehouse Admin' || employee.position === 'Warehouse Manager') {
                    existingRoleIds.push(`admin_${member.employee_id}`);
                  }
                }
              });
            }
          });
        }
        
        const currentlyAssigned = [...existingZones, ...existingRoleIds];
        const selectedItems = formData.departments;
        
        const itemsToAdd = selectedItems.filter(item => !currentlyAssigned.includes(item));
        const itemsToRemove = currentlyAssigned.filter(item => !selectedItems.includes(item));
        
        for (const itemToRemove of itemsToRemove) {
          try {
            if (itemToRemove.startsWith('supervisor_') || itemToRemove.startsWith('admin_')) {
              const employeeId = itemToRemove.replace('supervisor_', '').replace('admin_', '');
              const roleTemplate = reassignShiftData.existingRoles?.[0]; 
              if (roleTemplate) {
                await removeEmployeesFromTemplate(roleTemplate.template_id, [employeeId]);
                results.push({ success: true, action: 'removed', item: itemToRemove });
              }
            } else {
              const zoneToRemove = reassignShiftData.existingZones?.find(zone => zone.department === itemToRemove);
              if (zoneToRemove) {
                await deleteTemplate(zoneToRemove.template_id);
                results.push({ success: true, action: 'removed', item: itemToRemove });
              }
            }
          } catch (error) {
            results.push({ success: false, action: 'removed', item: itemToRemove, error: error.message });
          }
        }
        
        if (itemsToAdd.length > 0) {
          const roleDepartments = itemsToAdd.filter(dept => dept.startsWith('supervisor_') || dept.startsWith('admin_'));
          const zoneDepartments = itemsToAdd.filter(dept => !dept.startsWith('supervisor_') && !dept.startsWith('admin_'));
          
          if (roleDepartments.length > 0) {
            try {
              let existingRoleTemplate = null;
              if (reassignShiftData?.existingRoles && reassignShiftData.existingRoles.length > 0) {
                existingRoleTemplate = { template_id: reassignShiftData.existingRoles[0].template_id };
              } else {
                const existingTemplates = await getTemplates();
                const roleBasedTemplate = existingTemplates.find(template => 
                  template.specific_date === dateStr &&
                  template.shift_name === formData.shift_name &&
                  template.department === 'Role-Based'
                );
                if (roleBasedTemplate) {
                  existingRoleTemplate = { template_id: roleBasedTemplate.id };
                }
              }
              
              if (existingRoleTemplate) {
                const selectedEmployeeIds = roleDepartments.map(dept => {
                  if (dept.startsWith('supervisor_')) return dept.replace('supervisor_', '');
                  else if (dept.startsWith('admin_')) return dept.replace('admin_', '');
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
                const templateData = {
                  shift_name: formData.shift_name,
                  start_time: formData.start_time,
                  end_time: formData.end_time,
                  department: 'Role-Based',
                  specific_date: dateStr,
                  member_limit: null,
                  created_by: "admin"
                };
                
                const result = await createTemplate(templateData);
                const selectedEmployeeIds = roleDepartments.map(dept => {
                  if (dept.startsWith('supervisor_')) return dept.replace('supervisor_', '');
                  else if (dept.startsWith('admin_')) return dept.replace('admin_', '');
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
              results.push({ success: false, action: 'added', item: 'Management Roles', error: error.message });
            }
          }
          
          for (const department of zoneDepartments) {
            try {
              // Check if team leader has fingerprint enrolled
              const teamLeader = employees.find(emp => 
                emp.department === department && emp.position === 'Team Leader'
              );
              
              if (teamLeader && !fingerprintStatus[teamLeader.employee_id]) {
                results.push({ 
                  success: false, 
                  action: 'added', 
                  item: department, 
                  error: 'Team leader no biometric' 
                });
                continue;
              }
              
              const existingTemplates = await getTemplates();
              const existingZoneShift = existingTemplates.find(template => 
                template.specific_date === dateStr &&
                template.department === department &&
                template.department !== 'Role-Based'
              );
              
              if (existingZoneShift) {
                results.push({ success: false, action: 'added', item: department, error: 'Already scheduled' });
                continue;
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
              
              await createTemplate(templateData);
              results.push({ success: true, action: 'added', item: department });
            } catch (error) {
              results.push({ success: false, action: 'added', item: department, error: error.message });
            }
          }
        }
        
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
        // [Existing fresh schedule logic perfectly preserved...]
        const roleDepartments = formData.departments.filter(dept => dept.startsWith('supervisor_') || dept.startsWith('admin_'));
        const zoneDepartments = formData.departments.filter(dept => !dept.startsWith('supervisor_') && !dept.startsWith('admin_'));
        
        if (roleDepartments.length > 0) {
          try {
            const templateData = {
              shift_name: formData.shift_name,
              start_time: formData.start_time,
              end_time: formData.end_time,
              department: 'Role-Based',
              specific_date: dateStr,
              member_limit: null,
              created_by: "admin"
            };
            
            const result = await createTemplate(templateData);
            
            const selectedEmployeeIds = roleDepartments.map(dept => {
              if (dept.startsWith('supervisor_')) return dept.replace('supervisor_', '');
              else if (dept.startsWith('admin_')) return dept.replace('admin_', '');
              return null;
            }).filter(id => id !== null);
            
            if (selectedEmployeeIds.length > 0) {
              await assignEmployees({
                template_id: result.id,
                employee_ids: selectedEmployeeIds,
                assigned_by: 'admin'
              });
            }
            results.push({ success: true, department: `Management`, result });
          } catch (error) {
            results.push({ success: false, department: `Management Roles`, error: error.message });
          }
        }
        
        for (const department of zoneDepartments) {
          try {
            // Check if team leader has fingerprint enrolled
            const teamLeader = employees.find(emp => 
              emp.department === department && emp.position === 'Team Leader'
            );
            
            if (teamLeader && !fingerprintStatus[teamLeader.employee_id]) {
              results.push({ 
                success: false, 
                department, 
                error: 'Team leader no biometric' 
              });
              continue;
            }
            
            const existingTemplates = await getTemplates();
            const existingZoneShift = existingTemplates.find(template => 
              template.specific_date === dateStr &&
              template.department === department &&
              template.department !== 'Role-Based' 
            );
            
            if (existingZoneShift) {
              results.push({ success: false, department, error: 'Already exists' });
              continue; 
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
      toast.error("Failed to process schedules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <MdCalendarToday className="text-blue-600" />
              {reassignShiftData ? `Reassign to ${reassignShiftData.shift_name}` : `Schedule for ${dateStr}`}
            </h2>
            <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">
              {reassignShiftData ? `Modifying existing shift` : dayName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <MdClose size={20} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <div className="space-y-8">
            
            {editingSchedule ? (
              /* Edit Schedule Form */
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <MdEdit size={18} />
                  Editing Zone: {editingSchedule.department}
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Shift Template</label>
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
                      className="w-full border border-gray-200 bg-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-gray-800"
                    >
                      {shiftTemplates.map((template) => (
                        <option key={template.id} value={template.name}>
                          {template.name} ({template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Member Limit</label>
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
                        if (!e.target.value || parseInt(e.target.value) < 1) {
                          setEditingSchedule(prev => ({ ...prev, member_limit: 1 }));
                        }
                      }}
                      className="w-full border border-gray-200 bg-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-gray-800"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <MdCheck size={18} />}
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingSchedule(null)}
                      className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Create New / Reassign Flow */
              <div className="space-y-8">
                
                {/* Step 1: Select Shift Type */}
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">1</span>
                    Select Shift Type
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shiftTemplates.map((template) => {
                      const isSelected = formData.shift_name === template.name;
                      const isDisabled = reassignShiftData && !isSelected;
                      
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            if (!reassignShiftData) {
                              setFormData(prev => ({
                                ...prev,
                                shift_name: template.name,
                                start_time: template.start_time.substring(0, 5),
                                end_time: template.end_time.substring(0, 5),
                                selectedShiftTemplate: template
                              }));
                            }
                          }}
                          disabled={isDisabled}
                          className={`relative p-4 rounded-xl text-left transition-all border-2 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                              : isDisabled
                              ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 text-blue-500">
                              <MdCheckCircle size={18} />
                            </div>
                          )}
                          <div className="flex items-center gap-3 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full shadow-sm" 
                              style={{ backgroundColor: getShiftColor(template.name) }}
                            ></div>
                            <h5 className={`font-bold ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                              {template.name}
                            </h5>
                          </div>
                          <p className={`text-sm font-medium ml-6 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                            {template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)}
                          </p>
                          {reassignShiftData && isSelected && (
                            <span className="mt-2 ml-6 inline-block text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                              Current Target
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Select Zones and Management */}
                {formData.shift_name && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">2</span>
                      Assign Departments & Roles
                    </h4>

                    <div className={`grid grid-cols-1 ${!isSupervisor ? 'lg:grid-cols-2' : ''} gap-6`}>
                      
                      {/* Left Col: Zone Departments */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                            <MdLocationOn className="text-blue-500" size={18}/>
                            Zones
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
                              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
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
                              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {availableDepartments.length === 0 ? (
                          <div className="text-orange-600 text-xs font-medium p-4 bg-orange-50 border border-orange-100 rounded-lg text-center">
                            {reassignShiftData ? "No additional zones available." : "All departments scheduled."}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            {availableDepartments.map(dept => {
                              const isSelected = formData.departments.includes(dept.name);
                              
                              // Check if team leader has fingerprint for this zone
                              const teamLeader = employees.find(emp => 
                                emp.department === dept.name && emp.position === 'Team Leader'
                              );
                              const hasTeamLeaderFingerprint = teamLeader ? fingerprintStatus[teamLeader.employee_id] : true;
                              const isDisabled = !hasTeamLeaderFingerprint;
                              
                              return (
                                <label 
                                  key={dept.id} 
                                  className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                                    isDisabled 
                                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed' 
                                      : isSelected 
                                        ? 'border-blue-500 bg-blue-50/30 cursor-pointer' 
                                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 cursor-pointer'
                                  }`}
                                  title={isDisabled ? 'Team leader no biometric' : ''}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleDepartmentToggle(dept.name)}
                                    disabled={isDisabled}
                                    className="text-blue-600 focus:ring-blue-500 w-4 h-4 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <div className="flex-1">
                                    <span className={`text-sm font-semibold ${
                                      isDisabled ? 'text-gray-400' : isSelected ? 'text-blue-900' : 'text-gray-700'
                                    }`}>
                                      {dept.name}
                                    </span>
                                    {isDisabled && (
                                      <div className="text-xs text-red-500 mt-1">
                                        Team leader no biometric
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Member Limit Field */}
                        <div className="mt-5 pt-5 border-t border-gray-100">
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Employees Per Zone Limit
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
                              if (!e.target.value || parseInt(e.target.value) < 1) {
                                setFormData({ ...formData, member_limit: 1 });
                              }
                            }}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                            placeholder="Limit"
                          />
                        </div>
                      </div>

                      {/* Right Col: Management Roles - Hidden for Supervisors */}
                      {!isSupervisor && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                            <MdSupervisorAccount className="text-purple-500" size={18}/>
                            Management
                          </h5>
                          {managementSearchTerm && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-1 rounded">
                              {filteredManagementEmployees.length} Found
                            </span>
                          )}
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MdSearch className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search supervisors..."
                            value={managementSearchTerm}
                            onChange={(e) => setManagementSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                          />
                          {managementSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setManagementSearchTerm("")}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              <MdClose className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* List */}
                        <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                          {filteredManagementEmployees.length === 0 ? (
                            <div className="text-center py-10 px-4 text-gray-400 text-sm font-medium border-2 border-dashed border-gray-100 rounded-xl h-full flex items-center justify-center">
                              {managementSearchTerm ? 'No matching staff found.' : 'No supervisors available.'}
                            </div>
                          ) : (
                            filteredManagementEmployees.map((employee) => {
                              const employeeName = employee.firstname && employee.lastname 
                                ? `${employee.firstname} ${employee.lastname}` 
                                : employee.employee_id;
                              
                              const hasFingerprint = fingerprintStatus[employee.employee_id];
                              const roleKey = employee.position === 'Supervisor' 
                                ? `supervisor_${employee.employee_id}` 
                                : `admin_${employee.employee_id}`;
                              const isSelected = formData.departments.includes(roleKey);
                              const isDisabled = !hasFingerprint && !isSelected;
                              
                              return (
                                <label 
                                  key={employee.employee_id} 
                                  className={`flex items-start gap-3 p-3 border-2 rounded-xl transition-all ${
                                    isSelected 
                                      ? 'border-purple-500 bg-purple-50/40' 
                                      : isDisabled 
                                      ? 'border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60' 
                                      : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50 cursor-pointer'
                                  }`}
                                >
                                  <div className="pt-0.5">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleDepartmentToggle(roleKey)}
                                      disabled={isDisabled}
                                      className="text-purple-600 focus:ring-purple-500 w-4 h-4 rounded border-gray-300 disabled:opacity-50"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                      <span className={`text-sm font-bold truncate ${
                                        isSelected ? 'text-purple-900' : isDisabled ? 'text-gray-500' : 'text-gray-800'
                                      }`}>
                                        {employeeName}
                                      </span>
                                      {loadingFingerprints ? (
                                        <span className="text-[9px] uppercase font-bold tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Wait</span>
                                      ) : !hasFingerprint ? (
                                        <span className="text-[9px] uppercase font-bold tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">No Biometric</span>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        ID: {employee.employee_id}
                                      </span>
                                      <span className="text-gray-300">•</span>
                                      <span className={`text-[10px] font-bold uppercase tracking-widest ${employee.position === 'Supervisor' ? 'text-purple-600' : 'text-blue-600'}`}>
                                        {employee.position}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 shrink-0 z-10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          
          {formData.shift_name && !editingSchedule && (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.departments.length}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <MdCheck size={18} />
              )}
              {reassignShiftData ? 'Apply Assignments' : 'Create Schedule'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// Employee Assignment Modal Component (ENHANCED)
// ==========================================

function EmployeeAssignmentModal({ schedule, employees, onClose, onSave }) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [initiallyAssignedEmployees, setInitiallyAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fingerprintStatus, setFingerprintStatus] = useState({});
  const [loadingFingerprints, setLoadingFingerprints] = useState(true);

  // Fetch fingerprint status for all employees
  useEffect(() => {
    const fetchFingerprintStatus = async () => {
      try {
        setLoadingFingerprints(true);
        const status = await getFingerprintStatus();
        setFingerprintStatus(status);
      } catch (error) {
        console.error('❌ Error fetching fingerprint status:', error);
        setFingerprintStatus({});
      } finally {
        setLoadingFingerprints(false);
      }
    };

    fetchFingerprintStatus();
  }, []);

  // Get currently assigned employees
  useEffect(() => {
    if (schedule.assigned_employees) {
      try {
        const assignedEmployees = typeof schedule.assigned_employees === 'string' 
          ? JSON.parse(schedule.assigned_employees) 
          : schedule.assigned_employees;
        const employeeIds = assignedEmployees.map(emp => emp.employee_id);
        setSelectedEmployees(employeeIds);
        setInitiallyAssignedEmployees(employeeIds); 
      } catch (e) {
        setSelectedEmployees([]);
        setInitiallyAssignedEmployees([]);
      }
    }
  }, [schedule]);

  // Filter employees by department and position
  const departmentEmployees = employees.filter(emp => {
    if (schedule.department === 'Role-Based') {
      return emp.position === 'Supervisor' || emp.position === 'Warehouse Admin' || emp.position === 'Warehouse Manager';
    }
    
    const isDepartmentMatch = emp.department === schedule.department || emp.department === "Company-wide";
    
    const isRegularEmployee = emp.position && 
      !emp.position.toLowerCase().includes('supervisor') &&
      !emp.position.toLowerCase().includes('admin') &&
      !emp.position.toLowerCase().includes('team leader') &&
      !emp.position.toLowerCase().includes('teamleader') &&
      !emp.position.toLowerCase().includes('team-leader') &&
      !emp.position.toLowerCase().includes('manager');
    
    return isDepartmentMatch && isRegularEmployee;
  });

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      const isCurrentlySelected = prev.includes(employeeId);
      
      if (!isCurrentlySelected) {
        const hasFingerprint = fingerprintStatus[employeeId];
        if (!hasFingerprint) {
          toast.error(`Employee ${employeeId} must have a fingerprint enrolled before being scheduled.`);
          return prev;
        }
        
        if (schedule.department !== 'Role-Based' && schedule.member_limit && prev.length >= schedule.member_limit) {
          toast.warning(`Zone limit reached: Cannot assign more than ${schedule.member_limit} employees.`);
          return prev;
        }
      }
      
      return isCurrentlySelected 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId];
    });
  };

  const handleSave = async () => {
    if (schedule.department !== 'Role-Based' && schedule.member_limit && selectedEmployees.length > schedule.member_limit) {
      toast.error(`Cannot assign more than ${schedule.member_limit} employees to this zone.`);
      return;
    }
    
    const employeesToAdd = selectedEmployees.filter(empId => !initiallyAssignedEmployees.includes(empId));
    const employeesWithoutFingerprints = employeesToAdd.filter(empId => !fingerprintStatus[empId]);
    
    if (employeesWithoutFingerprints.length > 0) {
      toast.error(`Cannot assign. The following employees need fingerprints enrolled: ${employeesWithoutFingerprints.join(', ')}`);
      return;
    }
    
    setLoading(true);
    try {
      const employeesToRemove = initiallyAssignedEmployees.filter(empId => !selectedEmployees.includes(empId));
      let operationsCompleted = 0;
      
      if (employeesToAdd.length > 0) {
        await assignEmployees({
          template_id: schedule.id,
          employee_ids: employeesToAdd,
          assigned_by: 'admin'
        });
        operationsCompleted++;
      }
      
      if (employeesToRemove.length > 0) {
        await removeEmployeesFromTemplate(schedule.id, employeesToRemove);
        operationsCompleted++;
      }
      
      if (operationsCompleted > 0) {
        toast.success('Assignments updated successfully!');
        onSave();
      } else {
        toast.info('No changes made to assignments.');
      }
    } catch (error) {
      toast.error('Failed to update assignments.');
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = schedule.department !== 'Role-Based' && schedule.member_limit && selectedEmployees.length >= schedule.member_limit;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-gray-100 z-10 shrink-0">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <MdPeople size={20} />
              </div>
              {schedule.department === 'Role-Based' ? 'Assign Management Roles' : `Assign Employees to ${schedule.department}`}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                {schedule.shift_name}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-semibold text-gray-600">
                {schedule.start_time} - {schedule.end_time}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <MdClose size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {schedule.department === 'Role-Based' 
                ? `Select supervisors to assign:`
                : `Select employees to assign:`
              }
            </p>
            {schedule.member_limit && schedule.department !== 'Role-Based' && (
              <div className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-sm ${
                isLimitReached 
                  ? 'bg-orange-50 text-orange-700 border-orange-200' 
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {selectedEmployees.length} / {schedule.member_limit} Assigned
              </div>
            )}
          </div>
          
          {/* Currently Assigned Box */}
          {selectedEmployees.length > 0 && (
            <div className="mb-6 p-4 bg-white border border-blue-100 rounded-xl shadow-sm">
              <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Currently Assigned</h4>
              <div className="flex flex-wrap gap-2">
                {selectedEmployees.map(empId => {
                  const employee = departmentEmployees.find(emp => emp.employee_id === empId);
                  if (!employee) return null;
                  
                  const employeeName = employee.firstname && employee.lastname 
                    ? `${employee.firstname} ${employee.lastname}`
                    : employee.employee_id;
                  
                  return (
                    <div key={empId} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 pl-3 pr-1.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:border-blue-300 transition-colors">
                      <span>{employeeName}</span>
                      <button
                        onClick={() => handleEmployeeToggle(empId)}
                        className="text-blue-400 hover:text-rose-600 hover:bg-white p-0.5 rounded-md transition-colors"
                        title="Remove"
                      >
                        <MdClose size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Available Employees List */}
          {departmentEmployees.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-200 border-dashed rounded-xl">
              <MdPeople size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium text-sm">
                {schedule.department === 'Role-Based' 
                  ? 'No supervisors or admins found.'
                  : `No employees found in ${schedule.department}.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-2">
                {schedule.department === 'Role-Based' ? 'Available Management' : 'Available Employees'}
              </h4>
              
              {departmentEmployees.map(employee => {
                const employeeName = employee.firstname && employee.lastname 
                  ? `${employee.firstname} ${employee.lastname}`
                  : employee.employee_id;
                
                const isSelected = selectedEmployees.includes(employee.employee_id);
                const hasFingerprint = fingerprintStatus[employee.employee_id];
                
                const isDisabledForLimit = schedule.department !== 'Role-Based' && schedule.member_limit && selectedEmployees.length >= schedule.member_limit && !isSelected;
                const isDisabledForFingerprint = !hasFingerprint && !isSelected;
                const isDisabled = isDisabledForLimit || isDisabledForFingerprint;
                
                return (
                  <label key={employee.employee_id} className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 
                    isDisabled ? 'border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60' : 
                    'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleEmployeeToggle(employee.employee_id)}
                      disabled={isDisabled}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 rounded border-gray-300 disabled:opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-base font-bold truncate ${isSelected ? 'text-blue-900' : isDisabled ? 'text-gray-500' : 'text-gray-800'}`}>
                          {employeeName}
                        </span>
                        {/* Status Badges */}
                        <div className="flex gap-2 shrink-0">
                          {loadingFingerprints ? (
                            <span className="text-[9px] uppercase font-bold tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Checking...</span>
                          ) : !hasFingerprint ? (
                            <span className="text-[9px] uppercase font-bold tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">No Biometric</span>
                          ) : null}
                          {employee.position === "Supervisor" && (
                            <span className="text-[9px] uppercase font-bold tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Supervisor</span>
                          )}
                        </div>
                      </div>
                      <div className={`text-xs font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                        ID: <span className="font-mono">{employee.employee_id}</span> • {employee.position || 'Employee'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 shrink-0 z-10">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving</>
            ) : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Shift Details Modal Component (ENHANCED)
// ==========================================

function ShiftDetailsModal({ shiftData, onClose, employees, onSave, onReassign, isSupervisor }) {
  if (!shiftData) return null;

  const [showShiftAssignModal, setShowShiftAssignModal] = useState(false);
  const [selectedShiftZoneForAssign, setSelectedShiftZoneForAssign] = useState(null);
  const [editingZone, setEditingZone] = useState(null);

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employee_id === employeeId);
    if (employee) {
      return employee.firstname && employee.lastname 
        ? `${employee.firstname} ${employee.lastname}`
        : employeeId;
    }
    return employeeId;
  };

  const zones = shiftData.zones.filter(zone => zone.department !== 'Role-Based');
  const roleBasedZones = shiftData.zones.filter(zone => zone.department === 'Role-Based');
  
  const roles = roleBasedZones.length > 0 ? [{
    department: 'Role-Based',
    template_id: roleBasedZones[0].template_id,
    member_limit: null,
    assigned_count: roleBasedZones.reduce((sum, zone) => sum + zone.assigned_count, 0),
    members: roleBasedZones.reduce((allMembers, zone) => [...allMembers, ...(zone.members || [])], [])
  }] : [];

  const handleAssignEmployees = (zone) => {
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
    const roleBasedTemplate = roles[0];
    if (!roleBasedTemplate) return;
    
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
    const scheduleDate = new Date(shiftData.date);
    onClose(); 
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
      toast.error("Failed to update schedule");
    }
  };

  const handleDeleteZone = async (zone) => {
    confirmAction(`Delete ${zone.department} schedule?`, async () => {
      try {
        await deleteTemplate(zone.template_id);
        toast.success(`${zone.department} schedule deleted!`);
        onSave();
        onClose(); 
      } catch (error) {
        toast.error("Failed to delete schedule");
      }
    });
  };

  const handleDeleteAllManagementRoles = async () => {
    const roleBasedZones = shiftData.zones.filter(zone => zone.department === 'Role-Based');
    if (roleBasedZones.length === 0) return;
    confirmAction(`Remove all management roles from this shift?`, async () => {
      try {
        const deletePromises = roleBasedZones.map(zone => deleteTemplate(zone.template_id));
        await Promise.all(deletePromises);
        toast.success("All management roles removed from shift!");
        onSave();
        onClose(); 
      } catch (error) {
        toast.error("Failed to remove management roles");
      }
    });
  };

  const handleDeleteManagementRole = async (role, employeeId, employeeName) => {
    confirmAction(`Remove ${employeeName} from this shift?`, async () => {
      try {
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
        
        const updatedZone = roleBasedZones.find(zone => zone.template_id === targetTemplateId);
        const remainingMembers = updatedZone?.members?.filter(member => member.employee_id !== employeeId) || [];
        
        if (remainingMembers.length === 0) {
          await deleteTemplate(targetTemplateId);
          toast.info("Role-based template removed as it has no more assigned employees");
          const otherRoleTemplates = roleBasedZones.filter(zone => zone.template_id !== targetTemplateId);
          if (otherRoleTemplates.length === 0) onClose();
        }
        onSave();
      } catch (error) {
        toast.error("Failed to remove employee from schedule");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="bg-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 z-10 shrink-0 gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: getShiftColor(shiftData.shift_name) }}></div>
              {shiftData.shift_name} Details
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                {shiftData.date}
              </span>
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                {shiftData.start_time} - {shiftData.end_time}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-100">
                {zones.length} Zone{zones.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-md border border-purple-100">
                {roles.length} Role{roles.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => handleReassignSchedule()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center gap-2 focus:ring-4 focus:ring-blue-100"
              title="Add more zones or management roles to this schedule"
            >
              <MdAdd size={16} />
              Reassign / Edit
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Zone Assignments Column */}
            <div>
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MdLocationOn size={16} />
                Zone Assignments ({zones.length})
              </h4>
              
              {zones.length === 0 ? (
                <div className="text-center py-8 bg-white border border-gray-200 border-dashed rounded-xl">
                  <p className="text-gray-400 text-sm font-medium">No zones scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {zones.map((zone, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:border-blue-200 transition-colors">
                      {editingZone && editingZone.id === zone.template_id ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                            <h5 className="font-bold text-gray-900">{zone.department}</h5>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Member Limit</label>
                            <input
                              type="number" min="1"
                              value={editingZone.member_limit || ''}
                              onChange={e => {
                                const value = e.target.value;
                                setEditingZone(prev => ({ ...prev, member_limit: value === '' ? null : parseInt(value) || 1 }));
                              }}
                              onBlur={e => {
                                if (!e.target.value || parseInt(e.target.value) < 1) {
                                  setEditingZone(prev => ({ ...prev, member_limit: 1 }));
                                }
                              }}
                              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={handleSaveEdit} className="flex-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">Save</button>
                            <button onClick={() => setEditingZone(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getShiftColor(shiftData.shift_name) }}></div>
                                <h5 className="font-bold text-gray-900 text-base tracking-tight">{zone.department}</h5>
                              </div>
                              <p className="text-xs font-medium text-gray-500 mt-1">
                                Assigned capacity: <span className={`font-bold ${zone.assigned_count >= zone.member_limit ? 'text-orange-600' : 'text-gray-800'}`}>{zone.assigned_count}/{zone.member_limit}</span>
                              </p>
                            </div>
                            
                            <div className="flex gap-1.5 ml-2">
                              <button onClick={() => handleAssignEmployees(zone)} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors" title="Assign Employees"><MdPersonAdd size={16} /></button>
                              <button onClick={() => handleEditZone(zone)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title="Edit Limit"><MdEdit size={16} /></button>
                              <button onClick={() => handleDeleteZone(zone)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors" title="Delete Zone"><MdDelete size={16} /></button>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Assigned Employees:</p>
                            
                            {!zone.members || zone.members.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">None assigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {zone.members.map((member, idx) => (
                                  <span key={idx} className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                                    {getEmployeeName(member.employee_id)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Management Roles Column */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest flex items-center gap-2">
                  <MdSupervisorAccount size={16} />
                  Management Roles ({roles.reduce((total, role) => total + (role.members?.length || 0), 0)})
                </h4>
              </div>
              
              {roles.length === 0 ? (
                <div className="text-center py-8 bg-white border border-gray-200 border-dashed rounded-xl">
                  <p className="text-gray-400 text-sm font-medium">No management roles scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roles.map((role, index) => {
                    const roleMembers = role.members || [];
                    
                    if (roleMembers.length === 0) {
                      return (
                        <div key={`role-${index}`} className="border-2 border-purple-100 bg-white rounded-xl p-5 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h5 className="font-bold text-gray-900">Role-Based Template</h5>
                              <p className="text-xs font-medium text-gray-500 mt-1">No assignments yet</p>
                            </div>
                            {!isSupervisor && (
                            <button onClick={() => handleDeleteManagementRole(role, null, "Role-Based Template")} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors" title="Delete Template">
                              <MdDelete size={16} />
                            </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return roleMembers.map((member, memberIndex) => {
                      const employee = employees.find(emp => emp.employee_id === member.employee_id);
                      const employeeName = employee ? (employee.firstname && employee.lastname ? `${employee.firstname} ${employee.lastname}` : member.employee_id) : member.employee_id;
                      const employeeRole = employee?.role;
                      const roleTitle = employeeRole === 'supervisor' ? 'Supervisor' : 'Warehouse Admin';
                      
                      return (
                        <div key={`${index}-${memberIndex}`} className="border border-gray-200 bg-white rounded-xl p-5 shadow-sm hover:border-purple-200 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h5 className="font-bold text-gray-900 tracking-tight">{roleTitle}</h5>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Management</span>
                              </div>
                              <p className="text-sm font-semibold text-purple-700">{employeeName}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {member.employee_id}</p>
                            </div>
                            {!isSupervisor && (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleDeleteManagementRole(role, member.employee_id, employeeName)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors" title="Remove Role">
                                <MdDelete size={16} />
                              </button>
                            </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  }).flat()}
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex justify-end shrink-0 z-10">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all">
            Close Panel
          </button>
        </div>
      </div>

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
            await onSave();
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

  // Get user role
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role || "";
  const isSupervisor = userRole === "supervisor";

  useEffect(() => {
    fetchTemplatesData();
    fetchDepartmentsData();
    fetchShiftTemplatesData();
    fetchEmployeesData();
  }, []);

  useEffect(() => {
    generateCalendarEvents();
  }, [templates]);

  const refreshShiftDetailsData = async () => {
    try {
      setLoading(true);
      const freshTemplates = await getTemplates();
      setTemplates(freshTemplates);
      
      if (selectedShiftData && showShiftDetailsModal) {
        const shiftsByDate = {};
        freshTemplates.forEach(template => {
          if (!template.specific_date) return;
          const dateKey = template.specific_date;
          if (!shiftsByDate[dateKey]) shiftsByDate[dateKey] = {};
          if (!shiftsByDate[dateKey][template.shift_name]) {
            shiftsByDate[dateKey][template.shift_name] = {
              shift_name: template.shift_name, start_time: template.start_time, end_time: template.end_time, date: dateKey, zones: []
            };
          }
          
          let templateAssignedEmployees = [];
          if (template.assigned_employees) {
            try {
              const assignedEmployeesData = typeof template.assigned_employees === 'string' 
                ? JSON.parse(template.assigned_employees) 
                : template.assigned_employees;
              templateAssignedEmployees = assignedEmployeesData.map(assignment => ({
                employee_id: assignment.employee_id, assigned_date: assignment.assigned_date, assigned_by: assignment.assigned_by, template_id: template.id
              }));
            } catch (e) {}
          }
          
          shiftsByDate[dateKey][template.shift_name].zones.push({
            department: template.department, template_id: template.id, member_limit: template.member_limit, assigned_count: templateAssignedEmployees.length, members: templateAssignedEmployees
          });
        });
        
        const updatedShiftData = shiftsByDate[selectedShiftData.date]?.[selectedShiftData.shift_name];
        if (updatedShiftData) setSelectedShiftData(updatedShiftData);
      }
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesData = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
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
      toast.error("Failed to load departments");
    }
  };

  const fetchShiftTemplatesData = async () => {
    try {
      const data = await getShiftTemplates();
      setShiftTemplates(data);
    } catch (error) {
      toast.error("Failed to load shift templates");
    }
  };

  const fetchEmployeesData = async () => {
    try {
      const data = await fetchEmployees();
      const activeEmployees = data.filter(emp => emp.status === 'Active');
      setEmployees(activeEmployees);
    } catch (error) {
      toast.error("Failed to load employees");
    }
  };

  const generateCalendarEvents = useCallback(() => {
    const events = [];
    const shiftsByDate = {};

    templates.forEach(template => {
      if (!template.specific_date) return;

      const dateKey = template.specific_date;
      if (!shiftsByDate[dateKey]) shiftsByDate[dateKey] = {};
      if (!shiftsByDate[dateKey][template.shift_name]) {
        shiftsByDate[dateKey][template.shift_name] = {
          shift_name: template.shift_name, start_time: template.start_time, end_time: template.end_time, date: dateKey, zones: []
        };
      }
      
      let templateAssignedEmployees = [];
      if (template.assigned_employees) {
        try {
          const assignedEmployeesData = typeof template.assigned_employees === 'string' 
            ? JSON.parse(template.assigned_employees) 
            : template.assigned_employees;
          templateAssignedEmployees = assignedEmployeesData.map(assignment => ({
            employee_id: assignment.employee_id, assigned_date: assignment.assigned_date, assigned_by: assignment.assigned_by, template_id: template.id
          }));
        } catch (e) {}
      }
      
      shiftsByDate[dateKey][template.shift_name].zones.push({
        department: template.department, template_id: template.id, member_limit: template.member_limit, assigned_count: templateAssignedEmployees.length, members: templateAssignedEmployees
      });
    });

    Object.entries(shiftsByDate).forEach(([date, shifts]) => {
      Object.entries(shifts).forEach(([shiftName, shiftData]) => {
        const startTime = formatTime24Short(shiftData.start_time);
        const endTime = formatTime24Short(shiftData.end_time);
        const backgroundColor = getShiftColor(shiftName);
        
        const eventDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDate = eventDate < today;
        const totalAssigned = shiftData.zones.reduce((sum, zone) => sum + zone.assigned_count, 0);
        
        events.push({
          id: `${date}-${shiftName}`,
          title: `${startTime} - ${endTime} ${shiftName}`,
          start: `${date}T${startTime}`,
          end: `${date}T${endTime}`,
          backgroundColor: isPastDate ? '#9ca3af' : backgroundColor,
          borderColor: isPastDate ? '#6b7280' : backgroundColor,
          textColor: "white",
          classNames: isPastDate ? ['past-event'] : [],
          extendedProps: {
            shiftData: shiftData, zoneCount: shiftData.zones.length, totalAssigned: totalAssigned, shiftName: shiftName, startTime: shiftData.start_time, endTime: shiftData.end_time, specificDate: date, isPast: isPastDate
          }
        });
      });
    });

    setCalendarEvents(events);
  }, [templates]);

  const handleDateClick = (info) => {
    const clickedDate = new Date(info.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (clickedDate < today) {
      toast.warning("Cannot schedule on past dates");
      return;
    }
    
    setSelectedDate(clickedDate);
    setShowScheduleModal(true);
  };

  const handleEventClick = (info) => {
    const event = info.event;
    const props = event.extendedProps;
    if (props.isPast) {
      toast.info("Cannot modify past schedules");
      return;
    }
    if (props.shiftData) {
      setSelectedShiftData(props.shiftData);
      setShowShiftDetailsModal(true);
    }
  };

  const handleDeleteEvent = async (shiftData, specificDate, shiftName) => {
    confirmAction(`Remove all ${shiftName} schedules for ${specificDate}?`, async () => {
      try {
        const deletePromises = shiftData.zones.map(zone => deleteTemplate(zone.template_id));
        await Promise.all(deletePromises);
        toast.success(`${shiftName} schedules removed for ${specificDate}`);
        fetchTemplatesData();
      } catch (error) {
        toast.error("Failed to delete schedules");
      }
    });
  };

  const handleEditSchedule = (schedule, day) => {
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3"></div>
        <button
          onClick={() => {
            setShiftTemplateForm({name:"",start:"",end:""});
            setEditingShiftIndex(null);
            setShowShiftTemplateModal(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-[#2546b3] transition-colors shadow-sm"
        >
          <span className="hidden sm:inline font-medium">Manage Shift Templates</span>
        </button>
      </div>

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
            right: "",
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
            start: new Date().toISOString().split('T')[0]
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
            if (info.event.extendedProps.isPast) {
              info.el.style.opacity = '0.6';
              info.el.style.cursor = 'default';
            }
          }}
          dayCellDidMount={(info) => {
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

      {showScheduleModal && selectedDate && (
        <ScheduleModal
          selectedDate={selectedDate}
          reassignShiftData={reassignShiftData}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedDate(null);
            setReassignShiftData(null); 
          }}
          onSave={fetchTemplatesData}
          departments={departments}
          shiftTemplates={shiftTemplates}
          existingSchedules={templates}
          onEditSchedule={handleEditSchedule}
          onDeleteSchedule={handleDeleteEvent}
          isSupervisor={isSupervisor}
        />
      )}

      {showShiftTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">
              {editingShiftIndex !== null ? "Edit" : "Manage"} Shift Templates
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shift Name</label>
                <input
                  placeholder="e.g., Morning Shift"
                  className="w-full border border-gray-200 bg-gray-50 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                  value={shiftTemplateForm.name}
                  onChange={e => setShiftTemplateForm({...shiftTemplateForm, name: e.target.value})}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Time</label>
                  <input
                    type="time"
                    className="w-full border border-gray-200 bg-gray-50 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                    value={shiftTemplateForm.start}
                    onChange={e => setShiftTemplateForm({...shiftTemplateForm, start: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Time</label>
                  <input
                    type="time"
                    className="w-full border border-gray-200 bg-gray-50 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                    value={shiftTemplateForm.end}
                    onChange={e => setShiftTemplateForm({...shiftTemplateForm, end: e.target.value})}
                  />
                </div>
              </div>
              <button
                onClick={handleShiftTemplateSubmit}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors"
              >
                {editingShiftIndex !== null ? "Update Template" : "Create Template"}
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 border-t pt-4 custom-scrollbar pr-1">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Existing Templates</h4>
              {shiftTemplates.map((template, i) => (
                <div key={i} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl bg-white hover:border-gray-200 shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getShiftColor(template.name) }}></div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-800">{template.name}</h5>
                      <span className="text-xs font-medium text-gray-500">
                        {template.start_time?.substring(0, 5)} - {template.end_time?.substring(0, 5)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setShiftTemplateForm({
                          name: template.name,
                          start: template.start_time?.substring(0, 5) || "",
                          end: template.end_time?.substring(0, 5) || ""
                        });
                        setEditingShiftIndex(i);
                      }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
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
                            toast.error("Failed to delete template");
                          }
                        });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {shiftTemplates.length === 0 && (
                <p className="text-gray-400 text-center py-4 text-sm font-medium">No shift templates created yet.</p>
              )}
            </div>
            
            <button
              onClick={() => setShowShiftTemplateModal(false)}
              className="w-full mt-4 bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showShiftDetailsModal && selectedShiftData && (
        <ShiftDetailsModal
          shiftData={selectedShiftData}
          employees={employees}
          onSave={refreshShiftDetailsData}
          onReassign={(date, shiftData) => {
            setSelectedDate(date);
            setReassignShiftData(shiftData); 
            setShowScheduleModal(true);
          }}
          onClose={() => {
            setShowShiftDetailsModal(false);
            setSelectedShiftData(null);
          }}
          isSupervisor={isSupervisor}
        />
      )}
    </div>
  );
}