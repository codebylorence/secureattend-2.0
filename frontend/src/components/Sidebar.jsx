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
  FaUserTie,
  FaClipboardList,
  FaChartBar,
  FaUserPlus,
  FaBriefcase,
  FaChevronDown,
  FaChevronRight,
  FaUser,
  FaCalendarCheck,
  FaUserFriends,
  FaHome
} from "react-icons/fa";

export default function Sidebar({ role = "admin" }) {
  const location = useLocation();
  const { systemConfig } = useSystemConfig();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isParentActive = (paths) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  // Menu items based on role
  const getMenuItems = () => {
    const baseItems = [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: FaTachometerAlt,
        path: role === "admin" ? "/admin/dashboard" : 
              role === "supervisor" ? "/admin/dashboard" :
              role === "teamleader" ? "/team/dashboard" : "/employee/dashboard"
      }
    ];

    if (role === "admin" || role === "supervisor") {
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
            className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors ${
              hasActiveChild
                ? "bg-white/20 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </div>
            {isExpanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
          </button>
          
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map(subItem => (
                <Link
                  key={subItem.key}
                  to={subItem.path}
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
          isActive(item.path)
            ? "bg-white/20 text-white font-medium"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        <item.icon size={18} />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  const getRoleDisplayName = () => {
    switch (role) {
      case "admin": return "Administrator";
      case "supervisor": return "Supervisor";
      case "teamleader": return "Team Leader";
      case "employee": return "Employee";
      default: return "User";
    }
  };

  return (
    <div 
      className="fixed left-0 top-0 h-full w-60 shadow-lg z-40"
      style={{ backgroundColor: systemConfig.primaryColor || '#1E3A8A' }}
    >
      {/* Header */}
      <div className="p-6 mt-11 border-b border-white/20">
        <div className="flex items-center gap-3">

        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-1 overflow-y-auto h-full pb-20">
        {menuItems.map(renderMenuItem)}
      </nav>
    </div>
  );
}