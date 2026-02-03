import User from "../models/user.js";
import Employee from "../models/employee.js";
import { fixTeamLeaderRoles as fixRoles } from "../utils/fixTeamLeaderRoles.js";

// 👤 GET USER PROFILE (using verifyToken middleware)
export const getUserProfile = async (req, res) => {
  try {
    // req.user is populated by your verifyToken middleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: "Invalid or missing token" });
    }

    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "role", "createdAt"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: [
            "employee_id",
            "fullname",
            "department",
            "position",
            "email",
            "contact_number",
            "status",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to load user profile" });
  }
};

// 👥 GET TEAM LEADERS
export const getTeamLeaders = async (req, res) => {
  try {
    const teamLeaders = await User.findAll({
      where: { role: "teamleader" },
      attributes: ["id", "username"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["employee_id", "firstname", "lastname", "department"],
        },
      ],
    });

    res.status(200).json(teamLeaders);
  } catch (error) {
    console.error("Error fetching team leaders:", error);
    res.status(500).json({ error: "Failed to fetch team leaders" });
  }
};

// 🔧 CREATE MISSING TEAM LEADER ACCOUNTS
export const createMissingTeamLeaderAccounts = async (req, res) => {
  try {
    const bcrypt = await import("bcryptjs");
    
    // Find all employees with position "Team Leader"
    const teamLeaderEmployees = await Employee.findAll({
      where: { position: "Team Leader" },
    });

    console.log(`📋 Found ${teamLeaderEmployees.length} team leader employee(s)`);

    const created = [];
    const skipped = [];
    const errors = [];

    for (const employee of teamLeaderEmployees) {
      try {
        // Check if user account already exists
        const existingUser = await User.findOne({
          where: { employeeId: employee.id },
        });

        if (existingUser) {
          skipped.push({
            employee_id: employee.employee_id,
            fullname: employee.fullname,
            reason: "Account already exists",
          });
          continue;
        }

        // Create user account
        const defaultPassword = await bcrypt.default.hash("teamleader123", 10);
        await User.create({
          username: employee.employee_id,
          password: defaultPassword,
          role: "teamleader",
          employeeId: employee.id,
        });

        created.push({
          employee_id: employee.employee_id,
          fullname: employee.fullname,
          username: employee.employee_id,
          password: "teamleader123",
        });

        console.log(`✅ Created account for: ${employee.fullname} (${employee.employee_id})`);
      } catch (error) {
        errors.push({
          employee_id: employee.employee_id,
          fullname: employee.fullname,
          error: error.message,
        });
        console.error(`❌ Error creating account for ${employee.employee_id}:`, error);
      }
    }

    res.status(200).json({
      message: "Team leader account creation completed",
      summary: {
        total: teamLeaderEmployees.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
      },
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("Error creating team leader accounts:", error);
    res.status(500).json({ error: "Failed to create team leader accounts" });
  }
};

// 🔧 FIX TEAM LEADER ROLES
export const fixTeamLeaderRoles = async (req, res) => {
  try {
    console.log("🔧 Starting team leader role fix via API...");
    
    const result = await fixRoles();
    
    if (result.success) {
      res.status(200).json({
        message: "Team leader roles fixed successfully",
        fixed: result.fixed
      });
    } else {
      res.status(500).json({
        message: "Failed to fix team leader roles",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Error in fix team leader roles API:", error);
    res.status(500).json({ 
      message: "Failed to fix team leader roles",
      error: error.message 
    });
  }
};