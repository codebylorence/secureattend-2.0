import {
  getUserNotifications as getNotificationsService,
  getUnreadCount,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
  deleteNotification
} from "../services/notificationService.js";

// GET /api/notifications/user/:userId
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await getNotificationsService(userId);
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

// GET /api/notifications/user/:userId/unread
export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await getUnreadCount(userId);
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Error fetching unread count" });
  }
};

// PUT /api/notifications/:id/read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await markAsReadService(id);
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Error marking notification as read" });
  }
};

// PUT /api/notifications/user/:userId/read-all
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await markAllAsReadService(userId);
    res.status(200).json({ message: `Marked ${count} notification(s) as read`, count });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ message: "Error marking all as read" });
  }
};

// DELETE /api/notifications/:id
export const removeNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteNotification(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Error deleting notification" });
  }
};

// DELETE /api/notifications/user/:userId/clear-all
export const clearAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { default: Notification } = await import("../models/notification.js");
    
    const deletedCount = await Notification.destroy({
      where: { user_id: userId }
    });
    
    res.status(200).json({ 
      message: `Cleared ${deletedCount} notification(s)`, 
      count: deletedCount 
    });
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    res.status(500).json({ message: "Error clearing all notifications" });
  }
};
