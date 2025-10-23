import express from "express";
import { loginUser, updateCredentials } from "../controllers/authController.js";

const router = express.Router();

//  LOGIN route
router.post("/login", loginUser);

//  CHANGE credentials (optional, employee updates own username/password)
router.put("/:id/credentials", updateCredentials);

export default router;
