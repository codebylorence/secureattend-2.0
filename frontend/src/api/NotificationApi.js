import api from "./axiosConfig";

// Get all notifications for a user
export const getUserNotifications = async (userId) => {
  const response = await api.get(`/notifications/user/${userId}`);
  return response.data;
};

// Get unread notifications count
export const getUnreadCount = async (userId) => {
  const response = await api.get(`/notifications/user/${userId}/unread`);
  return response.data.count;
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async (userId) => {
  const response = await api.put(`/notifications/user/${userId}/read-all`);
  return response.data;
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

// Clear all notifications for a user
export const clearAllNotifications = async (userId) => {
  const response = await api.delete(`/notifications/user/${userId}/clear-all`);
  return response.data;
};

// Notify admins that a report was generated
export const notifyReportGenerated = async ({ reportType, generatedBy, details }) => {
  try {
    const response = await api.post("/notifications/report-generated", {
      reportType,
      generatedBy,
      details,
    });
    return response.data;
  } catch (err) {
    // Non-critical — don't surface errors to the user
    console.warn("⚠️ Failed to send report notification:", err.message);
  }
};
