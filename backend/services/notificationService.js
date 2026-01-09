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

/**
 * Send notification to supervisors of specific departments
 */
export const notifySupervisors = async (
  departments,
  title,
  message,
  type,
  relatedId = null,
  sentBy = "system"
) => {
  try {
    // Find all supervisors in the specified departments
    const supervisors = await User.findAll({
      where: { role: "supervisor" },
      include: [
        {
          model: Employee,
          as: "employee",
          where: { department: departments },
        },
      ],
    });

    console.log(`📧 Found ${supervisors.length} supervisor(s) in departments: ${departments.join(", ")}`);

    // Create notifications for each supervisor
    const notifications = await Promise.all(
      supervisors.map((supervisor) =>
        Notification.create({
          user_id: supervisor.id,
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
    console.error("❌ Error notifying supervisors:", error);
    throw error;
  }
};

/**
 * Send notification to all admins
 */
export const notifyAdmins = async (
  title,
  message,
  type,
  relatedId = null,
  sentBy = "system"
) => {
  try {
    // Find all admin users
    const admins = await User.findAll({
      where: { role: "admin" },
    });

    console.log(`📧 Found ${admins.length} admin(s)`);

    // Create notifications for each admin
    const notifications = await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user_id: admin.id,
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
    console.error("❌ Error notifying admins:", error);
    throw error;
  }
};

/**
 * Send notification to specific employees
 */
export const notifyEmployees = async (
  employeeIds,
  title,
  message,
  type,
  relatedId = null,
  sentBy = "system"
) => {
  try {
    // Find users for the specified employee IDs
    const employees = await User.findAll({
      where: { role: "employee" },
      include: [
        {
          model: Employee,
          as: "employee",
          where: { employee_id: employeeIds },
        },
      ],
    });

    console.log(`📧 Found ${employees.length} employee(s) for IDs: ${employeeIds.join(", ")}`);

    // Create notifications for each employee
    const notifications = await Promise.all(
      employees.map((employee) =>
        Notification.create({
          user_id: employee.id,
          employee_id: employee.employee.employee_id,
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
    console.error("❌ Error notifying employees:", error);
    throw error;
  }
};

/**
 * Send notification to employees in specific departments
 */
export const notifyEmployeesByDepartment = async (
  departments,
  title,
  message,
  type,
  relatedId = null,
  sentBy = "system"
) => {
  try {
    // Find all employees in the specified departments
    const employees = await User.findAll({
      where: { role: "employee" },
      include: [
        {
          model: Employee,
          as: "employee",
          where: { department: departments },
        },
      ],
    });

    console.log(`📧 Found ${employees.length} employee(s) in departments: ${departments.join(", ")}`);

    // Create notifications for each employee
    const notifications = await Promise.all(
      employees.map((employee) =>
        Notification.create({
          user_id: employee.id,
          employee_id: employee.employee.employee_id,
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
    console.error("❌ Error notifying employees by department:", error);
    throw error;
  }
};

/**
 * Send notification to multiple role types
 */
export const notifyMultipleRoles = async (
  roles,
  departments = null,
  title,
  message,
  type,
  relatedId = null,
  sentBy = "system"
) => {
  try {
    const notifications = [];

    for (const role of roles) {
      switch (role) {
        case "teamleader":
          if (departments) {
            const teamLeaderNotifications = await notifyTeamLeaders(
              departments, title, message, type, relatedId, sentBy
            );
            notifications.push(...teamLeaderNotifications);
          }
          break;
        case "supervisor":
          if (departments) {
            const supervisorNotifications = await notifySupervisors(
              departments, title, message, type, relatedId, sentBy
            );
            notifications.push(...supervisorNotifications);
          }
          break;
        case "admin":
          const adminNotifications = await notifyAdmins(
            title, message, type, relatedId, sentBy
          );
          notifications.push(...adminNotifications);
          break;
        case "employee":
          if (departments) {
            const employeeNotifications = await notifyEmployeesByDepartment(
              departments, title, message, type, relatedId, sentBy
            );
            notifications.push(...employeeNotifications);
          }
          break;
      }
    }

    console.log(`✅ Created ${notifications.length} total notification(s) for roles: ${roles.join(", ")}`);
    return notifications;
  } catch (error) {
    console.error("❌ Error notifying multiple roles:", error);
    throw error;
  }
};
