import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Employee from "../models/employee.js";
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
