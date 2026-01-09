import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  
  if (!token) {
    console.log(`❌ No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secureattend_secret_key"
    );

    // Verify user still exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log('❌ Auth: User not found in database');
      return res.status(404).json({ message: "User not found" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Auth: JWT Verification Error:", error.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const requireAdminOrTeamLeader = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "teamleader" && req.user.role !== "supervisor") {
    return res.status(403).json({ message: "Admin, Team Leader, or Supervisor access required" });
  }
  next();
};

export const requireSupervisor = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "supervisor") {
    return res.status(403).json({ message: "Admin or Supervisor access required" });
  }
  next();
};

export const requireAdminOrSupervisor = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "supervisor") {
    return res.status(403).json({ message: "Admin or Supervisor access required" });
  }
  next();
};