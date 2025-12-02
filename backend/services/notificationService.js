import Notification from "../models/notification.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";

// Create notification for specific user
export const createNotification = async (notificationData) => {
  return await Notification.create(notificationData);
};

// Create notifications for all team leaders in specific departments
export const notifyTeamLeaders = async (departments, title, message, type = "schedule_update", relatedId = null, createdBy = null) => {
  try {
    const { Op } = await import("sequelize");
    
    // Ensure departments is an array
    const deptArray = Array.isArray(departments) ? departments : [departments];
    
    console.log(`🔍 Looking for team leaders in departments: ${deptArray.join(', ')}`);
    
    // Find all team leaders in the specified departments
    const teamLeaders = await User.findAll({
      where: { role: "teamleader" },
      include: [{
        model: Employee,
        as: "employee",
        where: { 
          department: {
            [Op.in]: deptArray
          }
        }
      }]
    });

    console.log(`📋 Found ${teamLeaders.length} team leader(s)`);

    if (teamLeaders.length === 0) {
      console.log(`⚠️ No team leaders found for departments: ${deptArray.join(', ')}`);
      return [];
    }

    // Create notifications for each team leader
    const notifications = await Promise.all(
      teamLeaders.map(user => {
        console.log(`📧 Creating notification for: ${user.employee.fullname} (${user.employee.employee_id})`);
        return Notification.create({
          user_id: user.id,
          employee_id: user.employee.employee_id,
          type: type,
          title: title,
          message: message,
          is_read: false,
          related_id: relatedId,
          created_by: createdBy
        });
      })
    );

    console.log(`✅ Created ${notifications.length} notification(s) for team leaders in: ${deptArray.join(', ')}`);
    return notifications;
  } catch (error) {
    console.error("❌ Error notifying team leaders:", error);
    throw error;
  }
};

// Get all notifications for a user
export const getUserNotifications = async (userId) => {
  return await Notification.findAll({
    where: { user_id: userId },
    order: [["createdAt", "DESC"]]
  });
};

// Get unread notifications count
export const getUnreadCount = async (userId) => {
  return await Notification.count({
    where: { 
      user_id: userId,
      is_read: false 
    }
  });
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
  const notification = await Notification.findByPk(notificationId);
  if (!notification) return null;
  
  await notification.update({ is_read: true });
  return notification;
};

// Mark all notifications as read for a user
export const markAllAsRead = async (userId) => {
  const [updatedCount] = await Notification.update(
    { is_read: true },
    { where: { user_id: userId, is_read: false } }
  );
  return updatedCount;
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  const notification = await Notification.findByPk(notificationId);
  if (!notification) return false;
  
  await notification.destroy();
  return true;
};
