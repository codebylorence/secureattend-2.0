import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  FaSignOutAlt,
  FaUserCircle
} from "react-icons/fa";

// --- UI Helper: Custom Tooltip for Collapsed State ---
const Tooltip = ({ text, show }) => {
  if (!show) return null;
  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap z-50 animate-in fade-in slide-in-from-left-2 duration-200">
      {text}
      {/* Tiny arrow pointing left */}
      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
    </div>
  );
};

export default function Sidebar({ role = "admin", isCollapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null); // Used for tooltips

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
              key: "zone-schedule",
              label: "Zone-Based Scheduling",
              path: "/admin/schedule"
            },
            {
              key: "role-schedule", 
              label: "Role-Based Scheduling",
              path: "/admin/role-schedule"
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
        ...(role === "admin" || role === "supervisor" ? [
          {
            key: "reports",
            label: "Reports",
            icon: FaChartBar,
            path: "/admin/attendance-reports"
          }
        ] : []),
        ...(role === "admin" ? [
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

  // --- Helper class for menu items ---
  const getItemClass = (active) => `
    relative flex items-center px-4 py-3 rounded-xl transition-all duration-200 group mb-1
    ${isCollapsed ? 'justify-center' : 'justify-between'}
    ${active 
      ? "bg-white/20 text-white shadow-inner backdrop-blur-sm" 
      : "text-blue-100 hover:bg-white/10 hover:text-white"
    }
  `;

  const renderMenuItem = (item) => {
    if (item.submenu) {
      const isExpanded = expandedMenus[item.key];
      const hasActiveChild = item.submenu.some(subItem => isActive(subItem.path));
      
      return (
        <div key={item.key} className="relative">
          <button
            onClick={() => toggleMenu(item.key)}
            onMouseEnter={() => setHoveredItem(item.key)}
            onMouseLeave={() => setHoveredItem(null)}
            className={getItemClass(hasActiveChild)}
            title="" // Disable default tooltip
          >
            {/* Active Accent Bar */}
            {hasActiveChild && <div className="absolute left-0 h-8 w-1 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>}

            <div className="flex items-center gap-3">
              <item.icon size={20} className={hasActiveChild ? "text-white" : "text-blue-200 group-hover:text-white transition-colors"} />
              {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
            </div>
            
            {!isCollapsed && (
              <div className={`transition-transform p-2 duration-300 ${isExpanded ? 'rotate-180 pl-2' : ''}`}>
                <FaChevronDown size={12} />
              </div>
            )}

            {/* Floating Tooltip (Collapsed only) */}
            <Tooltip text={item.label} show={isCollapsed && hoveredItem === item.key} />
          </button>
          
          {/* Smooth Submenu Expansion */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded && !isCollapsed ? 'max-h-96 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-black/20 rounded-xl py-2 ml-3 mr-1 space-y-1">
              {item.submenu.map(subItem => (
                <Link
                  key={subItem.key}
                  to={subItem.path}
                  onClick={closeMobile}
                  className={`block px-4 py-2 mx-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive(subItem.path)
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-blue-200 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const active = isActive(item.path);

    return (
      <Link
        key={item.key}
        to={item.path}
        onClick={closeMobile}
        onMouseEnter={() => setHoveredItem(item.key)}
        onMouseLeave={() => setHoveredItem(null)}
        className={getItemClass(active)}
        title=""
      >
        {/* Active Accent Bar */}
        {active && <div className="absolute left-0 h-8 w-1 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>}

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <item.icon size={20} className={active ? "text-white" : "text-blue-200 group-hover:text-white transition-colors"} />
          {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
        </div>

        {/* Floating Tooltip (Collapsed only) */}
        <Tooltip text={item.label} show={isCollapsed && hoveredItem === item.key} />
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
      >
        {isMobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed left-0 top-0 h-full shadow-2xl z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col font-sans ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ 
          // Gradient background for depth
          background: `linear-gradient(160deg, ${systemConfig.primaryColor || '#1E3A8A'} 0%, #0F172A 100%)` 
        }}
      >
        
        {/* Header Section */}
        <div className={`relative flex flex-col justify-center border-b border-white/10 shrink-0 ${isCollapsed ? 'h-20 px-2 ' : 'h-24 px-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all`}>
            {systemConfig.logo && (
              <img 
                src={systemConfig.logo} 
                alt="Logo" 
                className={`${isCollapsed ? 'h-10' : 'h-10'} object-contain drop-shadow-md transition-all`}
              />
            )}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-white font-bold text-lg tracking-wide whitespace-nowrap">
                  {systemConfig.systemName || 'SecureAttend'}
                </span>
                <span className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Workspace</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggle}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-6 h-6 bg-white text-blue-900 rounded-full shadow-md hover:scale-110 hover:bg-blue-50 transition-all z-50 border border-gray-100"
          >
            {isCollapsed ? <FaChevronRight size={10} /> : <FaChevronDown size={10} className="rotate-90" />}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        {/* Added 'scrollbar-hide' logic via style tag at bottom */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar scrollbar-hide">
          
          {/* User Profile Card (Inside nav flow) */}
          <div 
            onClick={() => { navigate(getProfileRoute()); closeMobile(); }}
            className={`mb-6 cursor-pointer group ${
              isCollapsed 
              ? 'flex justify-center' 
              : 'bg-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/20 transition-all border border-white/5'
            }`}
          >
            <div className="relative shrink-0">
              {photo ? (
                <img src={photo} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white/30 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500/30 border-2 border-white/30 flex items-center justify-center text-white">
                  <FaUserCircle size={24} />
                </div>
              )}
              {/* Online Dot */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#1E3A8A] rounded-full"></div>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate group-hover:text-blue-50 transition-colors">{username}</p>
                <p className="text-blue-200 text-xs truncate capitalize opacity-80">{getRoleDisplayName()}</p>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map(renderMenuItem)}
          </div>
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-white/10 bg-black/10 shrink-0">
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-red-100 hover:bg-red-500/20 hover:text-white hover:shadow-lg transition-all duration-200 relative group`}
          >
            <FaSignOutAlt size={20} className="group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
            
            {/* Tooltip for Logout */}
            <Tooltip text="Sign Out" show={isCollapsed && hoveredItem === 'logout'} />
          </button>
        </div>
      </div>

      {/* Inline Styles for hiding scrollbar visually but keeping functionality */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </>
  );
}