import express from "express";
import {
  getUnacknowledgedNotifications,
  acknowledgeNotification,
  acknowledgeAllNotifications
} from "../controllers/scheduleNotificationController.js";

const router = express.Router();

// Get unacknowledged notifications (for biometric app)
router.get("/unacknowledged", getUnacknowledgedNotifications);

// Acknowledge a specific notification
router.put("/:id/acknowledge", acknowledgeNotification);

// Acknowledge all notifications
router.put("/acknowledge-all", acknowledgeAllNotifications);

export default router;