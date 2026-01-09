import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Employee from "../models/employee.js";

export const verifyLogin = async (username, password) => {
  const user = await User.findOne({
    where: { username },
    include: [{ model: Employee, as: "employee" }],
  });

  if (!user) {
    throw new Error("Invalid username or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid username or password");
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "24h" }
  );

  return {
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      employee: user.employee,
    },
  };
};

export const changeUserCredentials = async (id, username, password, currentPassword = null) => {
  const user = await User.findByPk(id);
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

  const hashedPassword = await bcrypt.hash(password, 10);
  await user.update({ username, password: hashedPassword });

  return { message: "Credentials updated successfully" };
};
