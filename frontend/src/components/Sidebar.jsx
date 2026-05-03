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
  FaUserCircle,
  FaArchive,
  FaUmbrellaBeach,
  FaClipboardList,
  FaLayerGroup,
  FaIdBadge,
} from "react-icons/fa";

// --- UI Helper: Custom Tooltip for Collapsed State ---
const Tooltip = ({ text, show }) => {
  if (!show) return null;
  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-[70] animate-in fade-in slide-in-from-left-2 duration-200 border border-white/10">
      {text}
      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
    </div>
  );
};

// --- Section Label shown only when sidebar is expanded ---
const SectionLabel = ({ label, isCollapsed }) => {
  if (isCollapsed) {
    return <div className="my-2 mx-auto w-8 border-t border-white/10" />;
  }
  return (
    <div className="flex items-center gap-2 px-3 pt-5 pb-1.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-300/50 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
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

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  const isActive = (path) => {
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      if (location.pathname === pathname) {
        const queryParams = new URLSearchParams(query);
        const currentParams = new URLSearchParams(location.search);
        for (const [key, value] of queryParams) {
          if (currentParams.get(key) !== value) return false;
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

  // ─────────────────────────────────────────────────────────────
  // MENU STRUCTURE  — grouped by section for admin/supervisor
  // Each entry is either a nav item OR a { type: "section", label }
  // ─────────────────────────────────────────────────────────────
  const getMenuItems = () => {

    // ── ADMIN / SUPERVISOR ──────────────────────────────────────
    if (role === "admin" || role === "supervisor") {
      return [
        // ── OVERVIEW ──
        { type: "section", label: "Overview" },
        {
          key: "dashboard",
          label: "Dashboard",
          icon: FaTachometerAlt,
          path: "/admin/dashboard",
        },

        // ── WORKFORCE ──
        { type: "section", label: "Workforce" },
        {
          key: "employees",
          label: "Employees",
          icon: FaUsers,
          path: "/admin/employees",
        },
        ...(role === "admin" ? [
          {
            key: "departments",
            label: "Departments",
            icon: FaBuilding,
            path: "/admin/departments",
          },
          {
            key: "positions",
            label: "Positions",
            icon: FaBriefcase,
            path: "/admin/positions",
          },
        ] : []),

        // ── TIME MANAGEMENT ──
        { type: "section", label: "Time Management" },
        {
          key: "schedule",
          label: "Schedule",
          icon: FaCalendarAlt,
          path: "/admin/schedule",
        },
        {
          key: "attendance",
          label: "Attendance",
          icon: FaClock,
          path: "/admin/attendance",
        },
        ...(role === "admin" ? [
          {
            key: "holidays",
            label: "Holidays",
            icon: FaUmbrellaBeach,
            path: "/admin/holidays",
          },
        ] : []),

        // ── INSIGHTS ──
        { type: "section", label: "Insights" },
        {
          key: "reports",
          label: "Reports",
          icon: FaChartBar,
          path: "/admin/attendance-reports",
        },
        ...(role === "admin" ? [
          {
            key: "archive",
            label: "Archive",
            icon: FaArchive,
            path: "/admin/attendance-archive",
          },
        ] : []),

        // ── SYSTEM (admin only) ──
        ...(role === "admin" ? [
          { type: "section", label: "System" },
          {
            key: "registrations",
            label: "Registrations",
            icon: FaUserPlus,
            path: "/admin/registrations",
          },
          {
            key: "settings",
            label: "Settings",
            icon: FaCog,
            path: "/admin/settings",
          },
        ] : []),

        // ── PERSONAL (supervisor only) ──
        ...(role === "supervisor" ? [
          { type: "section", label: "Personal" },
          {
            key: "personal",
            label: "My Space",
            icon: FaUser,
            submenu: [
              { key: "my-dashboard",  label: "My Dashboard",  path: "/supervisor/mydashboard" },
              { key: "my-attendance", label: "My Attendance",  path: "/supervisor/myattendance" },
              { key: "my-schedule",   label: "My Schedule",    path: "/supervisor/myschedule" },
            ],
          },
        ] : []),
      ];
    }

    // ── WAREHOUSE ADMIN ─────────────────────────────────────────
    if (role === "warehouseadmin") {
      return [
        { type: "section", label: "Overview" },
        {
          key: "dashboard",
          label: "Dashboard",
          icon: FaTachometerAlt,
          path: "/warehouseadmin/dashboard",
        },

        { type: "section", label: "Time Management" },
        {
          key: "attendance",
          label: "Attendance",
          icon: FaClock,
          path: "/warehouseadmin/attendance",
        },

        { type: "section", label: "Insights" },
        {
          key: "reports",
          label: "Reports",
          icon: FaChartBar,
          path: "/warehouseadmin/attendance-reports",
        },

        { type: "section", label: "Personal" },
        {
          key: "personal",
          label: "My Space",
          icon: FaUser,
          submenu: [
            { key: "my-dashboard",  label: "My Dashboard",  path: "/warehouseadmin/mydashboard" },
            { key: "my-attendance", label: "My Attendance",  path: "/warehouseadmin/myattendance" },
            { key: "my-schedule",   label: "My Schedule",    path: "/warehouseadmin/myschedule" },
          ],
        },
      ];
    }

    // ── TEAM LEADER ─────────────────────────────────────────────
    if (role === "teamleader") {
      return [
        { type: "section", label: "Overview" },
        {
          key: "dashboard",
          label: "Dashboard",
          icon: FaTachometerAlt,
          path: "/team/dashboard",
        },

        { type: "section", label: "Team" },
        {
          key: "team-members",
          label: "Team Members",
          icon: FaUsers,
          path: "/team/members",
        },
        {
          key: "team-schedule",
          label: "Team Schedule",
          icon: FaCalendarCheck,
          path: "/team/schedule",
        },

        { type: "section", label: "Personal" },
        {
          key: "personal",
          label: "My Space",
          icon: FaUser,
          submenu: [
            { key: "my-dashboard",  label: "My Dashboard",  path: "/team/mydashboard" },
            { key: "my-attendance", label: "My Attendance",  path: "/team/myattendance" },
            { key: "my-schedule",   label: "My Schedule",    path: "/team/myschedule" },
          ],
        },
      ];
    }

    // ── EMPLOYEE ────────────────────────────────────────────────
    if (role === "employee") {
      return [
        { type: "section", label: "Overview" },
        {
          key: "dashboard",
          label: "Dashboard",
          icon: FaTachometerAlt,
          path: "/employee/dashboard",
        },

        { type: "section", label: "My Time" },
        {
          key: "my-attendance",
          label: "My Attendance",
          icon: FaClock,
          path: "/employee/myattendance",
        },
        {
          key: "my-schedule",
          label: "My Schedule",
          icon: FaCalendarAlt,
          path: "/employee/schedule",
        },
      ];
    }

    // fallback
    return [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: FaTachometerAlt,
        path: "/admin/dashboard",
      },
    ];
  };

  const menuItems = getMenuItems();

  const getRoleDisplayName = () => {
    switch (role) {
      case "admin":          return "HR Administrator";
      case "warehouseadmin": return "Warehouse Admin";
      case "supervisor":     return "Supervisor";
      case "teamleader":     return "Team Leader";
      case "employee":       return "Employee";
      default:               return "User";
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ITEM STYLE HELPERS
  // ─────────────────────────────────────────────────────────────
  const getItemClass = (active) => [
    "relative flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group",
    isCollapsed ? "justify-center" : "justify-between",
    active
      ? "bg-white/[0.12] text-white shadow-sm font-semibold"
      : "text-blue-100/70 hover:bg-white/[0.07] hover:text-white font-medium",
  ].join(" ");

  // ─────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────
  const renderMenuItem = (item, idx) => {
    // Section divider
    if (item.type === "section") {
      return <SectionLabel key={`section-${idx}`} label={item.label} isCollapsed={isCollapsed} />;
    }

    // Submenu item
    if (item.submenu) {
      const isExpanded = expandedMenus[item.key];
      const hasActiveChild = item.submenu.some(sub => isActive(sub.path));

      return (
        <div key={item.key} className="relative">
          <button
            onClick={() => toggleMenu(item.key)}
            onMouseEnter={() => setHoveredItem(item.key)}
            onMouseLeave={() => setHoveredItem(null)}
            className={getItemClass(hasActiveChild)}
          >
            {/* Active indicator bar */}
            {hasActiveChild && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.7)]" />
            )}

            <div className="flex items-center gap-3">
              <item.icon
                size={16}
                className={hasActiveChild ? "text-blue-400" : "text-blue-200/60 group-hover:text-blue-300 transition-colors"}
              />
              {!isCollapsed && (
                <span className="text-[13px] tracking-wide">{item.label}</span>
              )}
            </div>

            {!isCollapsed && (
              <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                <FaChevronDown size={9} className={hasActiveChild ? "text-white/80" : "text-blue-200/50"} />
              </div>
            )}

            <Tooltip text={item.label} show={isCollapsed && hoveredItem === item.key} />
          </button>

          {/* Submenu items */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded && !isCollapsed ? "max-h-60 opacity-100 mt-1 mb-2" : "max-h-0 opacity-0"
            }`}
          >
            <div className="ml-5 pl-3 border-l border-white/[0.08] space-y-0.5 mt-1">
              {item.submenu.map(subItem => {
                const isSubActive = isActive(subItem.path);
                return (
                  <Link
                    key={subItem.key}
                    to={subItem.path}
                    onClick={closeMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] tracking-wide transition-all duration-200 ${
                      isSubActive
                        ? "bg-white/[0.12] text-white font-semibold"
                        : "text-blue-200/60 hover:text-white hover:bg-white/[0.06] font-medium"
                    }`}
                  >
                    {/* Dot indicator */}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                      isSubActive ? "bg-blue-400" : "bg-white/20 group-hover:bg-blue-300"
                    }`} />
                    {subItem.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Regular nav item
    const active = isActive(item.path);

    return (
      <Link
        key={item.key}
        to={item.path}
        onClick={closeMobile}
        onMouseEnter={() => setHoveredItem(item.key)}
        onMouseLeave={() => setHoveredItem(null)}
        className={getItemClass(active)}
      >
        {/* Active indicator bar */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.7)]" />
        )}

        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <item.icon
            size={16}
            className={active ? "text-blue-400" : "text-blue-200/60 group-hover:text-blue-300 transition-colors"}
          />
          {!isCollapsed && (
            <span className="text-[13px] tracking-wide">{item.label}</span>
          )}
        </div>

        <Tooltip text={item.label} show={isCollapsed && hoveredItem === item.key} />
      </Link>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile Menu Button */}
      {!isMobileOpen && (
        <button
          onClick={toggleMobile}
          className="lg:hidden fixed top-3 left-4 z-[45] p-2.5 rounded-xl bg-white shadow-md border border-gray-200 text-blue-900 hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          aria-label="Open navigation"
        >
          <FaBars size={18} />
        </button>
      )}

      {/* Mobile Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] transition-opacity duration-300 ${
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* ── Sidebar Container ── */}
      <aside
        className={`fixed left-0 top-0 h-full shadow-2xl z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col font-sans border-r border-white/[0.06] ${
          isCollapsed ? "w-[72px]" : "w-[268px]"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          background: `linear-gradient(165deg, ${systemConfig.primaryColor || "#1E3A8A"} 0%, #0F172A 100%)`,
        }}
        aria-label="Main navigation"
      >

        {/* ── Header ── */}
        <div
          className={`relative flex items-center shrink-0 border-b border-white/[0.06] ${
            isCollapsed ? "h-[68px] justify-center px-3" : "h-[68px] px-4 gap-3"
          }`}
        >
          {systemConfig.logo && (
            <div className="bg-white/10 p-1.5 rounded-xl border border-white/10 shadow-sm flex-shrink-0">
              <img
                src={systemConfig.logo}
                alt="Logo"
                className={`${isCollapsed ? "h-7" : "h-8"} object-contain drop-shadow-md transition-all`}
              />
            </div>
          )}

          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
              <span className="text-white font-extrabold text-[15px] tracking-wide truncate">
                {systemConfig.systemName || "SecureAttend"}
              </span>
              <span className="text-blue-300/60 text-[9px] uppercase tracking-[0.18em] font-bold mt-0.5">
                Attendance System
              </span>
            </div>
          )}

          {/* Mobile close */}
          <button
            onClick={closeMobile}
            className="lg:hidden text-white/60 hover:text-white p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none flex-shrink-0"
            aria-label="Close navigation"
          >
            <FaTimes size={15} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggle}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-6 h-6 bg-white text-blue-700 rounded-full shadow-md hover:scale-110 hover:bg-blue-50 transition-all z-50 border border-gray-200 focus:outline-none"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed
              ? <FaChevronRight size={9} className="ml-0.5" />
              : <FaChevronDown size={9} className="rotate-90" />
            }
          </button>
        </div>

        {/* ── User Profile Card ── */}
        <div
          onClick={() => { navigate(getProfileRoute()); closeMobile(); }}
          className={`shrink-0 cursor-pointer group transition-all duration-200 mx-3 mt-3 rounded-xl border border-white/[0.07] ${
            isCollapsed
              ? "flex justify-center p-2.5 hover:bg-white/[0.07]"
              : "flex items-center gap-3 p-3 bg-white/[0.05] hover:bg-white/[0.09]"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === "Enter" && navigate(getProfileRoute())}
          aria-label="Go to profile"
        >
          <div className="relative shrink-0">
            {photo ? (
              <img
                src={photo}
                alt="Profile"
                className="w-9 h-9 rounded-full border-2 border-white/20 object-cover shadow-sm group-hover:border-blue-300/50 transition-colors"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-500/20 border-2 border-white/20 flex items-center justify-center text-blue-200 shadow-sm group-hover:border-blue-300/50 transition-colors">
                <FaUserCircle size={22} />
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1E3A8A] rounded-full" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-bold truncate group-hover:text-blue-100 transition-colors leading-tight">
                {username}
              </p>
              <span className="inline-block text-blue-300/70 text-[10px] tracking-wider uppercase font-semibold mt-0.5 bg-black/20 px-1.5 py-0.5 rounded">
                {getRoleDisplayName()}
              </span>
            </div>
          )}
        </div>

        {/* ── Scrollable Nav ── */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide mt-1" aria-label="Sidebar navigation">
          {menuItems.map((item, idx) => renderMenuItem(item, idx))}
        </nav>

        {/* ── Footer / Sign Out ── */}
        <div className="shrink-0 px-3 py-3 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredItem("logout")}
            onMouseLeave={() => setHoveredItem(null)}
            className={`w-full flex items-center py-2.5 rounded-xl text-rose-300/80 hover:bg-rose-500/15 hover:text-rose-200 transition-all duration-200 relative group border border-transparent hover:border-rose-500/20 ${
              isCollapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
            aria-label="Sign out"
          >
            <FaSignOutAlt size={15} className="group-hover:scale-110 transition-transform flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-semibold text-[13px] tracking-wide">Sign Out</span>
            )}
            <Tooltip text="Sign Out" show={isCollapsed && hoveredItem === "logout"} />
          </button>
        </div>
      </aside>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
