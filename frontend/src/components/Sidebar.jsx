import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import {
  FaTachometerAlt,
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaBuilding,
  FaCog,
  FaChartBar,
  FaUserPlus,
  FaBriefcase,
  FaChevronDown,
  FaChevronRight,
  FaUser,
  FaCalendarCheck,
  FaBars,
  FaTimes,
  FaUserCircle,
  FaSignOutAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ role = "admin", isCollapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Get user data
  const username = localStorage.getItem("username") || "Admin";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const photo = user.employee?.photo;

  const toggleMenu = (menuKey) => {
    if (isCollapsed) return; // Don't expand submenus when sidebar is collapsed
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
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
    if (role === "superadmin") return "/superadmin/profile";
    if (role === "supervisor") return "/supervisor/profile";
    if (role === "teamleader") return "/team/profile";
    return "/employee/profile";
  };

  // Menu items based on role
  const getMenuItems = () => {
    const baseItems = [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: FaTachometerAlt,
        path: role === "admin" ? "/admin/dashboard" : 
              role === "superadmin" ? "/admin/dashboard" :
              role === "supervisor" ? "/admin/dashboard" :
              role === "teamleader" ? "/team/dashboard" : "/employee/dashboard"
      }
    ];

    if (role === "admin" || role === "supervisor" || role === "superadmin") {
      return [
        ...baseItems,
        {
          key: "employees",
          label: "Employees",
          icon: FaUsers,
          path: "/admin/employees"
        },
        {
          key: "schedule",
          label: "Schedule Management",
          icon: FaCalendarAlt,
          submenu: [
            {
              key: "manage-schedule",
              label: "Manage Schedule",
              path: "/admin/schedule"
            },
            {
              key: "view-schedules",
              label: "View Schedules",
              path: "/admin/view-schedules"
            }
          ]
        },
        {
          key: "attendance",
          label: "Attendance",
          icon: FaClock,
          path: "/admin/attendance"
        },
        {
          key: "departments",
          label: "Departments",
          icon: FaBuilding,
          path: "/admin/departments"
        },
        ...(role === "admin" ? [
          {
            key: "reports",
            label: "Reports",
            icon: FaChartBar,
            path: "/admin/attendance-reports"
          },
          {
            key: "positions",
            label: "Positions",
            icon: FaBriefcase,
            path: "/admin/positions"
          },
          {
            key: "registrations",
            label: "Registrations",
            icon: FaUserPlus,
            path: "/admin/registrations"
          },
          {
            key: "settings",
            label: "Settings",
            icon: FaCog,
            path: "/admin/settings"
          }
        ] : []),
        ...(role === "supervisor" ? [
          {
            key: "personal",
            label: "Personal",
            icon: FaUser,
            submenu: [
              {
                key: "my-dashboard",
                label: "My Dashboard",
                path: "/supervisor/mydashboard"
              },
              {
                key: "my-attendance",
                label: "My Attendance",
                path: "/supervisor/myattendance"
              },
              {
                key: "my-schedule",
                label: "My Schedule",
                path: "/supervisor/myschedule"
              }
            ]
          }
        ] : [])
      ];
    }

    if (role === "teamleader") {
      return [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: FaTachometerAlt,
          path: "/team/dashboard"
        },
        {
          key: "team-schedule",
          label: "Team Schedule",
          icon: FaCalendarCheck,
          path: "/team/schedule"
        },
        {
          key: "personal",
          label: "Personal",
          icon: FaUser,
          submenu: [
            {
              key: "my-dashboard",
              label: "My Dashboard",
              path: "/team/mydashboard"
            },
            {
              key: "my-attendance",
              label: "My Attendance",
              path: "/team/myattendance"
            },
            {
              key: "my-schedule",
              label: "My Schedule",
              path: "/team/myschedule"
            }
          ]
        }
      ];
    }

    if (role === "employee") {
      return [
        ...baseItems,
        {
          key: "my-attendance",
          label: "My Attendance",
          icon: FaClock,
          path: "/employee/myattendance"
        },
        {
          key: "my-schedule",
          label: "My Schedule",
          icon: FaCalendarAlt,
          path: "/employee/schedule"
        }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const renderMenuItem = (item) => {
    if (item.submenu) {
      const isExpanded = expandedMenus[item.key];
      const hasActiveChild = item.submenu.some(subItem => isActive(subItem.path));
      
      return (
        <div key={item.key} className="mb-1">
          <button
            onClick={() => toggleMenu(item.key)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 text-left rounded-lg transition-colors ${
              hasActiveChild
                ? "bg-white/20 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </div>
            {!isCollapsed && (isExpanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />)}
          </button>
          
          {isExpanded && !isCollapsed && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map(subItem => (
                <Link
                  key={subItem.key}
                  to={subItem.path}
                  onClick={closeMobile}
                  className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive(subItem.path)
                      ? "bg-white/20 text-white font-medium"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.key}
        to={item.path}
        onClick={closeMobile}
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors mb-1 ${
          isActive(item.path)
            ? "bg-white/20 text-white font-medium"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
        title={isCollapsed ? item.label : ''}
      >
        <item.icon size={18} />
        {!isCollapsed && <span className="font-medium">{item.label}</span>}
      </Link>
    );
  };

  const getRoleDisplayName = () => {
    switch (role) {
      case "admin": return "Administrator";
      case "superadmin": return "Super Administrator";
      case "supervisor": return "Supervisor";
      case "teamleader": return "Team Leader";
      case "employee": return "Employee";
      default: return "User";
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isMobileOpen ? <FaTimes size={20} className="text-gray-700" /> : <FaBars size={20} className="text-gray-700" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full shadow-lg z-50 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-60'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: systemConfig.primaryColor || '#1E3A8A' }}
      >
        {/* Header */}
        <div className={`border-b border-white/20 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {!isCollapsed ? (
            // Expanded header with full profile
            <div className="space-y-4">
              {/* System Logo and Name */}
              <div className="text-center">
                {systemConfig.logo ? (
                  <div className="mb-2">
                    <img 
                      src={systemConfig.logo} 
                      alt={systemConfig.systemName || "System Logo"} 
                      className="max-h-8 max-w-32 object-contain mx-auto"
                    />
                  </div>
                ) : null}
                <span className="text-white font-bold text-lg">
                  {systemConfig.systemName || 'SecureAttend'}
                </span>
              </div>
              
              {/* User Profile Section - Clickable */}
              <button
                onClick={() => {
                  navigate(getProfileRoute());
                  closeMobile();
                }}
                className="flex items-center gap-3 bg-white/10 rounded-lg p-3 w-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile"
                    className="w-12 h-12 rounded-full border-2 border-white object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-600" size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-semibold text-sm truncate">{username}</p>
                  <p className="text-blue-200 text-xs truncate">{getRoleDisplayName()}</p>
                </div>
              </button>

            </div>
          ) : (
            // Collapsed header with logo and minimal profile
            <div className="flex flex-col items-center space-y-2">
              {/* Logo in collapsed state */}
              {systemConfig.logo && (
                <div className="mb-1">
                  <img 
                    src={systemConfig.logo} 
                    alt={systemConfig.systemName || "System Logo"} 
                    className="max-h-6 max-w-12 object-contain"
                  />
                </div>
              )}
              
              {/* Minimal profile - Clickable */}
              <button
                onClick={() => {
                  navigate(getProfileRoute());
                  closeMobile();
                }}
                className="hover:bg-white/10 rounded-lg p-2 transition-colors cursor-pointer"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile"
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                    <FaUser className="text-gray-600" size={16} />
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Toggle Button (Desktop) */}
        <button
          onClick={onToggle}
          className="hidden lg:block absolute -right-3 top-20 bg-white rounded-full p-1.5 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {isCollapsed ? <FaChevronRight size={12} /> : <FaChevronDown size={12} className="rotate-90" />}
        </button>

        {/* Navigation Menu */}
        <nav className={`flex-1 overflow-y-auto p-4 space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
          {menuItems.map(renderMenuItem)}
        </nav>

        {/* Logout Button at Bottom */}
        <div className={`border-t border-white/20 flex-shrink-0 p-4 ${isCollapsed ? 'px-2' : ''}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg bg-white/10 hover:bg-red-500/20 transition-colors text-white`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <FaSignOutAlt size={18} />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>

      </div>
    </>
  );
}