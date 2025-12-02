import axios from "axios";

const API_URL = "http://localhost:5000/api/notifications";

// Get all notifications for a user
export const getUserNotifications = async (userId) => {
  const response = await axios.get(`${API_URL}/user/${userId}`);
  return response.data;
};

// Get unread notifications count
export const getUnreadCount = async (userId) => {
  const response = await axios.get(`${API_URL}/user/${userId}/unread`);
  return response.data.count;
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
  const response = await axios.put(`${API_URL}/${notificationId}/read`);
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async (userId) => {
  const response = await axios.put(`${API_URL}/user/${userId}/read-all`);
  return response.data;
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  const response = await axios.delete(`${API_URL}/${notificationId}`);
  return response.data;
};

// Clear all notifications for a user
export const clearAllNotifications = async (userId) => {
  const response = await axios.delete(`${API_URL}/user/${userId}/clear-all`);
  return response.data;
};
