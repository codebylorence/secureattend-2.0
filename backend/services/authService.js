import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sequelize from "../config/database.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";
import PasswordReset from "../models/passwordReset.js";
import { sendPasswordResetEmail } from "./emailService.js";
// Import associations to ensure they are loaded
import "../models/associations.js";

export const verifyLogin = async (username, password) => {
  try {
    const user = await User.findOne({
      where: { username },
      include: [{ 
        model: Employee, 
        as: "employee",
        required: false // Make the employee association optional
      }],
    });

    if (!user) {
      throw new Error("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid username or password");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, employeeId: user.employeeId },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        employeeId: user.employeeId,
        employee: user.employee,
      },
    };
  } catch (error) {
    // If there's an association error, try without the include
    if (error.message.includes("not associated")) {
      console.log("⚠️ Association error, trying without employee include...");
      
      const user = await User.findOne({
        where: { username }
      });

      if (!user) {
        throw new Error("Invalid username or password");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid username or password");
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, employeeId: user.employeeId },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      return {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role,
          employeeId: user.employeeId,
          employee: null, // No employee data for admin users
        },
      };
    }
    throw error;
  }
};

export const changeUserCredentials = async (id, username, password, currentPassword = null, firstname = null, lastname = null) => {
  const user = await User.findByPk(id, {
    include: [{ model: Employee, as: "employee" }]
  });
  if (!user) {
    throw new Error("User not found");
  }

  // If current password is provided, verify it
  if (currentPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }
  }

  // Prepare update data
  const updateData = {};
  
  // Update username if provided and different
  if (username && username !== user.username) {
    updateData.username = username;
  }
  
  // Update password if provided
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }
  
  // Update firstname if provided and user is admin or warehouseadmin
  if (firstname !== null && (user.role === 'admin' || user.role === 'warehouseadmin')) {
    updateData.firstname = firstname;
  }
  
  // Update lastname if provided and user is admin or warehouseadmin
  if (lastname !== null && (user.role === 'admin' || user.role === 'warehouseadmin')) {
    updateData.lastname = lastname;
  }
  
  // Only update if there are changes
  if (Object.keys(updateData).length > 0) {
    await user.update(updateData);
  }

  return { message: "Profile updated successfully" };
};

export const requestPasswordReset = async (email) => {
  try {
    // Find user by email (stored in username field for employees, or check employee email)
    let user = await User.findOne({
      where: { username: email },
      include: [{ 
        model: Employee, 
        as: "employee",
        required: false
      }]
    });

    // If not found by username, try finding by employee email
    if (!user) {
      const employee = await Employee.findOne({
        where: { email: email }
      });
      
      if (employee) {
        user = await User.findOne({
          where: { employeeId: employee.id },
          include: [{ 
            model: Employee, 
            as: "employee",
            required: false
          }]
        });
      }
    }

    if (!user) {
      // Don't reveal if user exists or not for security
      return { 
        message: "If an account with that email exists, a password reset link has been sent.",
        success: true 
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing unused tokens for this user
    await PasswordReset.destroy({
      where: { 
        userId: user.id,
        used: false
      }
    });

    // Create new reset token
    await PasswordReset.create({
      userId: user.id,
      token: hashedToken,
      expiresAt: expiresAt,
      used: false
    });

    // Send email with reset link
    const emailResult = await sendPasswordResetEmail(email, resetToken);

    console.log(`🔑 Password reset requested for ${email}`);
    console.log(`⏰ Token expires at: ${expiresAt}`);
    
    if (emailResult.sent) {
      console.log(`✅ Reset email sent successfully`);
    } else {
      console.log(`⚠️  Email not sent: ${emailResult.reason || emailResult.error}`);
      // In development, log token to console if email fails
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 DEV MODE - Reset token: ${resetToken}`);
      }
    }

    return { 
      message: "If an account with that email exists, a password reset link has been sent.",
      success: true,
      // Only include token in development if email wasn't sent
      resetToken: (process.env.NODE_ENV === 'development' && !emailResult.sent) ? resetToken : undefined
    };
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    throw new Error("Failed to process password reset request");
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    // Hash the provided token to match stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetRecord = await PasswordReset.findOne({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!resetRecord) {
      throw new Error("Invalid or expired reset token");
    }

    // Find user
    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await user.update({ password: hashedPassword });

    // Mark token as used
    await resetRecord.update({ used: true });

    console.log(`✅ Password reset successful for user ID: ${user.id}`);

    return { 
      message: "Password has been reset successfully. You can now login with your new password.",
      success: true 
    };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    throw error;
  }
};

export const verifyResetToken = async (token) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordReset.findOne({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!resetRecord) {
      return { valid: false };
    }

    return { 
      valid: true,
      userId: resetRecord.userId 
    };
  } catch (error) {
    console.error("Error in verifyResetToken:", error);
    return { valid: false };
  }
};
