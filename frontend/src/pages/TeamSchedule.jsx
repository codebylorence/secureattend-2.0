import { useState, useEffect } from "react";
import { MdSchedule, MdPeople, MdDelete, MdAccessTime, MdCalendarToday, MdEventNote, MdClose, MdCheckCircle, MdWarning } from "react-icons/md";
import { 
  getTemplatesByDepartment, 
  assignSchedule, 
  getEmployeeSchedules, 
  deleteEmployeeSchedule,
  removeDaysFromEmployeeSchedule 
} from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { useSocket } from "../context/SocketContext";
import { toast } from 'react-toastify';
import { confirmAction } from "../utils/confirmToast.jsx";
import { formatTimeRange24 } from "../utils/timeFormat";

export default function TeamSchedule() {
  const [templates, setTemplates] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedSchedules, setAssignedSchedules] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // NEW: Selected day for assignment
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [selectedDaysToDelete, setSelectedDaysToDelete] = useState([]);
  const { socket } = useSocket();
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userDepartment = user.employee?.department || "";

  useEffect(() => {
    if (userDepartment) {
      fetchTemplates();
      fetchTeamMembers();
      fetchAssignedSchedules();
    }
  }, [userDepartment]);

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time updates
    socket.on('schedules:published', () => {
      console.log('📡 Schedules published - refreshing...');
      fetchTemplates();
      fetchAssignedSchedules();
    });

    socket.on('drafts:published', () => {
      console.log('📡 Drafts published - refreshing...');
      fetchAssignedSchedules();
    });

    socket.on('employee:assigned', (data) => {
      console.log('📡 TeamSchedule: Employee assigned - refreshing...', data);
      fetchAssignedSchedules();
      fetchTemplates(); // Also refresh templates to get updated assigned_employees
    });

    socket.on('template:created', () => {
      console.log('📡 TeamSchedule: Template created - refreshing...');
      fetchTemplates();
    });

    socket.on('template:updated', () => {
      console.log('📡 TeamSchedule: Template updated - refreshing...');
      fetchTemplates();
      fetchAssignedSchedules();
    });

    return () => {
      socket.off('schedules:published');
      socket.off('drafts:published');
      socket.off('employee:assigned');
      socket.off('template:created');
      socket.off('template:updated');
    };
  }, [socket]);

  const fetchTemplates = async () => {
    try {
      // Get all templates for the department
      const data = await getTemplatesByDepartment(userDepartment);
      
      // Filter templates to only show current and future dates
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const currentAndFutureTemplates = data.filter(template => {
        // For specific date templates, only show today and future dates
        if (template.specific_date) {
          return template.specific_date >= todayStr;
        }
        
        // For legacy day-based templates, keep existing logic
        if (template.days && template.days.length > 0) {
          return hasCurrentOrFutureDays(template);
        }
        
        return false;
      });
      
      console.log(`📋 TeamSchedule: Found ${currentAndFutureTemplates.length} current/future templates for ${userDepartment}`);
      
      // Show all templates regardless of assignment status
      // Team leaders should be able to see and assign to all templates in their department
      setTemplates(currentAndFutureTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const allEmployees = await fetchEmployees();
      // Filter employees from the same department
      const teamMembers = allEmployees.filter(
        (emp) => emp.department === userDepartment && emp.employee_id !== user.employee?.employee_id
      );
      setTeamMembers(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchAssignedSchedules = async () => {
    try {
      // Get schedules from both legacy system and new template system
      const allSchedules = await getEmployeeSchedules();
      const allEmployees = await fetchEmployees();
      
      // Filter schedules for employees in the same department
      // INCLUDE the team leader's schedule for counting purposes
      const teamSchedules = allSchedules.filter((schedule) => {
        const employee = allEmployees.find(emp => emp.employee_id === schedule.employee_id);
        return employee && employee.department === userDepartment;
      });
      
      // Transform to match old structure for display
      const transformedSchedules = teamSchedules.map(schedule => ({
        id: schedule.id,
        employee_id: schedule.employee_id,
        shift_name: schedule.shift_name || schedule.template?.shift_name,
        start_time: schedule.start_time || schedule.template?.start_time,
        end_time: schedule.end_time || schedule.template?.end_time,
        days: schedule.days || [],
        department: schedule.department || schedule.template?.department,
        template_id: schedule.template_id,
        specific_date: schedule.specific_date || schedule.template?.specific_date
      }));
      
      // Merge schedules with same employee, shift, and time but different days
      const mergedSchedules = mergeSchedulesByShift(transformedSchedules);
      
      setAssignedSchedules(mergedSchedules);
    } catch (error) {
      console.error("Error fetching assigned schedules:", error);
    }
  };

  // Function to merge schedules with same employee, shift name, and time
  const mergeSchedulesByShift = (schedules) => {
    const groupedSchedules = {};
    
    schedules.forEach(schedule => {
      // Create a unique key for grouping: employee_id + shift_name + start_time + end_time
      const groupKey = `${schedule.employee_id}-${schedule.shift_name}-${schedule.start_time}-${schedule.end_time}`;
      
      if (groupedSchedules[groupKey]) {
        // Merge days and keep track of all IDs for deletion
        groupedSchedules[groupKey].days = [...new Set([...groupedSchedules[groupKey].days, ...schedule.days])];
        groupedSchedules[groupKey].ids.push(schedule.id);
      } else {
        // Create new group
        groupedSchedules[groupKey] = {
          ...schedule,
          id: `merged-${groupKey}`, // Create a unique ID for merged schedules
          originalId: schedule.id, // Keep original ID for single schedules
          days: [...schedule.days], // Create a copy of the days array
          ids: [schedule.id] // Keep track of all schedule IDs for deletion
        };
      }
    });
    
    // Convert back to array and sort days for consistent display
    return Object.values(groupedSchedules).map(schedule => ({
      ...schedule,
      days: schedule.days.sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return dayOrder.indexOf(a) - dayOrder.indexOf(b);
      })
    }));
  };

  const parseTime = (timeStr) => {
    // Parse "8:00 AM" format to minutes since midnight
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  // Check if a shift has started or ended for today
  // This prevents scheduling employees to shifts that are ongoing or have already ended
  const isShiftTimePassedForToday = (startTime, endTime) => {
    // TEMPORARILY DISABLED FOR TESTING - Always return false to allow scheduling
    return false;
    
    // Original logic (commented out):
    // const now = new Date();
    // const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // const shiftStartMinutes = parseTime(startTime);
    // const shiftEndMinutes = parseTime(endTime);
    // 
    // // Return true if shift has started (ongoing or ended)
    // return currentMinutes >= shiftStartMinutes;
  };

  const getDayOfWeek = (date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  // Check if a specific day is today and the shift time has started or passed
  // Used to disable day selection for shifts that are ongoing or have already ended today
  const isTodayAndShiftPassed = (day) => {
    if (!selectedTemplate) return false;
    
    const today = new Date();
    const todayDayName = getDayOfWeek(today);
    
    // Check if the selected day is today
    if (day === todayDayName) {
      return isShiftTimePassedForToday(selectedTemplate.start_time, selectedTemplate.end_time);
    }
    
    return false;
  };

  const hasTimeOverlap = (start1, end1, start2, end2) => {
    // Convert times to minutes
    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);
    
    // Handle overnight shifts (end time < start time)
    const e1Adjusted = e1 < s1 ? e1 + 1440 : e1; // Add 24 hours if overnight
    const e2Adjusted = e2 < s2 ? e2 + 1440 : e2;
    
    // Check for overlap: shifts overlap if one starts before the other ends
    return s1 < e2Adjusted && s2 < e1Adjusted;
  };

  const hasScheduleConflict = (employeeId) => {
    if (!selectedTemplate) return false;
    
    // Check if employee already has a schedule with time conflicts on overlapping days
    const employeeSchedules = assignedSchedules.filter(
      (schedule) => schedule.employee_id === employeeId
    );
    
    // Check for time conflicts on each day
    const conflictingDays = [];
    employeeSchedules.forEach((schedule) => {
      // Check if this is a multi-shift record
      if (schedule.shifts && Array.isArray(schedule.shifts)) {
        schedule.shifts.forEach((shift) => {
          // Check if this is the exact same shift
          if (
            shift.shift_name === selectedTemplate.shift_name &&
            shift.start_time === selectedTemplate.start_time &&
            shift.end_time === selectedTemplate.end_time
          ) {
            // Same shift - mark all overlapping days as conflicts
            shift.days.forEach((day) => {
              if (selectedTemplate.days.includes(day) && !conflictingDays.includes(day)) {
                conflictingDays.push(day);
              }
            });
          } else {
            // Different shift - check for time overlap
            shift.days.forEach((day) => {
              if (selectedTemplate.days.includes(day)) {
                if (hasTimeOverlap(
                  selectedTemplate.start_time,
                  selectedTemplate.end_time,
                  shift.start_time,
                  shift.end_time
                )) {
                  if (!conflictingDays.includes(day)) {
                    conflictingDays.push(day);
                  }
                }
              }
            });
          }
        });
      } else {
        // Legacy single shift format
        // Check if this is the exact same shift
        if (
          schedule.shift_name === selectedTemplate.shift_name &&
          schedule.start_time === selectedTemplate.start_time &&
          schedule.end_time === selectedTemplate.end_time
        ) {
          // Same shift - mark all overlapping days as conflicts
          schedule.days.forEach((day) => {
            if (selectedTemplate.days.includes(day) && !conflictingDays.includes(day)) {
              conflictingDays.push(day);
            }
          });
        } else {
          // Different shift - check for time overlap
          schedule.days.forEach((day) => {
            if (selectedTemplate.days.includes(day)) {
              if (hasTimeOverlap(
                selectedTemplate.start_time,
                selectedTemplate.end_time,
                schedule.start_time,
                schedule.end_time
              )) {
                if (!conflictingDays.includes(day)) {
                  conflictingDays.push(day);
                }
              }
            }
          });
        }
      }
    });
    
    // Only return true if ALL days in template have time conflicts
    return conflictingDays.length === selectedTemplate.days.length;
  };

  const getMemberLimitStatus = (day) => {
    if (!selectedTemplate) return { current: 0, limit: null, isFull: false };
    
    // Get the limit for this specific day
    let dayLimit = null;
    if (selectedTemplate.day_limits && selectedTemplate.day_limits[day]) {
      dayLimit = selectedTemplate.day_limits[day];
    } else if (selectedTemplate.member_limit) {
      dayLimit = selectedTemplate.member_limit;
    }
    
    if (!dayLimit) return { current: 0, limit: null, isFull: false };
    
    // Count current assignments for this day (including team leaders)
    let currentCount = 0;
    
    assignedSchedules.forEach(schedule => {
      // Check if this is a multi-shift record
      if (schedule.shifts && Array.isArray(schedule.shifts)) {
        // Check each shift in the array
        schedule.shifts.forEach(shift => {
          if (
            shift.shift_name === selectedTemplate.shift_name &&
            shift.start_time === selectedTemplate.start_time &&
            shift.end_time === selectedTemplate.end_time &&
            shift.days.includes(day)
          ) {
            currentCount++;
          }
        });
      } else {
        // Legacy single shift format
        if (
          schedule.shift_name === selectedTemplate.shift_name &&
          schedule.start_time === selectedTemplate.start_time &&
          schedule.end_time === selectedTemplate.end_time &&
          schedule.days.includes(day)
        ) {
          currentCount++;
        }
      }
    });
    
    return {
      current: currentCount,
      limit: dayLimit,
      isFull: currentCount >= dayLimit
    };
  };

  const isLimitReached = (employeeId) => {
    if (!selectedTemplate) return false;
    
    // Check if ALL days in the template are full
    // Only block if every single day has reached its limit
    const allDaysFull = selectedTemplate.days.every(day => {
      const status = getMemberLimitStatus(day);
      return status.isFull;
    });
    
    return allDaysFull;
  };

  const getLimitReachedDays = (employeeId) => {
    if (!selectedTemplate) return [];
    
    const fullDays = [];
    for (const day of selectedTemplate.days) {
      const status = getMemberLimitStatus(day);
      if (status.isFull) {
        fullDays.push(`${day} (${status.current}/${status.limit})`);
      }
    }
    
    return fullDays;
  };

  const getAvailableDays = (employeeId) => {
    if (!selectedTemplate) return [];
    
    const conflictDays = getConflictDays(employeeId);
    
    const availableDays = [];
    for (const day of selectedTemplate.days) {
      // Skip days that already have a schedule
      if (conflictDays.includes(day)) continue;
      
      const status = getMemberLimitStatus(day);
      if (!status.isFull) {
        availableDays.push(day);
      }
    }
    
    return availableDays;
  };

  const handleEmployeeToggle = (employeeId) => {
    // If already selected, allow deselection
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
      return;
    }
    
    // Check if employee already has this shift on the selected day
    const hasConflictOnDay = assignedSchedules.some(schedule => {
      if (schedule.employee_id !== employeeId) return false;
      if (schedule.shift_name !== selectedTemplate.shift_name) return false;
      if (schedule.start_time !== selectedTemplate.start_time) return false;
      if (schedule.end_time !== selectedTemplate.end_time) return false;
      return schedule.days.includes(selectedDay);
    });

    if (hasConflictOnDay) {
      toast.warning(`${getEmployeeName(employeeId)} already has this shift on ${selectedDay}`);
      return;
    }

    // Check member limit for the selected day
    if (selectedDay) {
      const status = getMemberLimitStatus(selectedDay);
      if (status.limit) {
        if (status.current + selectedEmployees.length >= status.limit) {
          toast.error(`Cannot select more employees: Member limit (${status.limit}) reached for ${selectedDay}`);
          return;
        }
      }
    }
    
    setSelectedEmployees((prev) => [...prev, employeeId]);
  };

  const handleDayToggleForEmployee = (employeeId, day) => {
    setEmployeeDays((prev) => {
      const currentDays = prev[employeeId] || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      
      return {
        ...prev,
        [employeeId]: newDays
      };
    });
  };

  const getConflictDays = (employeeId) => {
    if (!selectedTemplate) return [];
    
    const employeeSchedules = assignedSchedules.filter(
      (schedule) => schedule.employee_id === employeeId
    );
    
    const conflictDays = [];
    employeeSchedules.forEach((schedule) => {
      // Check if this is a multi-shift record
      if (schedule.shifts && Array.isArray(schedule.shifts)) {
        schedule.shifts.forEach((shift) => {
          // Check if this is the exact same shift
          if (
            shift.shift_name === selectedTemplate.shift_name &&
            shift.start_time === selectedTemplate.start_time &&
            shift.end_time === selectedTemplate.end_time
          ) {
            // Same shift - mark all overlapping days as conflicts
            shift.days.forEach((day) => {
              if (selectedTemplate.days.includes(day) && !conflictDays.includes(day)) {
                conflictDays.push(day);
              }
            });
          } else {
            // Different shift - check for time overlap
            shift.days.forEach((day) => {
              if (selectedTemplate.days.includes(day)) {
                if (hasTimeOverlap(
                  selectedTemplate.start_time,
                  selectedTemplate.end_time,
                  shift.start_time,
                  shift.end_time
                )) {
                  if (!conflictDays.includes(day)) {
                    conflictDays.push(day);
                  }
                }
              }
            });
          }
        });
      } else {
        // Legacy single shift format
        // Check if this is the exact same shift
        if (
          schedule.shift_name === selectedTemplate.shift_name &&
          schedule.start_time === selectedTemplate.start_time &&
          schedule.end_time === selectedTemplate.end_time
        ) {
          // Same shift - mark all overlapping days as conflicts
          schedule.days.forEach((day) => {
            if (selectedTemplate.days.includes(day) && !conflictDays.includes(day)) {
              conflictDays.push(day);
            }
          });
        } else {
          // Different shift - check for time overlap
          schedule.days.forEach((day) => {
            if (selectedTemplate.days.includes(day)) {
              if (hasTimeOverlap(
                selectedTemplate.start_time,
                selectedTemplate.end_time,
                schedule.start_time,
                schedule.end_time
              )) {
                if (!conflictDays.includes(day)) {
                  conflictDays.push(day);
                }
              }
            }
          });
        }
      }
    });
    
    return conflictDays;
  };

  const getExistingSchedule = (employeeId) => {
    if (!selectedTemplate) return null;
    
    // Find schedule with same shift name AND same times (to identify the exact same shift)
    return assignedSchedules.find(
      (schedule) => 
        schedule.employee_id === employeeId &&
        schedule.shift_name === selectedTemplate.shift_name &&
        schedule.start_time === selectedTemplate.start_time &&
        schedule.end_time === selectedTemplate.end_time
    );
  };

  const validateBatchAssignment = () => {
    if (!selectedTemplate) return { valid: false, errors: [], warnings: [] };
    
    const errors = [];
    const warnings = [];
    
    // Count all employees being assigned (including team leaders)
    const employeeCount = selectedEmployees.length;
    
    // Check each day's limit
    for (const day of selectedTemplate.days) {
      const status = getMemberLimitStatus(day);
      
      if (status.limit) {
        const availableSlots = status.limit - status.current;
        
        if (employeeCount > availableSlots) {
          if (availableSlots === 0) {
            warnings.push(
              `${day}: Limit reached (${status.current}/${status.limit}). Members will be assigned to other days only.`
            );
          } else {
            warnings.push(
              `${day}: Only ${availableSlots} slot(s) available. ${employeeCount - availableSlots} member(s) will skip this day.`
            );
          }
        }
      }
    }
    
    // Check if at least one day has available slots
    const hasAnyAvailableDay = selectedTemplate.days.some(day => {
      const status = getMemberLimitStatus(day);
      return !status.limit || status.current < status.limit;
    });
    
    if (!hasAnyAvailableDay) {
      errors.push("All days have reached their member limits. Cannot assign any members.");
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  };

  const handleAssignSchedule = async () => {
    const assignmentDay = selectedTemplate.specific_date ? 
      (() => {
        const date = new Date(selectedTemplate.specific_date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[date.getDay()];
      })() : 
      selectedDay;
      
    if (!selectedTemplate || (!assignmentDay && !selectedTemplate.specific_date)) {
      return toast.warning("Please select a template and day!");
    }
    if (selectedEmployees.length === 0) {
      return toast.warning("Please select at least one team member!");
    }

    // Debug: Check authentication status
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    console.log("🔐 Debug - Token exists:", !!token);
    console.log("🔐 Debug - User data:", user);
    console.log("🔐 Debug - User role:", user.role);

    const results = {
      success: [],
      failed: []
    };

    // Assign the selected day to each selected employee
    for (const employeeId of selectedEmployees) {
      try {
        console.log("📤 Assigning schedule:", {
          employee_id: employeeId,
          template_id: selectedTemplate.id,
          days: [assignmentDay],
          assigned_by: user.employee?.employee_id || "teamleader"
        });

        await assignSchedule({
          employee_id: employeeId,
          template_id: selectedTemplate.id,
          days: [assignmentDay], // Use the calculated assignment day
          assigned_by: user.employee?.employee_id || "teamleader"
        });
        
        results.success.push(getEmployeeName(employeeId));
      } catch (err) {
        console.error("❌ Assignment failed:", err);
        console.error("❌ Error response:", err.response?.data);
        
        // Handle authentication errors specifically
        if (err.response?.status === 401) {
          const errorMsg = err.response?.data?.message || "Authentication failed";
          console.error("🔐 Authentication error:", errorMsg);
          
          toast.error(`Authentication failed: ${errorMsg}. Please log out and log back in.`, {
            autoClose: 8000
          });
          
          results.failed.push({
            name: getEmployeeName(employeeId),
            error: "Authentication failed - please re-login"
          });
          
          break;
        } else {
          const errorMsg = err.response?.data?.message || "Failed to assign schedule";
          results.failed.push({
            name: getEmployeeName(employeeId),
            error: errorMsg
          });
        }
      }
    }

    // Show summary
    const displayDate = selectedTemplate.specific_date ? 
      new Date(selectedTemplate.specific_date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      }) : 
      assignmentDay;
    
    if (results.success.length > 0 && results.failed.length === 0) {
      const totalAssigned = selectedTemplate.specific_date ? results.success.length : results.success.length;
      const teamLeaderNote = selectedTemplate.specific_date ? " (including team leader)" : "";
      toast.success(`Successfully assigned ${totalAssigned} member(s)${teamLeaderNote} to ${selectedTemplate.shift_name} on ${displayDate}`);
    } else if (results.success.length > 0 && results.failed.length > 0) {
      toast.warning(`Assigned ${results.success.length} member(s), but ${results.failed.length} failed`);
    } else if (results.failed.length > 0) {
      const authFailures = results.failed.filter(f => f.error.includes("Authentication failed"));
      if (authFailures.length === results.failed.length) {
        toast.error("Authentication failed. Please log out and log back in to continue.");
      } else {
        toast.error("Failed to assign schedules");
      }
    } else {
      toast.info("No schedules were assigned");
    }
    
    if (results.success.length > 0) {
      setSelectedDay(null);
      setSelectedEmployees([]);
      fetchAssignedSchedules();
    }
  };

  const handleDeleteSchedule = async (scheduleData) => {
    // Prevent team leaders from deleting their own schedule
    if (scheduleData.employee_id === user.employee?.employee_id) {
      toast.error("You cannot delete your own schedule. Please contact an administrator.");
      return;
    }
    
    console.log("🗑️ Opening delete modal for schedule:", scheduleData);
    setScheduleToDelete(scheduleData);
    setSelectedDaysToDelete([]);
    setShowDeleteModal(true);
  };

  const handleDeleteSelectedDays = async () => {
    if (!scheduleToDelete || selectedDaysToDelete.length === 0) {
      toast.warning("Please select at least one day to delete");
      return;
    }

    // Additional safety check to prevent deleting own schedule
    if (scheduleToDelete.employee_id === user.employee?.employee_id) {
      toast.error("You cannot delete your own schedule. Please contact an administrator.");
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      setSelectedDaysToDelete([]);
      return;
    }

    const employeeName = getEmployeeName(scheduleToDelete.employee_id);
    const dayCount = selectedDaysToDelete.length;
    const isAllDays = selectedDaysToDelete.length === scheduleToDelete.days.length;
    
    console.log("🗑️ Delete request:", {
      scheduleId: scheduleToDelete.id,
      employeeId: scheduleToDelete.employee_id,
      employeeName,
      selectedDays: selectedDaysToDelete,
      isAllDays,
      scheduleIds: scheduleToDelete.ids
    });
    
    confirmAction(
      `Remove ${employeeName}'s ${scheduleToDelete.shift_name} schedule? ${isAllDays 
        ? `This will remove the entire schedule for all ${dayCount} day${dayCount > 1 ? 's' : ''}: ${selectedDaysToDelete.join(', ')}`
        : `This will remove the schedule for ${dayCount} selected day${dayCount > 1 ? 's' : ''}: ${selectedDaysToDelete.join(', ')}`}`,
      async () => {
        try {
          console.log("🚀 Starting delete operation...");
          
          if (isAllDays) {
            // Delete entire schedule if all days are selected
            const scheduleIds = scheduleToDelete.ids || [scheduleToDelete.id];
            console.log("🗑️ Deleting entire schedule, IDs:", scheduleIds);
            
            for (const id of scheduleIds) {
              console.log(`🗑️ Deleting schedule ID: ${id}`);
              const result = await deleteEmployeeSchedule(id);
              console.log(`✅ Delete result for ID ${id}:`, result);
            }
          } else {
            // Use the new API to remove specific days
            // For merged schedules, we need to handle each individual schedule
            const scheduleIds = scheduleToDelete.ids || [scheduleToDelete.originalId || scheduleToDelete.id];
            console.log("🗑️ Removing specific days, IDs:", scheduleIds, "Days:", selectedDaysToDelete);
            
            for (const id of scheduleIds) {
              try {
                console.log(`🗑️ Removing days from schedule ID: ${id}`);
                const result = await removeDaysFromEmployeeSchedule(id, selectedDaysToDelete);
                console.log(`✅ Remove days result for ID ${id}:`, result);
              } catch (error) {
                console.log(`❌ Error removing days from ID ${id}:`, error);
                // If the API doesn't support partial deletion, fall back to the old method
                if (error.response?.status === 404 || error.response?.status === 400) {
                  console.log("🔄 Falling back to old deletion method...");
                  // Fallback: Get all schedules and delete matching ones
                  const allSchedules = await getEmployeeSchedules();
                  const employeeSchedules = allSchedules.filter(s => 
                    s.employee_id === scheduleToDelete.employee_id &&
                    s.template.shift_name === scheduleToDelete.shift_name &&
                    s.template.start_time === scheduleToDelete.start_time &&
                    s.template.end_time === scheduleToDelete.end_time
                  );

                  for (const schedule of employeeSchedules) {
                    const hasMatchingDay = schedule.days.some(day => selectedDaysToDelete.includes(day));
                    if (hasMatchingDay) {
                      console.log(`🗑️ Fallback: Deleting schedule ID: ${schedule.id}`);
                      await deleteEmployeeSchedule(schedule.id);
                    }
                  }
                } else {
                  throw error;
                }
              }
            }
          }
          
          console.log("✅ Delete operation completed successfully");
          toast.success(`Schedule removed for ${dayCount} day${dayCount > 1 ? 's' : ''}!`);
          setShowDeleteModal(false);
          setScheduleToDelete(null);
          setSelectedDaysToDelete([]);
          fetchAssignedSchedules();
        } catch (error) {
          console.error("❌ Error deleting schedule:", error);
          console.error("❌ Error response:", error.response?.data);
          console.error("❌ Error status:", error.response?.status);
          
          // Handle backend validation errors
          if (error.response?.status === 403) {
            toast.error(error.response.data.message || "You don't have permission to delete this schedule");
          } else if (error.response?.status === 401) {
            toast.error("Authentication required. Please log in again.");
          } else {
            toast.error("Failed to remove schedule");
          }
        }
      }
    );
  };

  const handleDaySelectionToggle = (day) => {
    setSelectedDaysToDelete(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSelectAllDays = () => {
    if (selectedDaysToDelete.length === scheduleToDelete.days.length) {
      setSelectedDaysToDelete([]);
    } else {
      setSelectedDaysToDelete([...scheduleToDelete.days]);
    }
  };

  const getDisplayName = (employee) => {
    // Handle both fullname and firstname/lastname formats
    if (employee.fullname && employee.fullname.trim() !== '') {
      return employee.fullname;
    } else if (employee.firstname && employee.lastname) {
      return `${employee.firstname} ${employee.lastname}`;
    } else if (employee.firstname) {
      return employee.firstname;
    } else {
      return employee.employee_id;
    }
  };

  const getEmployeeName = (employeeId) => {
    // If this is the team leader viewing their own schedule, show "Me"
    if (employeeId === user.employee?.employee_id) {
      return "Me";
    }
    const employee = teamMembers.find((emp) => emp.employee_id === employeeId);
    if (!employee) return employeeId;
    
    return getDisplayName(employee);
  };

  // Helper function to check if template has current or future days
  const hasCurrentOrFutureDays = (template) => {
    const today = new Date();
    const todayDayName = getDayOfWeek(today);
    const currentTime = today.getHours() * 60 + today.getMinutes();
    
    return template.allDays.some(day => {
      // If it's today, show the schedule until the end of the day (not when shift ends)
      if (day === todayDayName) {
        return true; // Always show today's schedule until day ends
      }
      
      // For other days, check if they're in the current week (including future days)
      const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayIndex = dayOrder.indexOf(todayDayName);
      const dayIndex = dayOrder.indexOf(day);
      
      // Calculate days from today (considering week cycle)
      let daysFromToday = dayIndex - todayIndex;
      if (daysFromToday < 0) {
        daysFromToday += 7; // Next week
      }
      
      // Show days within the next 7 days (current week + next week if needed)
      return daysFromToday > 0 && daysFromToday <= 7;
    });
  };

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Team Schedule Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Assign schedule templates to your team members in {userDepartment}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          💡 Note: Your own schedule is automatically managed. This page is for assigning schedules to your team members.
        </p>
      </div>

      {/* Available Templates */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-primary mb-4">
          <MdSchedule /> Available Schedule Templates
        </h2>
        
        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No schedule templates available for your department. Contact admin to create templates.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              // Handle both specific date and legacy day-based templates
              const isSpecificDate = !!template.specific_date;
              const displayDate = isSpecificDate 
                ? new Date(template.specific_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                : template.days?.join(', ') || 'No days specified';
              
              return (
                <div
                  key={template.id}
                  onClick={() => {
                    if (isSpecificDate) {
                      // For specific date templates, set the template and auto-select the date
                      setSelectedTemplate(template);
                      const date = new Date(template.specific_date);
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const dayName = dayNames[date.getDay()];
                      setSelectedDay(dayName);
                    } else {
                      // For legacy templates, use existing logic
                      setSelectedTemplate({
                        ...template, 
                        days: template.days || [],
                        day_limits: template.day_limits || {}
                      });
                    }
                  }}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-primary-50"
                      : "border-gray-200 hover:border-primary-300"
                  }`}
                >
                  <h3 className="font-semibold text-gray-800 mb-2">{template.shift_name}</h3>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <MdAccessTime size={16} /> {formatTimeRange24(template.start_time, template.end_time)}
                  </p>
                  
                  {isSpecificDate ? (
                    <p className="text-xs text-blue-600 flex items-center gap-1 mb-1">
                      <MdCalendarToday size={14} /> {displayDate}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <MdCalendarToday size={14} /> {displayDate}
                    </p>
                  )}
                  
                  {template.member_limit && (
                    <p className="text-xs text-gray-500">
                      Member Limit: {template.member_limit}
                    </p>
                  )}
                  
                  {/* Show assignment status */}
                  {(() => {
                    let assignedCount = 0;
                    if (template.assigned_employees) {
                      try {
                        const assignments = typeof template.assigned_employees === 'string' 
                          ? JSON.parse(template.assigned_employees) 
                          : template.assigned_employees;
                        assignedCount = assignments.length;
                      } catch (e) {
                        assignedCount = 0;
                      }
                    }
                    
                    return (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isSpecificDate && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Specific Date
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            assignedCount > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {assignedCount} Assigned
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Select Day for Assignment - Only show for legacy day-based templates */}
      {selectedTemplate && !selectedDay && !selectedTemplate.specific_date && (
        <div className="bg-white rounded-lg shadow-md p-6 my-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-primary mb-4">
            <MdSchedule /> Select Day to Assign
          </h2>
          
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Selected Template:</strong> {selectedTemplate.shift_name} ({formatTimeRange24(selectedTemplate.start_time, selectedTemplate.end_time)})
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-3">Choose a day to assign team members:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {(selectedTemplate.days || selectedTemplate.allDays || []).filter(day => {
              // Filter to only show current and future days
              const today = new Date();
              const todayDayName = getDayOfWeek(today);
              
              if (day === todayDayName) {
                return true; // Always show today
              }
              
              // For other days, check if they're in the current week
              const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const todayIndex = dayOrder.indexOf(todayDayName);
              const dayIndex = dayOrder.indexOf(day);
              
              let daysFromToday = dayIndex - todayIndex;
              if (daysFromToday < 0) {
                daysFromToday += 7; // Next week
              }
              
              return daysFromToday > 0 && daysFromToday <= 7;
            }).map((day) => {
              const status = getMemberLimitStatus(day);
              const limit = selectedTemplate.day_limits?.[day] || selectedTemplate.member_limit;
              const shiftPassed = isTodayAndShiftPassed(day);
              
              return (
                <button
                  key={day}
                  onClick={() => {
                    if (shiftPassed) {
                      toast.warning(`Cannot schedule ${selectedTemplate.shift_name} for today. The shift (${formatTimeRange24(selectedTemplate.start_time, selectedTemplate.end_time)}) has already started or is ongoing.`);
                      return;
                    }
                    setSelectedDay(day);
                    setSelectedEmployees([]);
                  }}
                  disabled={shiftPassed}
                  className={`border-2 rounded-lg p-4 transition-all text-center ${
                    shiftPassed
                      ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                      : "border-gray-300 hover:border-primary-500 hover:bg-primary-50"
                  }`}
                >
                  <p className="font-semibold text-gray-800 mb-1">{day}</p>
                  {limit && (
                    <p className="text-xs text-gray-600">
                      {status.current}/{limit} assigned
                    </p>
                  )}
                  {shiftPassed ? (
                    <p className="text-xs text-red-600 font-medium mt-1">⏰ Shift Started</p>
                  ) : status.isFull ? (
                    <p className="text-xs text-red-600 font-medium mt-1">Full</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Assign to Team Members */}
      {selectedTemplate && (selectedDay || selectedTemplate.specific_date) && (
        <div className="bg-white rounded-lg shadow-md p-6 my-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-primary mb-4">
            <MdPeople /> Select Team Members {selectedTemplate.specific_date ? 
              `for ${new Date(selectedTemplate.specific_date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}` : 
              `for ${selectedDay}`
            }
          </h2>
          
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Template:</strong> {selectedTemplate.shift_name} ({formatTimeRange24(selectedTemplate.start_time, selectedTemplate.end_time)})
            </p>
            <p className="text-sm text-gray-700">
              <strong>{selectedTemplate.specific_date ? 'Date' : 'Day'}:</strong> {
                selectedTemplate.specific_date ? 
                  new Date(selectedTemplate.specific_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  }) : 
                  selectedDay
              }
            </p>
            {selectedTemplate.specific_date && (
              <p className="text-sm text-blue-700 mt-2">
                <strong>Note:</strong> You (team leader) will be automatically assigned to this schedule.
              </p>
            )}
            {!selectedTemplate.specific_date && (
              <button
                onClick={() => {
                  setSelectedDay(null);
                  setSelectedEmployees([]);
                }}
                className="text-xs text-primary-600 hover:text-primary-800 mt-2 underline"
              >
                ← Change Day
              </button>
            )}
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-gray-500 text-sm">No team members found in your department.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {teamMembers.map((member) => {
                  const hasConflict = hasScheduleConflict(member.employee_id);
                  const conflictDays = getConflictDays(member.employee_id);
                  const limitReached = isLimitReached(member.employee_id);
                  const limitDays = getLimitReachedDays(member.employee_id);
                  const availableDays = getAvailableDays(member.employee_id);
                  const existingSchedule = getExistingSchedule(member.employee_id);
                  const isSelected = selectedEmployees.includes(member.employee_id);
                  const cannotSelect = (hasConflict || limitReached) && !isSelected;
                  const hasPartialLimit = limitDays.length > 0 && availableDays.length > 0;
                  
                  return (
                    <div
                      key={member.id}
                      onClick={() => handleEmployeeToggle(member.employee_id)}
                      className={`border-2 rounded-lg p-3 transition-all ${
                        cannotSelect
                          ? "border-red-300 bg-red-50 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "border-green-500 bg-green-50 cursor-pointer"
                          : "border-gray-200 hover:border-gray-400 cursor-pointer"
                      }`}
                    >
                      <p className="font-medium text-gray-800">{getDisplayName(member)}</p>
                      <p className="text-sm text-gray-600">{member.employee_id}</p>
                      <p className="text-xs text-gray-500">{member.position}</p>
                      {existingSchedule && conflictDays.length > 0 && (
                        <p className="text-xs text-purple-600 mt-1 font-medium flex items-center gap-1">
                          <MdEventNote size={14} /> Current: {conflictDays.join(", ")}
                        </p>
                      )}
                      {limitReached && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">
                          🚫 All days full
                        </p>
                      )}
                      {!limitReached && availableDays.length > 0 && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          ✓ Available: {availableDays.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day Selection for Selected Members */}
              {selectedEmployees.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-md">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ {selectedEmployees.length} member(s) selected for {selectedDay}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEmployees.map(empId => (
                      <span key={empId} className="text-xs bg-white px-2 py-1 rounded border border-green-200">
                        {getEmployeeName(empId)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEmployees.length > 0 && (() => {
                const status = getMemberLimitStatus(selectedDay);
                const nonLeaderCount = selectedEmployees.filter(empId => {
                  const emp = teamMembers.find(e => e.employee_id === empId);
                  return emp && emp.position !== "Team Leader";
                }).length;
                const wouldExceed = status.limit && (status.current + nonLeaderCount) > status.limit;
                
                return wouldExceed && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-md">
                    <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                      <MdClose size={18} /> Cannot assign: Would exceed limit ({status.current + nonLeaderCount}/{status.limit}) for {selectedDay}
                    </p>
                  </div>
                );
              })()}

              <button
                onClick={handleAssignSchedule}
                disabled={selectedEmployees.length === 0}
                className={`w-full py-3 rounded-md font-medium transition-colors ${
                  selectedEmployees.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-hover"
                }`}
              >
                Assign {selectedTemplate.shift_name} {selectedTemplate.specific_date ? 
                  `on ${new Date(selectedTemplate.specific_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}` : 
                  `on ${selectedDay}`
                } to {selectedTemplate.specific_date ? 
                  `${selectedEmployees.length + 1} Member(s) (+ You)` : 
                  `${selectedEmployees.length} Member(s)`
                }
              </button>
            </>
          )}
        </div>
      )}

      {/* Assigned Schedules */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-primary mb-4">
          <MdSchedule /> Assigned Team Schedules
        </h2>
        
        {(() => {
          // Filter out the team leader's own schedule - only show team members' schedules
          const teamMemberSchedules = assignedSchedules.filter(schedule => 
            schedule.employee_id !== user.employee?.employee_id
          );
          
          if (teamMemberSchedules.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <MdSchedule size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-lg">No team member schedules assigned yet</p>
                <p className="text-sm">Assign schedules to your team members using the templates above</p>
              </div>
            );
          }
          
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamMemberSchedules.map((schedule, index) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">
                          {getEmployeeName(schedule.employee_id)}
                        </p>
                        <p className="text-xs text-gray-500">{schedule.employee_id}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {schedule.shift_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MdAccessTime size={16} /> {formatTimeRange24(schedule.start_time, schedule.end_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {schedule.specific_date ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                              {new Date(schedule.specific_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {schedule.days.map((day, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                {day}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteSchedule(schedule)}
                          className="w-7 h-7 rounded-md bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                          title="Remove team member's schedule"
                        >
                          <MdDelete size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Delete Days Modal */}
      {showDeleteModal && scheduleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Days to Delete
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setScheduleToDelete(null);
                  setSelectedDaysToDelete([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Employee:</strong> {getEmployeeName(scheduleToDelete.employee_id)}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Shift:</strong> {scheduleToDelete.shift_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Time:</strong> {formatTimeRange24(scheduleToDelete.start_time, scheduleToDelete.end_time)}
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Select days to remove:
                </p>
                <button
                  onClick={handleSelectAllDays}
                  className="text-xs text-primary-600 hover:text-primary-800 underline"
                >
                  {selectedDaysToDelete.length === scheduleToDelete.days.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="space-y-2">
                {scheduleToDelete.days.map((day) => (
                  <label key={day} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDaysToDelete.includes(day)}
                      onChange={() => handleDaySelectionToggle(day)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setScheduleToDelete(null);
                  setSelectedDaysToDelete([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedDays}
                disabled={selectedDaysToDelete.length === 0}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedDaysToDelete.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Delete {selectedDaysToDelete.length > 0 ? `(${selectedDaysToDelete.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
