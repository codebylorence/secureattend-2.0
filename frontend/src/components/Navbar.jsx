import { useState, useEffect } from "react";
import { IoNotifications } from "react-icons/io5";
import { FaUserCircle, FaSignOutAlt, FaUser, FaTimes } from "react-icons/fa";
import { MdCheckCircle, MdDelete, MdEdit } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead, clearAllNotifications } from "../api/NotificationApi";

export default function Navbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();

  const username = localStorage.getItem("username") || "Admin";
  const role = localStorage.getItem("role") || "admin";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;

  useEffect(() => {
    setPhoto(user.employee?.photo);
    
    // Fetch notifications for all roles that should receive notifications
    if ((role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee") && userId) {
      fetchNotifications();
      fetchUnreadCount();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId]);

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
    if (!window.confirm("Clear all notifications? This action cannot be undone.")) {
      return;
    }
    
    try {
      await clearAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      alert("Failed to clear notifications. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getProfileRoute = () => {
    if (role === "admin") return "/admin/profile";
    if (role === "supervisor") return "/supervisor/profile";
    if (role === "teamleader") return "/team/profile";
    return "/employee/profile";
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
    <div className="bg-[#1E3A8A] h-16 px-6 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
      {/* Title */}
      <h1 className="text-xl text-white font-bold">{systemConfig.systemName}</h1>

      {/* Right Side */}
      <div className="flex items-center gap-6 relative">
        {/* Notification Icon - Show for all roles that receive notifications */}
        {(role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee") && (
          <div className="relative">
            <IoNotifications 
              size={25} 
              color="white" 
              className="cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
                if (!showNotifications) {
                  fetchNotifications();
                }
              }}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        )}

        {/* Profile Section */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => {
            setShowProfileMenu(!showProfileMenu);
            setShowNotifications(false);
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
              <FaUser className="text-gray-600" size={20} />
            </div>
          )}
          <div className="text-white text-right">
            <p className="text-sm font-medium leading-tight">{username}</p>
            {user.employee?.position && (
              <p className="text-xs text-blue-200 leading-tight">{user.employee.position}</p>
            )}
          </div>
        </div>

        {/* Notifications Dropdown */}
        {showNotifications && (role === "teamleader" || role === "supervisor" || role === "admin" || role === "employee") && (
          <div className="absolute right-0 top-14 bg-white shadow-xl rounded-lg w-96 max-h-[500px] overflow-hidden z-50">
            {/* Header */}
            <div className="bg-[#1E3A8A] text-white p-4 flex justify-between items-center">
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

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute right-0 top-14 bg-white shadow-lg rounded-lg w-52 p-4 z-50">
            {/* Profile Info */}
            <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
              {photo ? (
                <img
                  src={photo}
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <FaUser className="text-gray-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {username}
                </p>
                {user.employee?.position ? (
                  <p className="text-xs text-blue-600">{user.employee.position}</p>
                ) : (
                  <p className="text-xs text-gray-500 capitalize">{role}</p>
                )}
              </div>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => {
                setShowProfileMenu(false);
                navigate(getProfileRoute());
              }}
              className="flex items-center gap-2 text-gray-700 hover:text-[#1E3A8A] text-sm mb-3 w-full text-left"
            >
              <FaUserCircle /> View Profile
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm w-full text-left"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
