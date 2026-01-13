import ScheduleNotification from "../models/scheduleNotification.js";

// Get unacknowledged schedule notifications for biometric app
export const getUnacknowledgedNotifications = async (req, res) => {
  try {
    const notifications = await ScheduleNotification.findAll({
      where: {
        is_acknowledged: false
      },
      order: [["createdAt", "DESC"]],
      limit: 10 // Limit to prevent overwhelming the biometric app
    });

    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error("Error fetching schedule notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message
    });
  }
};

// Acknowledge a notification (mark as read)
export const acknowledgeNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await ScheduleNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    await notification.update({
      is_acknowledged: true,
      acknowledged_at: new Date()
    });

    res.json({
      success: true,
      message: "Notification acknowledged"
    });
  } catch (error) {
    console.error("Error acknowledging notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to acknowledge notification",
      error: error.message
    });
  }
};

// Acknowledge all notifications
export const acknowledgeAllNotifications = async (req, res) => {
  try {
    await ScheduleNotification.update(
      {
        is_acknowledged: true,
        acknowledged_at: new Date()
      },
      {
        where: {
          is_acknowledged: false
        }
      }
    );

    res.json({
      success: true,
      message: "All notifications acknowledged"
    });
  } catch (error) {
    console.error("Error acknowledging all notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to acknowledge all notifications",
      error: error.message
    });
  }
};

// Create a new schedule notification (used internally by other controllers)
export const createScheduleNotification = async (message, type = "schedule_update", details = null, createdBy = null) => {
  try {
    const notification = await ScheduleNotification.create({
      message,
      type,
      details: details ? JSON.stringify(details) : null,
      created_by: createdBy
    });

    console.log(`📢 Schedule notification created: ${message}`);
    return notification;
  } catch (error) {
    console.error("Error creating schedule notification:", error);
    throw error;
  }
};