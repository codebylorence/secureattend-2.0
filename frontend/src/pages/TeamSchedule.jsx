import { useState, useEffect } from "react";
import { MdSchedule, MdPeople, MdDelete } from "react-icons/md";
import { getDepartmentTemplates, createSchedule, getAllSchedules, deleteSchedule, updateSchedule } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";

export default function TeamSchedule() {
  const [templates, setTemplates] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedSchedules, setAssignedSchedules] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeDays, setEmployeeDays] = useState({}); // Store selected days per employee
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userDepartment = user.employee?.department || "";

  useEffect(() => {
    if (userDepartment) {
      fetchTemplates();
      fetchTeamMembers();
      fetchAssignedSchedules();
    }
  }, [userDepartment]);

  const fetchTemplates = async () => {
    try {
      const data = await getDepartmentTemplates(userDepartment);
      setTemplates(data);
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
      const allSchedules = await getAllSchedules();
      const allEmployees = await fetchEmployees();
      
      // Filter schedules for team members in the same department
      // Exclude the team leader's own schedule
      const teamSchedules = allSchedules.filter(
        (schedule) => {
          // Skip if this is the team leader's own schedule
          if (schedule.employee_id === user.employee?.employee_id) {
            return false;
          }
          
          const employee = allEmployees.find(emp => emp.employee_id === schedule.employee_id);
          return employee && employee.department === userDepartment;
        }
      );
      setAssignedSchedules(teamSchedules);
    } catch (error) {
      console.error("Error fetching assigned schedules:", error);
    }
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
    
    // Count current assignments for this day (excluding team leaders)
    let currentCount = 0;
    
    assignedSchedules.forEach(schedule => {
      // Find the employee to check if they're a team leader
      const employee = teamMembers.find(emp => emp.employee_id === schedule.employee_id);
      if (employee && employee.position === "Team Leader") return; // Skip team leaders
      
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
    
    // Check if this employee is a team leader (they don't count towards limit)
    const employee = teamMembers.find(emp => emp.employee_id === employeeId);
    if (employee && employee.position === "Team Leader") return false;
    
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
    
    const employee = teamMembers.find(emp => emp.employee_id === employeeId);
    if (employee && employee.position === "Team Leader") return [];
    
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
    
    const employee = teamMembers.find(emp => emp.employee_id === employeeId);
    const conflictDays = getConflictDays(employeeId);
    
    if (employee && employee.position === "Team Leader") {
      // Team leaders can select any day except conflicting ones
      return selectedTemplate.days.filter(day => !conflictDays.includes(day));
    }
    
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
      // Clear selected days for this employee
      setEmployeeDays((prev) => {
        const newDays = { ...prev };
        delete newDays[employeeId];
        return newDays;
      });
      return;
    }
    
    // Check for conflicts before allowing selection
    if (hasScheduleConflict(employeeId)) {
      const conflictDays = getConflictDays(employeeId);
      alert(`Cannot assign: ${getEmployeeName(employeeId)} already has a schedule on ${conflictDays.join(", ")}`);
      return;
    }
    
    // Check for member limit
    if (isLimitReached(employeeId)) {
      const fullDays = getLimitReachedDays(employeeId);
      alert(`Cannot assign: Member limit reached for ${fullDays.join(", ")}`);
      return;
    }
    
    setSelectedEmployees((prev) => [...prev, employeeId]);
    // Initialize with available days
    const availableDays = getAvailableDays(employeeId);
    setEmployeeDays((prev) => ({
      ...prev,
      [employeeId]: availableDays
    }));
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
    
    // Count non-team-leader employees being assigned
    const nonTeamLeaderCount = selectedEmployees.filter(empId => {
      const employee = teamMembers.find(emp => emp.employee_id === empId);
      return employee && employee.position !== "Team Leader";
    }).length;
    
    // Check each day's limit
    for (const day of selectedTemplate.days) {
      const status = getMemberLimitStatus(day);
      
      if (status.limit) {
        const availableSlots = status.limit - status.current;
        
        if (nonTeamLeaderCount > availableSlots) {
          if (availableSlots === 0) {
            warnings.push(
              `${day}: Limit reached (${status.current}/${status.limit}). Members will be assigned to other days only.`
            );
          } else {
            warnings.push(
              `${day}: Only ${availableSlots} slot(s) available. ${nonTeamLeaderCount - availableSlots} member(s) will skip this day.`
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
    if (!selectedTemplate) {
      return alert("Please select a schedule template!");
    }
    if (selectedEmployees.length === 0) {
      return alert("Please select at least one team member!");
    }

    // Validate batch assignment before submitting
    const validation = validateBatchAssignment();
    if (!validation.valid) {
      alert(
        "Cannot assign all selected members:\n\n" +
        validation.errors.join("\n") +
        "\n\nPlease deselect some members and try again."
      );
      return;
    }

    const results = {
      success: [],
      failed: []
    };

    // Create or update schedule for each selected employee with their selected days
    for (const employeeId of selectedEmployees) {
      const selectedDays = employeeDays[employeeId] || [];
      
      if (selectedDays.length === 0) {
        results.failed.push({
          name: getEmployeeName(employeeId),
          error: "No days selected"
        });
        continue;
      }

      try {
        // Find any existing schedule for this employee (multi-shift record)
        const existingSchedule = assignedSchedules.find(
          (schedule) => 
            schedule.employee_id === employeeId &&
            !schedule.is_template
        );
        
        if (existingSchedule) {
          // Update existing multi-shift record
          const existingShifts = existingSchedule.shifts || [];
          
          // Check if this shift already exists
          const shiftIndex = existingShifts.findIndex(
            s => s.shift_name === selectedTemplate.shift_name &&
                 s.start_time === selectedTemplate.start_time &&
                 s.end_time === selectedTemplate.end_time
          );
          
          if (shiftIndex >= 0) {
            // Merge days with existing shift
            const combinedDays = [...new Set([...existingShifts[shiftIndex].days, ...selectedDays])];
            existingShifts[shiftIndex].days = combinedDays;
          } else {
            // Add new shift to the array
            existingShifts.push({
              shift_name: selectedTemplate.shift_name,
              start_time: selectedTemplate.start_time,
              end_time: selectedTemplate.end_time,
              days: selectedDays
            });
          }
          
          await updateSchedule(existingSchedule.id, {
            shifts: existingShifts
          });
          
          results.success.push(`${getEmployeeName(employeeId)} - Updated (${selectedTemplate.shift_name}: ${selectedDays.join(", ")})`);
        } else {
          // Create new multi-shift record
          await createSchedule({
            employee_id: employeeId,
            shift_name: selectedTemplate.shift_name, // Required for backward compatibility
            start_time: selectedTemplate.start_time, // Required for backward compatibility
            end_time: selectedTemplate.end_time, // Required for backward compatibility
            shifts: [{
              shift_name: selectedTemplate.shift_name,
              start_time: selectedTemplate.start_time,
              end_time: selectedTemplate.end_time,
              days: selectedDays
            }],
            days: selectedDays, // Keep for backward compatibility
            department: userDepartment,
            is_template: false,
            created_by: user.employee?.employee_id || "teamleader"
          });
          
          results.success.push(`${getEmployeeName(employeeId)} - New (${selectedTemplate.shift_name}: ${selectedDays.join(", ")})`);
        }
      } catch (err) {
        // Show specific error message from backend
        const errorMsg = err.response?.data?.message || "Failed to assign schedule";
        results.failed.push({
          name: getEmployeeName(employeeId),
          error: errorMsg
        });
      }
    }

    // Show summary of results
    let message = "";
    if (results.success.length > 0) {
      message += `✅ Successfully assigned:\n${results.success.map(s => `  • ${s}`).join("\n")}\n`;
    }
    if (results.failed.length > 0) {
      message += `\n❌ Failed to assign:\n`;
      results.failed.forEach(f => {
        message += `  • ${f.name}: ${f.error}\n`;
      });
    }
    
    alert(message || "No schedules were assigned.");
    
    if (results.success.length > 0) {
      setSelectedTemplate(null);
      setSelectedEmployees([]);
      setEmployeeDays({});
      fetchAssignedSchedules();
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to remove this schedule?")) return;
    
    try {
      await deleteSchedule(id);
      alert("Schedule removed successfully!");
      fetchAssignedSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Failed to remove schedule");
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = teamMembers.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.fullname : employeeId;
  };

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">Team Schedule Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Assign schedule templates to your team members in {userDepartment}
        </p>
      </div>

      {/* Available Templates */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
          <MdSchedule /> Available Schedule Templates
        </h2>
        
        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No schedule templates available for your department. Contact admin to create templates.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? "border-[#1E3A8A] bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <h3 className="font-semibold text-gray-800 mb-2">{template.shift_name}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  ⏰ {template.start_time} - {template.end_time}
                </p>
                <p className="text-xs text-gray-500">
                  {template.day_limits ? (
                    <>📅 {Object.entries(template.day_limits).map(([day, limit]) => `${day}(${limit})`).join(", ")}</>
                  ) : (
                    <>📅 {template.days.join(", ")}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign to Team Members */}
      {selectedTemplate && (
        <div className="bg-white rounded-lg shadow-md p-6 my-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
            <MdPeople /> Select Team Members
          </h2>
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Selected Template:</strong> {selectedTemplate.shift_name} ({selectedTemplate.start_time} - {selectedTemplate.end_time})
            </p>
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
                      <p className="font-medium text-gray-800">{member.fullname}</p>
                      <p className="text-sm text-gray-600">{member.employee_id}</p>
                      <p className="text-xs text-gray-500">{member.position}</p>
                      {existingSchedule && conflictDays.length > 0 && (
                        <p className="text-xs text-purple-600 mt-1 font-medium">
                          📅 Current: {conflictDays.join(", ")}
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
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium text-gray-800 mb-3">Select Days for Each Member:</h3>
                  <div className="space-y-3">
                    {selectedEmployees.map((employeeId) => {
                      const memberDays = employeeDays[employeeId] || [];
                      const availableDays = getAvailableDays(employeeId);
                      
                      return (
                        <div key={employeeId} className="bg-white p-3 rounded-md border border-gray-200">
                          <p className="font-medium text-sm text-gray-800 mb-2">
                            {getEmployeeName(employeeId)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTemplate.days.map((day) => {
                              const isAvailable = availableDays.includes(day);
                              const isSelected = memberDays.includes(day);
                              const status = getMemberLimitStatus(day);
                              
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAvailable) {
                                      handleDayToggleForEmployee(employeeId, day);
                                    }
                                  }}
                                  disabled={!isAvailable}
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                    !isAvailable
                                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                  }`}
                                  title={!isAvailable ? `Full (${status.current}/${status.limit})` : ""}
                                >
                                  {day.substring(0, 3)}
                                  {!isAvailable && " 🚫"}
                                </button>
                              );
                            })}
                          </div>
                          {memberDays.length === 0 && (
                            <p className="text-xs text-red-600 mt-2">⚠️ Please select at least one day</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedEmployees.length > 0 && (() => {
                const validation = validateBatchAssignment();
                return (validation.errors.length > 0 || validation.warnings.length > 0) && (
                  <div className="mb-3 space-y-2">
                    {validation.errors.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-300 rounded-md">
                        <p className="text-sm text-red-800 font-medium mb-1">❌ Cannot assign:</p>
                        {validation.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-red-700 ml-4">• {error}</p>
                        ))}
                      </div>
                    )}
                    {validation.warnings.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                        <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Note:</p>
                        {validation.warnings.map((warning, idx) => (
                          <p key={idx} className="text-xs text-yellow-700 ml-4">• {warning}</p>
                        ))}
                        <p className="text-xs text-yellow-700 ml-4 mt-2 font-medium">
                          Members will be assigned to days with available slots only.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={handleAssignSchedule}
                disabled={selectedEmployees.length === 0}
                className={`w-full py-3 rounded-md font-medium transition-colors ${
                  selectedEmployees.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#1E3A8A] text-white hover:bg-blue-900"
                }`}
              >
                Assign Schedule to {selectedEmployees.length} Member(s)
              </button>
            </>
          )}
        </div>
      )}

      {/* Assigned Schedules */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
          <MdSchedule /> Assigned Team Schedules
        </h2>
        
        {assignedSchedules.length === 0 ? (
          <p className="text-gray-500 text-sm">No schedules assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {assignedSchedules.map((schedule) => {
              // Check if this is a multi-shift record
              const hasMultipleShifts = schedule.shifts && Array.isArray(schedule.shifts) && schedule.shifts.length > 0;
              
              return (
                <div
                  key={schedule.id}
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 mb-2">
                        {getEmployeeName(schedule.employee_id)}
                      </p>
                      
                      {hasMultipleShifts ? (
                        // Display all shifts for multi-shift records
                        <div className="space-y-2 ml-3">
                          {schedule.shifts.map((shift, idx) => (
                            <div key={idx} className="border-l-2 border-blue-300 pl-3">
                              <p className="text-sm font-medium text-gray-700">
                                {shift.shift_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                ⏰ {shift.start_time} - {shift.end_time}
                              </p>
                              <p className="text-xs text-gray-500">
                                📅 {shift.days.join(", ")}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Display single shift (legacy format)
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-700">
                            {schedule.shift_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            ⏰ {schedule.start_time} - {schedule.end_time}
                          </p>
                          <p className="text-xs text-gray-500">
                            📅 {schedule.days.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove All Schedules for this Employee"
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
    </div>
  );
}
