import express from "express";
import { loginUser, updateCredentials } from "../controllers/authController.js";
import { getUserProfile } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

//  LOGIN route
router.post("/login", loginUser);

//  CHANGE credentials (optional, employee updates own username/password)
router.put("/:id/credentials", updateCredentials);

// GET /api/users/profile
router.get("/profile", verifyToken, getUserProfile);

export default router;
