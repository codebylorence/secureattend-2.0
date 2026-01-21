import express from "express";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import RegistrationRequest from "../models/registrationRequest.js";
import Employee from "../models/employee.js";
import User from "../models/user.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Submit registration request
router.post("/register", async (req, res) => {
  try {
    console.log("📝 New registration request received");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    // Test database connection
    await RegistrationRequest.findOne({ limit: 1 });
    console.log("✅ Database connection test passed");
    
    const {
      employee_id,
      firstname,
      lastname,
      department,
      position,
      contact_number,
      email,
      username,
      password,
      photo,
      role // This will be derived from position on frontend, but we'll also derive it here as backup
    } = req.body;

    // Function to determine role based on position
    const getRoleFromPosition = (position) => {
      const positionLower = position.toLowerCase();
      if (positionLower.includes('admin')) {
        return 'admin';
      } else if (positionLower.includes('supervisor') || positionLower.includes('manager')) {
        return 'supervisor';
      } else if (positionLower.includes('team leader') || positionLower.includes('lead')) {
        return 'teamleader';
      } else {
        return 'employee';
      }
    };

    // Derive role from position (use frontend role as fallback)
    const derivedRole = role || getRoleFromPosition(position);

    // Auto-set department to "Company-wide" for admin and supervisor roles
    let finalDepartment = department;
    if ((derivedRole === 'admin' || derivedRole === 'supervisor') && !department) {
      finalDepartment = 'Company-wide';
    }

    // Validate Employee ID format (TSI followed by 5 digits)
    const employeeIdPattern = /^TSI\d{5}$/;
    if (!employeeIdPattern.test(employee_id)) {
      console.log("❌ Invalid Employee ID format:", employee_id);
      return res.status(400).json({
        message: "Employee ID must be in format TSI00123 (TSI followed by 5 digits)"
      });
    }

    // Validate required fields
    const requiredFields = ['employee_id', 'firstname', 'lastname', 'position', 'contact_number', 'email', 'username', 'password'];
    
    // Department is only required for employees and team leaders (admin/supervisor get "Company-wide")
    if (derivedRole === 'employee' || derivedRole === 'teamleader') {
      if (!finalDepartment) {
        requiredFields.push('department');
      }
    }

    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log("❌ Missing required fields:", missingFields);
      console.log("Field validation:", {
        employee_id: !!employee_id,
        firstname: !!firstname,
        lastname: !!lastname,
        department: !!finalDepartment,
        position: !!position,
        contact_number: !!contact_number,
        email: !!email,
        username: !!username,
        password: !!password,
        derivedRole: derivedRole
      });
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    console.log(`🔍 Checking for duplicates - Employee ID: ${employee_id}, Username: ${username}`);

    // Check if employee_id or username already exists in PENDING requests or actual records
    const existingPendingRequest = await RegistrationRequest.findOne({
      where: {
        [Op.and]: [
          { status: "pending" }, // Only check pending requests
          {
            [Op.or]: [
              { employee_id },
              { username }
            ]
          }
        ]
      }
    });

    const existingEmployee = await Employee.findOne({
      where: { employee_id }
    });

    const existingUser = await User.findOne({
      where: { username }
    });

    console.log(`📊 Duplicate check results:`, {
      existingPendingRequest: !!existingPendingRequest,
      existingEmployee: !!existingEmployee,
      existingUser: !!existingUser
    });

    if (existingPendingRequest) {
      console.log("❌ Pending request already exists");
      return res.status(400).json({
        message: "A pending registration request already exists with this Employee ID or username"
      });
    }

    if (existingEmployee) {
      console.log("❌ Employee ID already exists");
      return res.status(400).json({
        message: "Employee ID already exists"
      });
    }

    if (existingUser) {
      console.log("❌ Username already exists");
      return res.status(400).json({
        message: "Username already exists"
      });
    }

    console.log("🔐 Hashing password...");
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed successfully");

    console.log("💾 Creating registration request...");
    // Check photo size (limit to 5MB base64)
    if (photo && photo.length > 5 * 1024 * 1024) {
      console.log("❌ Photo too large");
      return res.status(400).json({
        message: "Photo size is too large. Please use a smaller image (max 5MB)."
      });
    }
    
    console.log("Data to be saved:", {
      employee_id,
      firstname,
      lastname,
      department: finalDepartment,
      position,
      role: derivedRole,
      contact_number,
      email,
      username,
      photo: photo ? `Photo data length: ${photo.length}` : 'No photo',
      status: "pending"
    });
    
    // Create registration request
    const registrationRequest = await RegistrationRequest.create({
      employee_id,
      firstname,
      lastname,
      department: finalDepartment, // Use finalDepartment which includes "Company-wide" for admin/supervisor
      position,
      role: derivedRole,
      contact_number,
      email,
      username,
      password: hashedPassword,
      photo,
      status: "pending"
    });

    console.log(`✅ Registration request created with ID: ${registrationRequest.id}`);

    // Send notification to admins about new registration request
    try {
      const { notifyAdmins } = await import("../services/notificationService.js");
      
      const message = `New registration request from ${firstname} ${lastname} (${employee_id}) for ${derivedRole} role in ${finalDepartment}`;
      
      await notifyAdmins(
        "New Registration Request",
        message,
        "general",
        registrationRequest.id,
        "system"
      );
      
      console.log("✅ Registration request notification sent to admins");
    } catch (notifyError) {
      console.error("❌ Error sending registration request notification:", notifyError);
      // Don't fail the registration if notification fails
    }

    // Emit real-time notification to admins
    const io = req.app.get('io');
    io.emit('new_registration_request', {
      id: registrationRequest.id,
      firstname,
      lastname,
      employee_id,
      department: finalDepartment,
      role: derivedRole
    });

    res.status(201).json({
      message: "Registration request submitted successfully. Please wait for admin approval.",
      requestId: registrationRequest.id
    });

  } catch (error) {
    console.error("❌ Registration error:", error);
    console.error("Error stack:", error.stack);
    
    // Handle unique constraint violations
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      if (field === 'employee_id') {
        return res.status(400).json({
          message: "Employee ID already exists"
        });
      } else if (field === 'username') {
        return res.status(400).json({
          message: "Username already exists"
        });
      } else {
        return res.status(400).json({
          message: "A registration request with this information already exists"
        });
      }
    }
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message).join(', ');
      return res.status(400).json({
        message: `Validation error: ${validationErrors}`
      });
    }
    
    res.status(500).json({
      message: "Failed to submit registration request",
      error: error.message
    });
  }
});

// Get all pending registration requests (Admin only)
router.get("/pending", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingRequests = await RegistrationRequest.findAll({
      where: { status: "pending" },
      order: [["createdAt", "DESC"]]
    });

    res.json(pendingRequests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({
      message: "Failed to fetch pending requests",
      error: error.message
    });
  }
});

// Approve registration request (Admin only)
router.post("/approve/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    console.log(`🔍 Admin ${adminId} attempting to approve registration request ${id}`);

    const registrationRequest = await RegistrationRequest.findByPk(id);
    
    if (!registrationRequest) {
      console.log(`❌ Registration request not found: ${id}`);
      return res.status(404).json({ message: "Registration request not found" });
    }

    if (registrationRequest.status !== "pending") {
      console.log(`❌ Request already processed: ${registrationRequest.status}`);
      return res.status(400).json({ message: "Request has already been processed" });
    }

    // Note: No need to check for duplicates here since they were already validated during registration submission

    console.log(`👤 Creating employee record for: ${registrationRequest.firstname} ${registrationRequest.lastname} (${registrationRequest.employee_id})`);
    
    // Create employee
    const employee = await Employee.create({
      employee_id: registrationRequest.employee_id,
      firstname: registrationRequest.firstname,
      lastname: registrationRequest.lastname,
      department: registrationRequest.department, // This will be "Company-wide" for admin/supervisor
      position: registrationRequest.position,
      contact_number: registrationRequest.contact_number,
      email: registrationRequest.email,
      photo: registrationRequest.photo,
      status: "Active"
    });

    console.log(`✅ Employee created with ID: ${employee.id}`);
    console.log(`🔐 Creating user account with username: ${registrationRequest.username}`);

    // Use the role from the registration request
    const userRole = registrationRequest.role;
    console.log(`👤 Setting user role to: ${userRole}`);

    // Create user account
    const user = await User.create({
      username: registrationRequest.username,
      password: registrationRequest.password, // Password is already hashed from registration
      role: userRole,
      employeeId: employee.id
    });

    console.log(`✅ User account created with ID: ${user.id}`);

    // Verify both records were created successfully
    const verifyEmployee = await Employee.findByPk(employee.id);
    const verifyUser = await User.findByPk(user.id);

    if (!verifyEmployee || !verifyUser) {
      console.error(`❌ Verification failed - Employee: ${!!verifyEmployee}, User: ${!!verifyUser}`);
      throw new Error("Failed to create employee or user record");
    }

    console.log(`✅ Verification successful - Both Employee and User records created`);

    // Update registration request status first (for logging purposes)
    await registrationRequest.update({
      status: "approved",
      approved_by: adminId,
      approved_at: new Date()
    });

    console.log(`✅ Registration request marked as approved`);

    // Send notification to supervisors in the employee's department about approval
    try {
      const { notifySupervisors } = await import("../services/notificationService.js");
      
      const message = `Registration approved: ${registrationRequest.firstname} ${registrationRequest.lastname} (${registrationRequest.employee_id}) has been added as ${registrationRequest.role} in ${registrationRequest.department}`;
      
      // Only notify supervisors if it's a specific department (not Company-wide)
      const departmentsToNotify = registrationRequest.department === 'Company-wide' ? [] : [registrationRequest.department];
      
      await notifySupervisors(
        departmentsToNotify,
        "Registration Approved",
        message,
        "general",
        employee.id,
        "admin"
      );
      
      console.log("✅ Registration approval notification sent to supervisors");
    } catch (notifyError) {
      console.error("❌ Error sending registration approval notification:", notifyError);
      // Don't fail the approval if notification fails
    }

    // Delete the registration request record since it's no longer needed
    // Note: We delete it immediately since the employee account is now created
    await registrationRequest.destroy();
    console.log(`🗑️ Registration request record deleted from database - Employee account successfully created`);

    // Emit real-time notification
    const io = req.app.get('io');
    io.emit('registration_approved', {
      employee_id: registrationRequest.employee_id,
      firstname: registrationRequest.firstname,
      lastname: registrationRequest.lastname
    });

    res.json({
      message: "Registration request approved successfully. Employee account created and registration record removed.",
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        firstname: employee.firstname,
        lastname: employee.lastname
      }
    });

  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({
      message: "Failed to approve registration request",
      error: error.message
    });
  }
});

// Reject registration request (Admin only)
router.post("/reject/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const adminId = req.user.id;

    const registrationRequest = await RegistrationRequest.findByPk(id);
    
    if (!registrationRequest) {
      return res.status(404).json({ message: "Registration request not found" });
    }

    if (registrationRequest.status !== "pending") {
      return res.status(400).json({ message: "Request has already been processed" });
    }

    // Update registration request status
    await registrationRequest.update({
      status: "rejected",
      rejection_reason,
      approved_by: adminId,
      approved_at: new Date()
    });

    // Send notification to supervisors in the department about rejection
    try {
      const { notifySupervisors } = await import("../services/notificationService.js");
      
      const message = `Registration rejected: ${registrationRequest.firstname} ${registrationRequest.lastname} (${registrationRequest.employee_id}) for ${registrationRequest.role} role in ${registrationRequest.department}. Reason: ${rejection_reason}`;
      
      // Only notify supervisors if it's a specific department (not Company-wide)
      const departmentsToNotify = registrationRequest.department === 'Company-wide' ? [] : [registrationRequest.department];
      
      await notifySupervisors(
        departmentsToNotify,
        "Registration Rejected",
        message,
        "general",
        registrationRequest.id,
        "admin"
      );
      
      console.log("✅ Registration rejection notification sent to supervisors");
    } catch (notifyError) {
      console.error("❌ Error sending registration rejection notification:", notifyError);
      // Don't fail the rejection if notification fails
    }

    // Emit real-time notification
    const io = req.app.get('io');
    io.emit('registration_rejected', {
      employee_id: registrationRequest.employee_id,
      firstname: registrationRequest.firstname,
      lastname: registrationRequest.lastname,
      rejection_reason
    });

    // Optional: Delete rejected request after 24 hours (uncomment if desired)
    // setTimeout(async () => {
    //   try {
    //     await RegistrationRequest.destroy({ where: { id: registrationRequest.id } });
    //     console.log(`🗑️ Rejected registration request ${registrationRequest.id} deleted after 24 hours`);
    //   } catch (error) {
    //     console.error('Error deleting rejected request:', error);
    //   }
    // }, 24 * 60 * 60 * 1000); // 24 hours

    res.json({
      message: "Registration request rejected successfully"
    });

  } catch (error) {
    console.error("Rejection error:", error);
    res.status(500).json({
      message: "Failed to reject registration request",
      error: error.message
    });
  }
});

// Get registration request status by employee_id (for checking status)
router.get("/status/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;

    const registrationRequest = await RegistrationRequest.findOne({
      where: { employee_id },
      attributes: ['id', 'status', 'rejection_reason', 'createdAt', 'approved_at']
    });

    if (!registrationRequest) {
      // If no registration request found, check if employee account exists (meaning it was approved and deleted)
      const employee = await Employee.findOne({ where: { employee_id } });
      
      if (employee) {
        // Employee exists, so the registration was approved and the request was deleted
        return res.json({
          status: 'approved',
          message: 'Registration approved - Employee account created successfully',
          employeeExists: true,
          userExists: true,
          approved_at: employee.createdAt
        });
      }
      
      return res.status(404).json({ message: "Registration request not found" });
    }

    // If approved, also check if Employee and User records exist
    let employeeExists = false;
    let userExists = false;

    if (registrationRequest.status === 'approved') {
      const employee = await Employee.findOne({ where: { employee_id } });
      const user = await User.findOne({ 
        include: [{
          model: Employee,
          as: 'employee',
          where: { employee_id }
        }]
      });

      employeeExists = !!employee;
      userExists = !!user;

      console.log(`📊 Status check for ${employee_id}: Employee exists: ${employeeExists}, User exists: ${userExists}`);
    }

    res.json({
      ...registrationRequest.toJSON(),
      employeeExists,
      userExists
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      message: "Failed to check registration status",
      error: error.message
    });
  }
});

// Cleanup old processed registration requests (Admin only)
router.delete("/cleanup", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query; // Default to 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Delete approved and rejected requests older than specified days
    const deletedCount = await RegistrationRequest.destroy({
      where: {
        status: ['approved', 'rejected'],
        approved_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`🗑️ Cleanup completed: ${deletedCount} old registration requests deleted`);

    res.json({
      message: `Cleanup completed successfully`,
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({
      message: "Failed to cleanup old requests",
      error: error.message
    });
  }
});

export default router;