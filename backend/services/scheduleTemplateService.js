import ScheduleTemplate from "../models/scheduleTemplate.js";
import { Op } from "sequelize";

// Helper function to check if employee has fingerprint enrolled
const checkEmployeeFingerprintStatus = async (employeeId) => {
  try {
    const sqlite3 = await import('sqlite3');
    const { open } = await import('sqlite');
    
    // Path to biometric app's local database
    const dbPath = process.env.BIOMETRIC_DB_PATH || '../BiometricEnrollmentApp/bin/Debug/net9.0-windows/biometric_local.db';
    
    console.log(`🔍 Checking fingerprint status for employee ${employeeId}`);
    
    // Open connection to biometric database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.default.Database
    });
    
    // Query to check if this specific employee has fingerprints enrolled
    const enrollment = await db.get(
      'SELECT employee_id FROM Enrollments WHERE employee_id = ? AND fingerprint_template IS NOT NULL AND fingerprint_template != ""',
      [employeeId]
    );
    
    await db.close();
    
    const hasFingerprint = !!enrollment;
    console.log(`👆 Employee ${employeeId} fingerprint status: ${hasFingerprint ? 'ENROLLED' : 'NOT ENROLLED'}`);
    
    return hasFingerprint;
  } catch (error) {
    console.error(`❌ Error checking fingerprint status for employee ${employeeId}:`, error);
    // If we can't check the database, assume no fingerprint for safety
    return false;
  }
};

export const getAllTemplates = async () => {
  const templates = await ScheduleTemplate.findAll({
    where: { status: "Active" }, // Only get active templates
    order: [["createdAt", "DESC"]],
  });
  
  // For backward compatibility, ensure templates have either days or specific_date
  return templates.map(template => {
    const templateData = template.toJSON();
    
    // If template has specific_date but no days, create a days array for compatibility
    if (templateData.specific_date && (!templateData.days || templateData.days.length === 0)) {
      const date = new Date(templateData.specific_date);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      templateData.days = [dayNames[date.getDay()]];
    }
    
    return templateData;
  });
};

// Get employee schedules directly from templates with assigned employees
export const getEmployeeSchedulesFromTemplates = async (employeeId = null, department = null) => {
  const where = { 
    status: "Active",
    assigned_employees: { [Op.ne]: null }
  };
  
  if (department) {
    where.department = department;
  }
  
  const templates = await ScheduleTemplate.findAll({
    where,
    order: [["specific_date", "ASC"], ["createdAt", "DESC"]],
  });
  
  const schedules = [];
  
  templates.forEach(template => {
    const templateData = template.toJSON();
    
    // Parse assigned employees (stored as JSON array)
    let assignedEmployees = [];
    try {
      assignedEmployees = templateData.assigned_employees ? JSON.parse(templateData.assigned_employees) : [];
    } catch (e) {
      assignedEmployees = [];
    }
    
    // Filter by employee if specified
    const relevantEmployees = employeeId ? 
      assignedEmployees.filter(emp => emp.employee_id === employeeId) :
      assignedEmployees;
    
    // Create schedule entries for each assigned employee
    relevantEmployees.forEach(empAssignment => {
      schedules.push({
        id: `template-${template.id}-${empAssignment.employee_id}`,
        employee_id: empAssignment.employee_id,
        template_id: template.id,
        template: templateData,
        shift_name: templateData.shift_name,
        start_time: templateData.start_time,
        end_time: templateData.end_time,
        department: templateData.department,
        specific_date: templateData.specific_date,
        days: templateData.days || [],
        assigned_date: empAssignment.assigned_date,
        assigned_by: empAssignment.assigned_by
      });
    });
  });
  
  return schedules;
};

// Get today's schedule for an employee from templates
export const getTodaysScheduleFromTemplates = async (employeeId) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const templates = await ScheduleTemplate.findAll({
    where: {
      status: "Active",
      specific_date: todayStr,
      assigned_employees: { [Op.ne]: null }
    }
  });
  
  for (const template of templates) {
    let assignedEmployees = [];
    try {
      assignedEmployees = template.assigned_employees ? JSON.parse(template.assigned_employees) : [];
    } catch (e) {
      continue;
    }
    
    const employeeAssignment = assignedEmployees.find(emp => emp.employee_id === employeeId);
    if (employeeAssignment) {
      return {
        id: `template-${template.id}-${employeeId}`,
        employee_id: employeeId,
        template_id: template.id,
        shift_name: template.shift_name,
        start_time: template.start_time,
        end_time: template.end_time,
        department: template.department,
        specific_date: template.specific_date,
        assigned_date: employeeAssignment.assigned_date,
        assigned_by: employeeAssignment.assigned_by
      };
    }
  }
  
  return null;
};

export const getTemplatesByDepartment = async (department) => {
  return await ScheduleTemplate.findAll({
    where: { department, status: "Active" },
    order: [["createdAt", "DESC"]],
  });
};

export const getTemplateById = async (id) => {
  return await ScheduleTemplate.findByPk(id);
};

export const createTemplate = async (templateData) => {
  // Handle both old days format and new specific_date format
  const processedData = { ...templateData };
  
  // If specific_date is provided, ensure days is also set for backward compatibility
  if (processedData.specific_date && (!processedData.days || processedData.days.length === 0)) {
    const date = new Date(processedData.specific_date);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    processedData.days = [dayNames[date.getDay()]];
  }
  
  // If days is provided but no specific_date, keep the old behavior
  if (processedData.days && processedData.days.length > 0 && !processedData.specific_date) {
    // Keep existing behavior for backward compatibility
  }
  
  // Create the template first
  const template = await ScheduleTemplate.create(processedData);
  
  // Auto-assign team leader for zone-based templates (those with a department that's not Role-Based)
  if (template.department && template.department !== 'Role-Based') {
    try {
      const { default: User } = await import("../models/user.js");
      const { default: Employee } = await import("../models/employee.js");
      
      console.log(`🔍 Looking for team leader for department: ${template.department}`);
      
      // First, check all team leaders
      const allTeamLeaders = await User.findAll({
        where: { role: "teamleader" },
        include: [{
          model: Employee,
          as: "employee",
          required: false
        }]
      });
      
      console.log(`📋 Found ${allTeamLeaders.length} team leader(s) in system:`);
      allTeamLeaders.forEach(tl => {
        console.log(`   - User: ${tl.username}, employeeId FK: ${tl.employeeId}`);
        if (tl.employee) {
          console.log(`     Employee: ${tl.employee.employee_id}, Dept: ${tl.employee.department}, Position: ${tl.employee.position}`);
        } else {
          console.log(`     ⚠️ No employee record linked!`);
        }
      });
      
      const teamLeaderUser = await User.findOne({
        where: { role: "teamleader" },
        include: [{
          model: Employee,
          as: "employee",
          where: { department: template.department }
        }]
      });
      
      if (teamLeaderUser && teamLeaderUser.employee) {
        const teamLeaderId = teamLeaderUser.employee.employee_id;
        console.log(`👑 Auto-assigning team leader ${teamLeaderId} to newly created template ${template.id} (${template.department})`);
        
        const now = new Date().toISOString();
        const teamLeaderAssignment = [{
          employee_id: teamLeaderId,
          assigned_date: now,
          assigned_by: processedData.created_by || "system"
        }];
        
        await template.update({
          assigned_employees: JSON.stringify(teamLeaderAssignment)
        });
        
        console.log(`✅ Team leader ${teamLeaderId} auto-assigned to template ${template.id}`);
      } else {
        console.log(`⚠️ No team leader found for department: ${template.department}`);
        console.log(`   This means either:`);
        console.log(`   1. No user with role='teamleader' exists`);
        console.log(`   2. Team leader user has no linked employee record`);
        console.log(`   3. Team leader's employee record has different department`);
      }
    } catch (error) {
      console.error("⚠️ Error auto-assigning team leader during template creation:", error);
      console.error("   Error details:", error.message);
      // Don't fail the template creation if team leader assignment fails
    }
  }
  
  return template;
};

// Assign employees to a template
export const assignEmployeesToTemplate = async (templateId, employeeIds, assignedBy) => {
  const template = await ScheduleTemplate.findByPk(templateId);
  if (!template) {
    throw new Error("Template not found");
  }
  
  console.log(`🎯 Starting assignment process for template ${templateId} (${template.department} - ${template.shift_name})`);
  console.log(`📋 Original employee IDs to assign:`, employeeIds);
  
  // TEMPORARILY DISABLED: Fingerprint validation
  // This was blocking all assignments. Re-enable later with proper logic for management roles.
  /*
  // Validate that all employees have fingerprints enrolled before proceeding
  console.log("🔍 Checking fingerprint status for all employees...");
  const fingerprintValidation = await Promise.all(
    employeeIds.map(async (employeeId) => {
      const hasFingerprint = await checkEmployeeFingerprintStatus(employeeId);
      return { employeeId, hasFingerprint };
    })
  );
  
  // Check if any employees don't have fingerprints
  const employeesWithoutFingerprints = fingerprintValidation.filter(result => !result.hasFingerprint);
  
  if (employeesWithoutFingerprints.length > 0) {
    const missingEmployeeIds = employeesWithoutFingerprints.map(result => result.employeeId);
    console.log(`❌ Cannot assign employees without fingerprints: ${missingEmployeeIds.join(', ')}`);
    throw new Error(`Cannot schedule employees ${missingEmployeeIds.join(', ')}. These employees must have fingerprints enrolled in the biometric system before being scheduled.`);
  }
  
  console.log(`✅ All employees have fingerprints enrolled, proceeding with assignment...`);
  */
  
  console.log(`✅ Proceeding with assignment (fingerprint validation temporarily disabled)...`);
  
  // Get existing assignments
  let existingAssignments = [];
  try {
    existingAssignments = template.assigned_employees ? JSON.parse(template.assigned_employees) : [];
  } catch (e) {
    existingAssignments = [];
  }
  
  console.log(`📊 Existing assignments:`, existingAssignments.map(a => a.employee_id));
  
  // Auto-assign team leader for this department if not already assigned
  let finalEmployeeIds = [...employeeIds];
  try {
    const { default: User } = await import("../models/user.js");
    const { default: Employee } = await import("../models/employee.js");
    
    const teamLeaderUser = await User.findOne({
      where: { role: "teamleader" },
      include: [{
        model: Employee,
        as: "employee",
        where: { department: template.department }
      }]
    });
    
    if (teamLeaderUser && teamLeaderUser.employee) {
      const teamLeaderId = teamLeaderUser.employee.employee_id;
      console.log(`👑 Found team leader for ${template.department}: ${teamLeaderId}`);
      
      // Check if team leader is already assigned
      const teamLeaderExists = existingAssignments.find(existing => existing.employee_id === teamLeaderId);
      
      if (!teamLeaderExists && !employeeIds.includes(teamLeaderId)) {
        console.log(`🎯 Auto-assigning team leader ${teamLeaderId} to template ${templateId}`);
        finalEmployeeIds = [teamLeaderId, ...employeeIds]; // Add team leader first
      } else {
        console.log(`ℹ️ Team leader ${teamLeaderId} already assigned or in the list`);
      }
    } else {
      console.log(`⚠️ No team leader found for department: ${template.department}`);
    }
  } catch (error) {
    console.error("⚠️ Error auto-assigning team leader:", error);
    // Don't fail the main operation if team leader assignment fails
  }
  
  console.log(`📋 Final employee IDs to assign (including team leader):`, finalEmployeeIds);
  
  // Add new assignments
  const now = new Date().toISOString();
  const newAssignments = finalEmployeeIds.map(employeeId => ({
    employee_id: employeeId,
    assigned_date: now,
    assigned_by: assignedBy
  }));
  
  // Merge with existing (avoid duplicates)
  const allAssignments = [...existingAssignments];
  newAssignments.forEach(newAssignment => {
    const exists = allAssignments.find(existing => existing.employee_id === newAssignment.employee_id);
    if (!exists) {
      allAssignments.push(newAssignment);
      console.log(`✅ Added assignment: ${newAssignment.employee_id}`);
    } else {
      console.log(`ℹ️ Skipped duplicate assignment: ${newAssignment.employee_id}`);
    }
  });
  
  await template.update({
    assigned_employees: JSON.stringify(allAssignments)
  });
  
  console.log(`✅ Successfully assigned ${newAssignments.length} employees to template ${templateId} (${template.department} - ${template.shift_name})`);
  console.log(`📊 Total assignments now: ${allAssignments.length}`);
  
  return template;
};

// Remove employees from a template
export const removeEmployeesFromTemplate = async (templateId, employeeIds) => {
  const template = await ScheduleTemplate.findByPk(templateId);
  if (!template) {
    throw new Error("Template not found");
  }
  
  // Get existing assignments
  let existingAssignments = [];
  try {
    existingAssignments = template.assigned_employees ? JSON.parse(template.assigned_employees) : [];
  } catch (e) {
    existingAssignments = [];
  }
  
  // Remove specified employees
  const updatedAssignments = existingAssignments.filter(assignment => 
    !employeeIds.includes(assignment.employee_id)
  );
  
  await template.update({
    assigned_employees: JSON.stringify(updatedAssignments)
  });
  
  return template;
};

export const updateTemplate = async (id, updates) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;

  await template.update(updates);
  return template;
};

export const deleteTemplate = async (id) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;

  // Directly delete the template (no more pending deletion logic)
  await template.destroy();
  return true;
};