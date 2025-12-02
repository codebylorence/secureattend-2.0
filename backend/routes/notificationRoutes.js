import express from "express";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearAllNotifications
} from "../controllers/notificationController.js";

const router = express.Router();

// GET /api/notifications/user/:userId - Get all notifications for a user
router.get("/user/:userId", getNotifications);

// GET /api/notifications/user/:userId/unread - Get unread count
router.get("/user/:userId/unread", getUnreadNotificationsCount);

// PUT /api/notifications/user/:userId/read-all - Mark all as read
router.put("/user/:userId/read-all", markAllNotificationsAsRead);

// DELETE /api/notifications/user/:userId/clear-all - Clear all notifications
router.delete("/user/:userId/clear-all", clearAllNotifications);

// PUT /api/notifications/:id/read - Mark notification as read
router.put("/:id/read", markNotificationAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete("/:id", removeNotification);

export default router;
