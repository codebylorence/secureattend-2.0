import Notification from "../models/notification.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";

export const getUserNotifications = async (userId) => {
  return await Notification.findAll({
    where: { user_id: userId },
    order: [["createdAt", "DESC"]],
  });
};

export const getUnreadCount = async (userId) => {
  return await Notification.count({
    where: { user_id: userId, is_read: false },
  });
};

export const markAsRead = async (id) => {
  const notification = await Notification.findByPk(id);
  if (!notification) return null;

  await notification.update({ is_read: true });
  return notification;
};

export const markAllAsRead = async (userId) => {
  const [count] = await Notification.update(
    { is_read: true },
    { where: { user_id: userId, is_read: false } }
  );
  return count;
};

export const deleteNotification = async (id) => {
  const notification = await Notification.findByPk(id);
  if (!notification) return null;

  await notification.destroy();
  return true;
};

/**
 * Send notification to team leaders of specific departments
 */
export const notifyTeamLeaders = async (
  departments,
  title,
  message,
  type,
  relatedId = null,
  sentBy = "system"
) => {
  try {
    // Find all team leaders in the specified departments
    const teamLeaders = await User.findAll({
      where: { role: "teamleader" },
      include: [
        {
          model: Employee,
          as: "employee",
          where: { department: departments },
        },
      ],
    });

    console.log(`📧 Found ${teamLeaders.length} team leader(s) in departments: ${departments.join(", ")}`);

    // Create notifications for each team leader
    const notifications = await Promise.all(
      teamLeaders.map((leader) =>
        Notification.create({
          user_id: leader.id,
          title,
          message,
          type,
          related_id: relatedId,
          sent_by: sentBy,
          is_read: false,
        })
      )
    );

    console.log(`✅ Created ${notifications.length} notification(s)`);
    return notifications;
  } catch (error) {
    console.error("❌ Error notifying team leaders:", error);
    throw error;
  }
};
