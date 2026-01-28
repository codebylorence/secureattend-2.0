import { useState, useEffect } from "react";
import { MdSchedule, MdPeople, MdDelete, MdAccessTime, MdCalendarToday, MdEventNote, MdClose, MdCheckCircle, MdWarning } from "react-icons/md";
import { 
  getTemplatesByDepartment, 
  assignSchedule, 
  getEmployeeSchedules, 
  deleteEmployeeSchedule,
  removeDaysFromEmployeeSchedule,
  removeEmployeesFromTemplate
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
  const [shiftFilter, setShiftFilter] = useState('all'); // NEW: Filter state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Safely get socket with error handling
  let socket = null;
  try {
    const socketContext = useSocket();
    socket = socketContext?.socket;
  } catch (err) {
    console.warn('Socket context not available:', err.message);
  }
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userDepartment = user.employee?.department || "";

  useEffect(() => {
    const initializeData = async () => {
      if (!userDepartment) {
        setError("No department found for user");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log("🔄 Initializing TeamSchedule data for department:", userDepartment);
        
        await Promise.all([
          fetchTemplates(),
          fetchTeamMembers(),
          fetchAssignedSchedules()
        ]);
        
        console.log("✅ TeamSchedule data initialized successfully");
      } catch (err) {
        console.error("❌ Error initializing TeamSchedule:", err);
        setError(`Failed to load data: ${err.message}`);
        toast.error("Failed to load schedule data");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [userDepartment]);

  useEffect(() => {
    if (!socket) {
      console.log("📡 Socket not available, skipping real-time listeners");
      return;
    }

    try {
      console.log("📡 Setting up socket listeners");

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
        toast.success("Shifts updated automatically");
      });

      return () => {
        console.log("📡 Cleaning up socket listeners");
        socket.off('schedules:published');
        socket.off('drafts:published');
        socket.off('employee:assigned');
        socket.off('template:created');
        socket.off('template:updated');
      };
    } catch (err) {
      console.error("❌ Error setting up socket listeners:", err);
    }
  }, [socket]);

  const fetchTemplates = async () => {
    try {
      console.log("📋 Fetching templates for department:", userDepartment);
      
      // Get all templates for the department
      const data = await getTemplatesByDepartment(userDepartment);
      
      console.log('📋 TeamSchedule: Fetched templates:', data);
      
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
      
      // If there's a selected template, update it with the latest data
      if (selectedTemplate) {
        const updatedSelectedTemplate = currentAndFutureTemplates.find(t => t.id === selectedTemplate.id);
        if (updatedSelectedTemplate) {
          console.log('📋 TeamSchedule: Updating selected template with new data:', updatedSelectedTemplate);
          setSelectedTemplate(updatedSelectedTemplate);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching templates:", error);
      toast.error("Failed to load available shifts");
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const fetchTeamMembers = async () => {
    try {
      console.log("👥 Fetching team members for department:", userDepartment);
      
      const allEmployees = await fetchEmployees();
      // Filter employees from the same department and only active employees
      const teamMembers = allEmployees.filter(
        (emp) => emp.department === userDepartment && 
                 emp.employee_id !== user.employee?.employee_id &&
                 emp.status === 'Active' // Only include active employees for scheduling
      );
      
      console.log(`👥 Found ${teamMembers.length} active team members (filtered from ${allEmployees.length} total employees)`);
      setTeamMembers(teamMembers);
    } catch (error) {
      console.error("❌ Error fetching team members:", error);
      toast.error("Failed to load team members");
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const fetchAssignedSchedules = async () => {
    try {
      console.log("🔄 Fetching assigned schedules...");
      
      // Get schedules from both legacy system and new template system
      const allSchedules = await getEmployeeSchedules();
      const allEmployees = await fetchEmployees();
      
      console.log("📊 Raw schedules data:", allSchedules);
      console.log("👥 All employees data:", allEmployees);
      
      // Filter schedules for employees in the same department
      // INCLUDE the team leader's schedule for counting purposes
      const teamSchedules = allSchedules.filter((schedule) => {
        const employee = allEmployees.find(emp => emp.employee_id === schedule.employee_id);
        return employee && employee.department === userDepartment;
      });
      
      console.log("🏢 Team schedules for department", userDepartment, ":", teamSchedules);
      
      // Transform to match old structure for display
      const transformedSchedules = teamSchedules.map(schedule => {
        console.log("🔄 Transforming schedule:", {
          originalId: schedule.id,
          employee_id: schedule.employee_id,
          shift_name: schedule.shift_name || schedule.template?.shift_name,
          template_id: schedule.template_id,
          specific_date: schedule.specific_date
        });
        return {
          id: schedule.id, // Keep the original employee schedule ID
          employee_id: schedule.employee_id,
          shift_name: schedule.shift_name || schedule.template?.shift_name,
          start_time: schedule.start_time || schedule.template?.start_time,
          end_time: schedule.end_time || schedule.template?.end_time,
          days: schedule.days || [],
          department: schedule.department || schedule.template?.department,
          template_id: schedule.template_id,
          specific_date: schedule.specific_date || schedule.template?.specific_date
        };
      });
      
      // Merge schedules with same employee, shift, and time but different days
      const mergedSchedules = mergeSchedulesByShift(transformedSchedules);
      
      console.log("🔄 Final merged schedules:", mergedSchedules);
      setAssignedSchedules(mergedSchedules);
    } catch (error) {
      console.error("Error fetching assigned schedules:", error);
      toast.error("Failed to refresh schedules");
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
        groupedSchedules[groupKey].ids.push(schedule.id); // Use the actual employee schedule ID
      } else {
        // Create new group
        groupedSchedules[groupKey] = {
          ...schedule,
          id: `merged-${groupKey}`, // Create a unique ID for merged schedules (for display only)
          originalId: schedule.id, // Keep original employee schedule ID for single schedules
          days: [...schedule.days], // Create a copy of the days array
          ids: [schedule.id] // Keep track of all actual employee schedule IDs for deletion
        };
      }
    });
    
    // Convert back to array and sort days for consistent display
    return Object.values(groupedSchedules).map(schedule => {
      console.log("🔄 Merged schedule:", {
        displayId: schedule.id,
        originalId: schedule.originalId,
        realIds: schedule.ids,
        employee_id: schedule.employee_id,
        shift_name: schedule.shift_name
      });
      
      return {
        ...schedule,
        days: schedule.days.sort((a, b) => {
          const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          return dayOrder.indexOf(a) - dayOrder.indexOf(b);
        })
      };
    });
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
          toast.error(`Cannot select more people: Day is full for ${selectedDay}`);
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
      toast.success(`Successfully assigned ${totalAssigned} people to ${selectedTemplate.shift_name} on ${displayDate}`);
    } else if (results.success.length > 0 && results.failed.length > 0) {
      toast.warning(`Assigned ${results.success.length} people, but ${results.failed.length} failed`);
    } else if (results.failed.length > 0) {
      const authFailures = results.failed.filter(f => f.error.includes("Authentication failed"));
      if (authFailures.length === results.failed.length) {
        toast.error("Please log out and log back in to continue.");
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
      toast.error("You cannot remove your own schedule. Contact your manager.");
      return;
    }
    
    console.log("🗑️ Opening delete modal for schedule:", scheduleData);
    console.log("🗑️ Schedule structure:", {
      id: scheduleData.id,
      originalId: scheduleData.originalId,
      ids: scheduleData.ids,
      employee_id: scheduleData.employee_id,
      shift_name: scheduleData.shift_name
    });
    console.log("🗑️ User data:", user);
    setScheduleToDelete(scheduleData);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    // Additional safety check to prevent deleting own schedule
    if (scheduleToDelete.employee_id === user.employee?.employee_id) {
      toast.error("You cannot remove your own schedule. Contact your manager.");
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      return;
    }

    try {
      console.log("🗑️ Attempting to delete schedule:", scheduleToDelete);
      
      // Get the actual schedule IDs to delete
      let scheduleIds = [];
      let templateBasedSchedules = [];
      
      if (scheduleToDelete.ids && Array.isArray(scheduleToDelete.ids)) {
        // This is a merged schedule with multiple IDs
        scheduleToDelete.ids.forEach(id => {
          if (id.startsWith('template-')) {
            // This is a template-based schedule
            const parts = id.split('-');
            if (parts.length >= 3) {
              const templateId = parts[1];
              const employeeId = parts[2];
              templateBasedSchedules.push({ templateId, employeeId, originalId: id });
            }
          } else {
            // This is a regular employee schedule
            scheduleIds.push(id);
          }
        });
        console.log("🗑️ Using merged schedule IDs:", { scheduleIds, templateBasedSchedules });
      } else if (scheduleToDelete.originalId) {
        // This is a single schedule with originalId
        const id = scheduleToDelete.originalId;
        if (id.startsWith('template-')) {
          const parts = id.split('-');
          if (parts.length >= 3) {
            const templateId = parts[1];
            const employeeId = parts[2];
            templateBasedSchedules.push({ templateId, employeeId, originalId: id });
          }
        } else {
          scheduleIds.push(id);
        }
        console.log("🗑️ Using original schedule ID:", { scheduleIds, templateBasedSchedules });
      } else if (scheduleToDelete.id && !scheduleToDelete.id.startsWith('merged-')) {
        // This is a single schedule with a real database ID
        const id = scheduleToDelete.id;
        if (id.startsWith('template-')) {
          const parts = id.split('-');
          if (parts.length >= 3) {
            const templateId = parts[1];
            const employeeId = parts[2];
            templateBasedSchedules.push({ templateId, employeeId, originalId: id });
          }
        } else {
          scheduleIds.push(id);
        }
        console.log("🗑️ Using direct schedule ID:", { scheduleIds, templateBasedSchedules });
      } else {
        // Fallback: try to find the real IDs from the original data
        console.log("🔍 No valid IDs found, searching in assignedSchedules...");
        const matchingSchedules = assignedSchedules.filter(schedule => 
          schedule.employee_id === scheduleToDelete.employee_id &&
          schedule.shift_name === scheduleToDelete.shift_name &&
          schedule.start_time === scheduleToDelete.start_time &&
          schedule.end_time === scheduleToDelete.end_time
        );
        
        if (matchingSchedules.length > 0) {
          matchingSchedules.forEach(schedule => {
            if (schedule.ids && Array.isArray(schedule.ids)) {
              schedule.ids.forEach(id => {
                if (id.startsWith('template-')) {
                  const parts = id.split('-');
                  if (parts.length >= 3) {
                    const templateId = parts[1];
                    const employeeId = parts[2];
                    templateBasedSchedules.push({ templateId, employeeId, originalId: id });
                  }
                } else {
                  scheduleIds.push(id);
                }
              });
            }
          });
          console.log("🔍 Found matching schedule IDs:", { scheduleIds, templateBasedSchedules });
        }
      }
      
      if (scheduleIds.length === 0 && templateBasedSchedules.length === 0) {
        console.error("❌ No valid schedule IDs found for deletion");
        toast.error("Could not find schedule to delete. Please refresh and try again.");
        setShowDeleteModal(false);
        setScheduleToDelete(null);
        return;
      }
      
      console.log("🗑️ Final deletion plan:", { 
        regularSchedules: scheduleIds, 
        templateSchedules: templateBasedSchedules 
      });
      
      let deletedCount = 0;
      let notFoundCount = 0;
      
      // Delete regular employee schedules
      for (const id of scheduleIds) {
        try {
          console.log(`🗑️ Deleting employee schedule ID: ${id}`);
          const result = await deleteEmployeeSchedule(id);
          console.log(`✅ Delete result for ID ${id}:`, result);
          deletedCount++;
        } catch (idError) {
          if (idError.response?.status === 404) {
            console.log(`⚠️ Employee schedule ID ${id} not found, may already be deleted`);
            notFoundCount++;
          } else {
            throw idError; // Re-throw other errors
          }
        }
      }
      
      // Remove employees from templates
      for (const templateSchedule of templateBasedSchedules) {
        try {
          console.log(`🗑️ Removing employee ${templateSchedule.employeeId} from template ${templateSchedule.templateId}`);
          const result = await removeEmployeesFromTemplate(templateSchedule.templateId, [templateSchedule.employeeId]);
          console.log(`✅ Remove result for template ${templateSchedule.templateId}:`, result);
          deletedCount++;
        } catch (idError) {
          if (idError.response?.status === 404) {
            console.log(`⚠️ Template assignment ${templateSchedule.originalId} not found, may already be deleted`);
            notFoundCount++;
          } else {
            throw idError; // Re-throw other errors
          }
        }
      }
      
      // Close modal first
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      
      // Force refresh the schedules list with a small delay to ensure backend is updated
      console.log("🔄 Force refreshing schedules...");
      
      // First refresh immediately
      await fetchAssignedSchedules();
      await fetchTemplates();
      
      // Then refresh again after a delay to ensure consistency
      setTimeout(async () => {
        console.log("🔄 Secondary refresh after delay...");
        await fetchAssignedSchedules();
        await fetchTemplates();
      }, 1000);
      
      // Show appropriate message
      if (deletedCount > 0) {
        toast.success(`Schedule removed successfully!`);
      } else if (notFoundCount > 0) {
        toast.info("Schedule was already removed.");
      }
      
    } catch (error) {
      console.error("❌ Error deleting schedule:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      
      // Close modal and refresh regardless of error
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      
      // Handle backend validation errors
      if (error.response?.status === 403) {
        toast.error(error.response.data.message || "You don't have permission to remove this schedule");
      } else if (error.response?.status === 401) {
        toast.error("Please log in again.");
      } else if (error.response?.status === 404) {
        toast.info("Schedule was already removed.");
        // Force refresh to show current state
        setTimeout(async () => {
          await fetchAssignedSchedules();
          await fetchTemplates();
        }, 500);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to remove schedule. Please try again.");
      }
      
      // Always refresh the list to show current state
      setTimeout(async () => {
        await fetchAssignedSchedules();
        await fetchTemplates();
      }, 500);
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
        <h1 className="text-heading text-[21px] font-semibold">Team Schedule</h1>
        <p className="text-sm text-gray-600 mt-1">
          Assign work schedules to your team
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Loading schedule data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <MdWarning className="text-red-500 mr-2" size={20} />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Data</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Available Templates */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <MdSchedule /> Available Shifts
          </h2>
        </div>
        
        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No shifts available. Contact your manager.
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
                    day: 'numeric'
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
                              One Day
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            assignedCount > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {assignedCount} People {template.member_limit ? `(Max: ${template.member_limit})` : ''}
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
            <MdSchedule /> Choose Day
          </h2>
          
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Shift:</strong> {selectedTemplate.shift_name} ({formatTimeRange24(selectedTemplate.start_time, selectedTemplate.end_time)})
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-3">Pick a day:</p>
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
                      toast.warning(`Cannot schedule for today. Shift has already started.`);
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
                      {status.current}/{limit} people
                    </p>
                  )}
                  {shiftPassed ? (
                    <p className="text-xs text-red-600 font-medium mt-1">Started</p>
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
            <MdPeople /> Choose Team Members {selectedTemplate.specific_date ? 
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
              <strong>Shift:</strong> {selectedTemplate.shift_name} ({formatTimeRange24(selectedTemplate.start_time, selectedTemplate.end_time)})
            </p>
            <p className="text-sm text-gray-700">
              <strong>Day:</strong> {
                selectedTemplate.specific_date ? 
                  new Date(selectedTemplate.specific_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric'
                  }) : 
                  selectedDay
              }
            </p>
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
            <p className="text-gray-500 text-sm">No team members found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {teamMembers.map((member) => {
                  const hasConflict = hasScheduleConflict(member.employee_id);
                  const conflictDays = getConflictDays(member.employee_id);
                  const limitReached = isLimitReached(member.employee_id);
                  const availableDays = getAvailableDays(member.employee_id);
                  const existingSchedule = getExistingSchedule(member.employee_id);
                  const isSelected = selectedEmployees.includes(member.employee_id);
                  const cannotSelect = (hasConflict || limitReached) && !isSelected;
                  
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
                      <p className="text-xs text-gray-500">{member.position}</p>
                      {existingSchedule && conflictDays.length > 0 && (
                        <p className="text-xs text-purple-600 mt-1 font-medium flex items-center gap-1">
                          <MdEventNote size={14} /> Already has: {conflictDays.join(", ")}
                        </p>
                      )}
                      {limitReached && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">
                          All days full
                        </p>
                      )}
                      {!limitReached && availableDays.length > 0 && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Available: {availableDays.join(", ")}
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
                    ✓ {selectedEmployees.length} people selected for {selectedDay}
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
                      <MdClose size={18} /> Too many people selected for {selectedDay}
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
                Assign
              </button>
            </>
          )}
        </div>
      )}

      {/* Assigned Schedules */}
      <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
              <MdSchedule /> Team Schedules
            </h2>
            
            {/* Filter Dropdown */}
            {(() => {
              const teamMemberSchedules = assignedSchedules.filter(schedule => 
                schedule.employee_id !== user.employee?.employee_id
              );
              
              if (teamMemberSchedules.length > 0) {
                // Get unique shift names for filter options
                const uniqueShifts = [...new Set(teamMemberSchedules.map(schedule => schedule.shift_name))];
                
                return (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Filter by shift:</label>
                    <select
                      value={shiftFilter}
                      onChange={(e) => setShiftFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All Shifts</option>
                      {uniqueShifts.map(shift => (
                        <option key={shift} value={shift}>{shift}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        
        {(() => {
          // Filter out the team leader's own schedule - only show team members' schedules
          let teamMemberSchedules = assignedSchedules.filter(schedule => 
            schedule.employee_id !== user.employee?.employee_id
          );
          
          // Apply shift filter
          if (shiftFilter !== 'all') {
            teamMemberSchedules = teamMemberSchedules.filter(schedule => 
              schedule.shift_name === shiftFilter
            );
          }
          
          if (teamMemberSchedules.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <MdSchedule size={48} className="mx-auto mb-3 text-gray-300" />
                {shiftFilter === 'all' ? (
                  <>
                    <p className="text-lg">No schedules assigned yet</p>
                    <p className="text-sm">Assign shifts to your team using the options above</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">No {shiftFilter} schedules found</p>
                    <p className="text-sm">Try selecting a different shift or "All Shifts"</p>
                  </>
                )}
              </div>
            );
          }
          
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remove
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
                          title="Remove schedule"
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

      {/* Delete Modal */}
      {showDeleteModal && scheduleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Remove Schedule
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setScheduleToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="mb-6 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Person:</strong> {getEmployeeName(scheduleToDelete.employee_id)}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Shift:</strong> {scheduleToDelete.shift_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Time:</strong> {formatTimeRange24(scheduleToDelete.start_time, scheduleToDelete.end_time)}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Days:</strong> {scheduleToDelete.days?.join(', ') || 'N/A'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setScheduleToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
