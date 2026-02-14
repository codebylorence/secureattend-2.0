import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { IoNotifications } from "react-icons/io5";
import { FaTimes } from "react-icons/fa";
import { MdCheckCircle, MdDelete, MdEdit } from "react-icons/md";
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead, clearAllNotifications } from "../api/NotificationApi";
import ConfirmationModal from "./ConfirmationModal";

export default function Navbar({ role }) {
  const { systemConfig } = useSystemConfig();
  const navigate = useNavigate();
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
    if ((role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee" || role === "warehouseadmin") && userId) {
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
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
        await fetchNotifications();
        await fetchUnreadCount();
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    
    // Handle navigation based on notification title
    if (notification.title === "New Registration Request") {
      // Close notification panel
      setShowNotifications(false);
      // Navigate to registration management page
      navigate("/admin/registrations");
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

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  return (
    <>
      {/* Restored the bg-primary class while keeping the layout fixes */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-primary h-16 px-4 sm:px-6 lg:px-8 flex justify-between items-center shadow-md font-sans">
        
        {/* Left side - Reserved for mobile menu toggle or branding if needed */}
        <div></div>

        {/* Right side - Notifications */}
        <div className="flex items-center gap-4">
          {(role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee" || role === "warehouseadmin") && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    fetchNotifications();
                  }
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
              >
                <IoNotifications size={22} className="text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-bold px-1.5 shadow-sm border-2 border-primary animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Overlay (Mobile mostly) */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-transparent z-[55]"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Notifications Dropdown Panel */}
      {showNotifications && (role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee" || role === "warehouseadmin") && (
        <div 
          ref={notificationRef}
          className="fixed right-4 top-[72px] sm:right-6 lg:right-8 bg-white shadow-2xl rounded-2xl w-[90vw] sm:w-96 max-w-[400px] overflow-hidden z-[60] border border-gray-100 font-sans transform origin-top-right transition-all"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-gray-100 p-4 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-base">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-full p-1.5 transition-colors focus:outline-none"
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Action buttons */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex justify-between items-center">
              {unreadCount > 0 ? (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] uppercase tracking-wider text-blue-600 hover:text-blue-800 font-bold transition-colors"
                >
                  Mark all as read
                </button>
              ) : <div></div> /* Empty div to push clear button to right */}
              <button
                onClick={handleClearAll}
                className="text-[11px] uppercase tracking-wider text-rose-500 hover:text-rose-700 font-bold transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px] custom-scrollbar bg-white">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <IoNotifications size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium">You're all caught up!</p>
                <p className="text-gray-400 text-xs mt-1">No new notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                // Parse message to add icons
                const renderMessage = (message, title) => {
                  const lines = message.split('\n');
                  
                  // For "Schedule Modified" notifications, show edit icon
                  if (title === "Schedule Modified") {
                    return (
                      <div className="mt-1.5 bg-slate-50 p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-blue-600 mb-1.5">
                          <MdEdit size={14} />
                          <span>Changes Made:</span>
                        </div>
                        <div className="space-y-1">
                          {lines.map((line, idx) => (
                            line.trim() && (
                              <div key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-blue-400 mt-0.5">•</span>
                                <span>{line}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  // For other notifications (ADDED/REMOVED)
                  return lines.map((line, idx) => {
                    if (line.startsWith('ADDED:')) {
                      return (
                        <div key={idx} className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-emerald-600 mt-2">
                          <MdCheckCircle size={14} />
                          <span>Added</span>
                        </div>
                      );
                    } else if (line.startsWith('REMOVED:')) {
                      return (
                        <div key={idx} className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-rose-600 mt-2">
                          <MdDelete size={14} />
                          <span>Removed</span>
                        </div>
                      );
                    } else if (line.trim()) {
                      return (
                        <div key={idx} className="text-xs text-gray-600 ml-5 mt-0.5">
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
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      !notif.is_read ? "bg-blue-50/40 hover:bg-blue-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Notification Dot indicator */}
                      <div className="pt-1.5">
                        <div className={`w-2 h-2 rounded-full ${!notif.is_read ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]' : 'bg-transparent'}`}></div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p className={`text-sm font-bold truncate ${!notif.is_read ? "text-blue-900" : "text-gray-800"}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-gray-400 whitespace-nowrap font-medium mt-0.5">
                            {formatTimeAgo(notif.createdAt)}
                          </p>
                        </div>
                        
                        <div className="mt-1">
                          {renderMessage(notif.message, notif.title)}
                        </div>
                      </div>
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