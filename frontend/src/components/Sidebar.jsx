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
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-[70] animate-in fade-in slide-in-from-left-2 duration-200">
      {text}
      {/* Tiny arrow pointing left */}
      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
    </div>
  );
};

export default function Sidebar({ role = "admin", isCollapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Get user data
  const username = localStorage.getItem("username") || "Admin";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const photo = user.employee?.photo;

  const toggleMenu = (menuKey) => {
    if (isCollapsed) return;
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
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      const currentPath = location.pathname;
      const currentSearch = location.search;
      
      if (currentPath === pathname) {
        const queryParams = new URLSearchParams(query);
        const currentParams = new URLSearchParams(currentSearch);
        
        for (const [key, value] of queryParams) {
          if (currentParams.get(key) !== value) {
            return false;
          }
        }
        return true;
      }
      return false;
    }
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
    if (role === "warehouseadmin") return "/warehouseadmin/profile";
    if (role === "supervisor") return "/supervisor/profile";
    if (role === "teamleader") return "/team/profile";
    return "/employee/profile";
  };

  const getMenuItems = () => {
    const baseItems = [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: FaTachometerAlt,
        path: role === "admin" ? "/admin/dashboard" : 
              role === "warehouseadmin" ? "/warehouseadmin/dashboard" :
              role === "supervisor" ? "/admin/dashboard" :
              role === "teamleader" ? "/team/dashboard" : "/employee/dashboard"
      }
    ];

    if (role === "admin" || role === "supervisor") {
      return [
        ...baseItems,
        { key: "employees", label: "Employees", icon: FaUsers, path: "/admin/employees" },
        { key: "schedule", label: "Schedule Management", icon: FaCalendarAlt, path: "/admin/schedule" },
        { key: "attendance", label: "Attendance", icon: FaClock, path: "/admin/attendance" },
        { key: "departments", label: "Departments", icon: FaBuilding, path: "/admin/departments" },
        ...(role === "admin" || role === "supervisor" ? [{ key: "reports", label: "Reports", icon: FaChartBar, path: "/admin/attendance-reports" }] : []),
        ...(role === "admin" ? [
          { key: "positions", label: "Positions", icon: FaBriefcase, path: "/admin/positions" },
          { key: "registrations", label: "Registrations", icon: FaUserPlus, path: "/admin/registrations" },
          { key: "settings", label: "Settings", icon: FaCog, path: "/admin/settings" }
        ] : []),
        ...(role === "supervisor" ? [
          {
            key: "personal", label: "Personal", icon: FaUser,
            submenu: [
              { key: "my-dashboard", label: "My Dashboard", path: "/supervisor/mydashboard" },
              { key: "my-attendance", label: "My Attendance", path: "/supervisor/myattendance" },
              { key: "my-schedule", label: "My Schedule", path: "/supervisor/myschedule" }
            ]
          }
        ] : [])
      ];
    }

    if (role === "warehouseadmin") {
      return [
        ...baseItems,
        { key: "attendance", label: "Attendance", icon: FaClock, path: "/warehouseadmin/attendance" },
        { key: "reports", label: "Reports", icon: FaChartBar, path: "/warehouseadmin/attendance-reports" },
        {
          key: "personal", label: "Personal", icon: FaUser,
          submenu: [
            { key: "my-dashboard", label: "My Dashboard", path: "/warehouseadmin/mydashboard" },
            { key: "my-attendance", label: "My Attendance", path: "/warehouseadmin/myattendance" },
            { key: "my-schedule", label: "My Schedule", path: "/warehouseadmin/myschedule" }
          ]
        }
      ];
    }

    if (role === "teamleader") {
      return [
        { key: "dashboard", label: "Dashboard", icon: FaTachometerAlt, path: "/team/dashboard" },
        { key: "team-schedule", label: "Team Schedule", icon: FaCalendarCheck, path: "/team/schedule" },
        {
          key: "personal", label: "Personal", icon: FaUser,
          submenu: [
            { key: "my-dashboard", label: "My Dashboard", path: "/team/mydashboard" },
            { key: "my-attendance", label: "My Attendance", path: "/team/myattendance" },
            { key: "my-schedule", label: "My Schedule", path: "/team/myschedule" }
          ]
        }
      ];
    }

    if (role === "employee") {
      return [
        ...baseItems,
        { key: "my-attendance", label: "My Attendance", icon: FaClock, path: "/employee/myattendance" },
        { key: "my-schedule", label: "My Schedule", icon: FaCalendarAlt, path: "/employee/schedule" }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const getRoleDisplayName = () => {
    switch (role) {
      case "admin": return "HR Administrator";
      case "warehouseadmin": return "Warehouse Administrator";
      case "supervisor": return "Supervisor";
      case "teamleader": return "Team Leader";
      case "employee": return "Employee";
      default: return "User";
    }
  };

  const getItemClass = (active) => `
    relative flex items-center px-4 py-3 rounded-xl transition-all duration-200 group mb-1.5
    ${isCollapsed ? 'justify-center' : 'justify-between'}
    ${active 
      ? "bg-white/10 text-white shadow-sm backdrop-blur-sm font-semibold" 
      : "text-blue-100/80 hover:bg-white/5 hover:text-white font-medium"
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
            title=""
          >
            {hasActiveChild && <div className="absolute left-0 h-7 w-1 bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>}

            <div className="flex items-center gap-3.5">
              <item.icon size={18} className={hasActiveChild ? "text-blue-400" : "text-blue-200/70 group-hover:text-blue-300 transition-colors"} />
              {!isCollapsed && <span className="text-sm tracking-wide">{item.label}</span>}
            </div>
            
            {!isCollapsed && (
              <div className={`transition-transform p-1 duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <FaChevronDown size={10} className={hasActiveChild ? "text-white" : "text-blue-200/70"} />
              </div>
            )}
            <Tooltip text={item.label} show={isCollapsed && hoveredItem === item.key} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded && !isCollapsed ? 'max-h-96 opacity-100 mt-1 mb-3' : 'max-h-0 opacity-0'}`}>
            <div className="relative ml-6 pl-3 border-l border-white/10 space-y-1 mt-1">
              {item.submenu.map(subItem => {
                const isSubActive = isActive(subItem.path);
                return (
                  <Link
                    key={subItem.key}
                    to={subItem.path}
                    onClick={closeMobile}
                    className={`block px-4 py-2.5 rounded-lg text-xs tracking-wide transition-all duration-200 ${
                      isSubActive
                        ? "bg-white/10 text-white font-bold shadow-sm"
                        : "text-blue-200/70 hover:text-white hover:bg-white/5 font-medium"
                    }`}
                  >
                    {subItem.label}
                  </Link>
                );
              })}
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
        {active && <div className="absolute left-0 h-7 w-1 bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>}

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3.5'}`}>
          <item.icon size={18} className={active ? "text-blue-400" : "text-blue-200/70 group-hover:text-blue-300 transition-colors"} />
          {!isCollapsed && <span className="text-sm tracking-wide">{item.label}</span>}
        </div>
        <Tooltip text={item.label} show={isCollapsed && hoveredItem === item.key} />
      </Link>
    );
  };

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  return (
    <>
      {/* Mobile Menu Button - ONLY shows when sidebar is closed */}
      {!isMobileOpen && (
        <button
          onClick={toggleMobile}
          className="lg:hidden fixed top-3 left-4 z-[45] p-2.5 rounded-xl bg-white shadow-md border border-gray-200 text-blue-900 hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <FaBars size={18} />
        </button>
      )}

      {/* Mobile Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed left-0 top-0 h-full shadow-2xl z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col font-sans border-r border-white/5 ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ 
          background: `linear-gradient(160deg, ${systemConfig.primaryColor || '#1E3A8A'} 0%, #0F172A 100%)` 
        }}
      >
        
        {/* Header Section */}
        <div className={`relative flex flex-row items-center justify-between shrink-0 ${isCollapsed ? 'h-20 px-2' : 'h-24 px-5'} mt-2`}>
          
          <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'} transition-all`}>
            {systemConfig.logo && (
              <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-sm border border-white/10 shadow-sm flex-shrink-0">
                <img 
                  src={systemConfig.logo} 
                  alt="Logo" 
                  className={`${isCollapsed ? 'h-8' : 'h-9'} object-contain drop-shadow-md transition-all`}
                />
              </div>
            )}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-white font-extrabold text-[16px] tracking-wide whitespace-nowrap">
                  {systemConfig.systemName || 'SecureAttend'}
                </span>
                <span className="text-blue-300 text-[9px] uppercase tracking-widest font-bold opacity-80 mt-0.5">Workspace</span>
              </div>
            )}
          </div>

          {/* New Mobile Close Button - Inside the sidebar header */}
          <button
            onClick={closeMobile}
            className="lg:hidden text-white/70 hover:text-white p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors ml-2 focus:outline-none flex-shrink-0"
          >
            <FaTimes size={16} />
          </button>

          {/* Desktop Collapse Toggle - Slightly adjusted for perfection */}
          <button
            onClick={onToggle}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-6 h-6 bg-white text-blue-700 rounded-full shadow-md hover:scale-110 hover:bg-blue-50 transition-all z-50 border border-gray-200 focus:outline-none"
          >
            {isCollapsed ? <FaChevronRight size={10} className="ml-0.5" /> : <FaChevronDown size={10} className="rotate-90" />}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar scrollbar-hide mt-2">
          
          {/* User Profile Card */}
          <div 
            onClick={() => { navigate(getProfileRoute()); closeMobile(); }}
            className={`mb-8 cursor-pointer group transition-all duration-300 ${
              isCollapsed 
              ? 'flex justify-center' 
              : 'bg-white/5 rounded-2xl p-3 flex items-center gap-3.5 hover:bg-white/10 border border-white/5 shadow-sm backdrop-blur-sm'
            }`}
          >
            <div className="relative shrink-0">
              {photo ? (
                <img src={photo} alt="Profile" className="w-11 h-11 rounded-full border-2 border-white/20 object-cover shadow-sm group-hover:border-blue-300/50 transition-colors" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-blue-500/20 border-2 border-white/20 flex items-center justify-center text-blue-200 shadow-sm group-hover:border-blue-300/50 transition-colors">
                  <FaUserCircle size={26} />
                </div>
              )}
              {/* Online Dot */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#1E3A8A] rounded-full shadow-sm"></div>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate group-hover:text-blue-100 transition-colors">{username}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-blue-300/80 text-[10px] tracking-wider uppercase font-semibold truncate bg-black/20 px-2 py-0.5 rounded-md w-max">{getRoleDisplayName()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-1 pb-4">
            {menuItems.map(renderMenuItem)}
          </div>
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 shrink-0 bg-gradient-to-t from-black/20 to-transparent">
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all duration-200 relative group border border-transparent hover:border-rose-500/30`}
          >
            <FaSignOutAlt size={18} className="group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="font-bold text-sm tracking-wide">Sign Out</span>}
            
            <Tooltip text="Sign Out" show={isCollapsed && hoveredItem === 'logout'} />
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;  
            scrollbar-width: none;  
        }
      `}</style>
    </>
  );
}