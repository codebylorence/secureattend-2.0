import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  
  console.log(`🔐 Auth check for ${req.method} ${req.path}`);
  console.log(`🔐 Auth header present: ${!!authHeader}`);
  console.log(`🔐 Token present: ${!!token}`);
  
  if (!token) {
    console.log(`❌ No token provided for ${req.method} ${req.path}`);
    console.log(`❌ Auth header: ${authHeader}`);
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secureattend_secret_key"
    );

    console.log(`✅ Token decoded successfully for user:`, {
      id: decoded.id,
      role: decoded.role,
      employeeId: decoded.employeeId,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiration'
    });

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log('❌ Auth: Token has expired');
      return res.status(401).json({ message: "Token has expired. Please log in again." });
    }

    // Verify user still exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log('❌ Auth: User not found in database for ID:', decoded.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`✅ User found in database:`, {
      id: user.id,
      role: user.role,
      employeeId: user.employeeId
    });

    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Auth: JWT Verification Error:", error.message);
    console.error("❌ Token that failed:", token?.substring(0, 20) + "...");
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token has expired. Please log in again." });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token. Please log in again." });
    } else {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const requireAdminOrTeamLeader = (req, res, next) => {
  console.log(`🔐 Role check: User role is "${req.user.role}", checking for admin/teamleader/supervisor access`);
  
  if (req.user.role !== "admin" && req.user.role !== "superadmin" && req.user.role !== "teamleader" && req.user.role !== "supervisor") {
    console.log(`❌ Access denied: Role "${req.user.role}" is not authorized for this endpoint`);
    return res.status(403).json({ message: "Admin, Team Leader, or Supervisor access required" });
  }
  
  console.log(`✅ Role check passed: "${req.user.role}" has access`);
  next();
};

export const requireSupervisor = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "superadmin" && req.user.role !== "supervisor") {
    return res.status(403).json({ message: "Admin or Supervisor access required" });
  }
  next();
};

export const requireAdminOrSupervisor = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "superadmin" && req.user.role !== "supervisor") {
    return res.status(403).json({ message: "Admin or Supervisor access required" });
  }
  next();
};