import express from "express";
import { loginUser, updateCredentials } from "../controllers/authController.js";
import { getUserProfile, getTeamLeaders, createMissingTeamLeaderAccounts } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

//  LOGIN route
router.post("/login", loginUser);

//  CHANGE credentials (optional, employee updates own username/password)
router.put("/:id/credentials", updateCredentials);

// GET /api/users/profile
router.get("/profile", verifyToken, getUserProfile);

// GET /api/users/teamleaders
router.get("/teamleaders", getTeamLeaders);

// POST /api/auth/create-teamleader-accounts - Create missing team leader accounts
router.post("/create-teamleader-accounts", createMissingTeamLeaderAccounts);

export default router;
