import { useState, useEffect, useRef } from "react";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { IoNotifications } from "react-icons/io5";
import { FaTimes } from "react-icons/fa";
import { MdCheckCircle, MdDelete, MdEdit } from "react-icons/md";
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead, clearAllNotifications } from "../api/NotificationApi";
import ConfirmationModal from "./ConfirmationModal";

export default function Navbar({ role }) {
  const { systemConfig } = useSystemConfig();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const notificationRef = useRef(null);

  // Get user data
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;

  useEffect(() => {
    // Fetch notifications for all roles that should receive notifications
    if ((role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee") && userId) {
      fetchUnreadCount();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [role, userId]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  // Notification functions
  const fetchNotifications = async () => {
    try {
      const data = await getUserNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
        await fetchNotifications();
        await fetchUnreadCount();
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(userId);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleClearAll = async () => {
    setShowClearModal(true);
  };

  const confirmClearAll = async () => {
    setClearLoading(true);
    try {
      await clearAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
      setShowClearModal(false);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      alert("Failed to clear notifications. Please try again.");
    } finally {
      setClearLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <>
      <div className="bg-primary h-16 px-6 flex justify-end items-center fixed top-0 left-0 right-0 z-40">
        {/* Right side - Notifications */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          {(role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee") && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    fetchNotifications();
                  }
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <IoNotifications size={20} className="text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Overlay */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-transparent z-[55]"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee") && (
        <div 
          ref={notificationRef}
          className="fixed right-4 top-20 bg-white shadow-xl rounded-lg w-96 max-w-[calc(100vw-2rem)] max-h-[500px] overflow-hidden z-[60]"
        >
          {/* Header */}
          <div className="bg-primary text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="hover:bg-white/20 rounded p-1"
            >
              <FaTimes />
            </button>
          </div>

          {/* Action buttons */}
          {notifications.length > 0 && (
            <div className="p-2 border-b border-gray-200 flex justify-between items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-sm text-red-600 hover:text-red-800 font-medium ml-auto"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <IoNotifications size={48} className="mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                // Parse message to add icons
                const renderMessage = (message, title) => {
                  const lines = message.split('\n');
                  
                  // For "Schedule Modified" notifications, show edit icon
                  if (title === "Schedule Modified") {
                    return (
                      <div className="mt-1">
                        <div className="flex items-center gap-1 font-medium text-blue-700 mb-1">
                          <MdEdit size={16} />
                          <span>Changes:</span>
                        </div>
                        {lines.map((line, idx) => (
                          line.trim() && (
                            <div key={idx} className="text-sm text-gray-700 ml-5">
                              • {line}
                            </div>
                          )
                        ))}
                      </div>
                    );
                  }
                  
                  // For other notifications (ADDED/REMOVED)
                  return lines.map((line, idx) => {
                    if (line.startsWith('ADDED:')) {
                      return (
                        <div key={idx} className="flex items-center gap-1 font-medium text-green-700 mt-2">
                          <MdCheckCircle size={16} />
                          <span>Added</span>
                        </div>
                      );
                    } else if (line.startsWith('REMOVED:')) {
                      return (
                        <div key={idx} className="flex items-center gap-1 font-medium text-red-700 mt-2">
                          <MdDelete size={16} />
                          <span>Removed</span>
                        </div>
                      );
                    } else if (line.trim()) {
                      return (
                        <div key={idx} className="text-sm text-gray-700 ml-5">
                          {line}
                        </div>
                      );
                    }
                    return null;
                  });
                };

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notif.is_read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${!notif.is_read ? "text-blue-900" : "text-gray-800"}`}>
                          {notif.title}
                        </p>
                        <div className="mt-1">
                          {renderMessage(notif.message, notif.title)}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTimeAgo(notif.createdAt)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Clear All Notifications Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={confirmClearAll}
        title="Clear All Notifications"
        message="Are you sure you want to clear all notifications? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        type="warning"
        loading={clearLoading}
        itemDetails={`${notifications.length} notification${notifications.length !== 1 ? 's' : ''} will be permanently deleted`}
      />
    </>
  );
}
