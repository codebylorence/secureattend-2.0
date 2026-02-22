import express from "express";
import { loginUser, updateCredentials, updateProfile, forgotPassword, resetPasswordController, verifyResetTokenController } from "../controllers/authController.js";
import { getUserProfile, getTeamLeaders, createMissingTeamLeaderAccounts, fixTeamLeaderRoles } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

//  LOGIN route
router.post("/login", loginUser);

// POST /api/users/forgot-password - Request password reset
router.post("/forgot-password", forgotPassword);

// POST /api/users/reset-password - Reset password with token
router.post("/reset-password", resetPasswordController);

// GET /api/users/verify-reset-token/:token - Verify reset token
router.get("/verify-reset-token/:token", verifyResetTokenController);

//  CHANGE credentials (optional, employee updates own username/password)
router.put("/:id/credentials", updateCredentials);

// PUT /api/auth/profile - Update user profile
router.put("/profile", authenticateToken, updateProfile);

// GET /api/users/profile
router.get("/profile", verifyToken, getUserProfile);

// GET /api/users/teamleaders
router.get("/teamleaders", getTeamLeaders);

// POST /api/auth/create-teamleader-accounts - Create missing team leader accounts
router.post("/create-teamleader-accounts", createMissingTeamLeaderAccounts);

// POST /api/users/fix-teamleader-roles - Fix team leader roles
router.post("/fix-teamleader-roles", fixTeamLeaderRoles);

export default router;
