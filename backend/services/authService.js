import User from "../models/user.js";
import Employee from "../models/employee.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//  LOGIN SERVICE
export const verifyLogin = async (username, password) => {
  const user = await User.findOne({
    where: { username },
    include: [{ model: Employee, as: "employee" }],
  });

  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid password");

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    "secureattend_secret_key",
    { expiresIn: "2h" }
  );

  return {
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employee: user.employee,
    },
  };
};

//  CHANGE USERNAME / PASSWORD
export const changeUserCredentials = async (userId, username, password) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  if (username) user.username = username;
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
  }

  await user.save();

  return {
    message: "User credentials updated successfully",
    user: { id: user.id, username: user.username },
  };
};
