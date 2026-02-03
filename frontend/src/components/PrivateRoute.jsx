import { Navigate, Outlet } from "react-router-dom";

/**
 * PrivateRoute component to protect routes based on authentication and role
 * @param {string|string[]} allowedRole - The role(s) allowed to access this route
 */
export default function PrivateRoute({ allowedRole }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  
  // Check if we have valid authentication data
  let user = {};
  try {
    user = userStr ? JSON.parse(userStr) : {};
  } catch (error) {
    console.error("Error parsing user data in PrivateRoute:", error);
    // Clear corrupted data and redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    return <Navigate to="/" replace />;
  }
  
  const isAuthenticated = !!token && !!user.role;
  const userRole = user.role;

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if user role is allowed
  const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  const isRoleAllowed = allowedRoles.includes(userRole);

  // Authenticated but wrong role - redirect to their dashboard
  if (allowedRole && !isRoleAllowed) {
    switch (userRole) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "warehouseadmin":
        return <Navigate to="/warehouseadmin/dashboard" replace />;
      case "supervisor":
        return <Navigate to="/admin/dashboard" replace />;
      case "teamleader":
        return <Navigate to="/team/dashboard" replace />;
      case "employee":
        return <Navigate to="/employee/dashboard" replace />;
      default:
        // Invalid role, clear data and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        return <Navigate to="/" replace />;
    }
  }

  // Authenticated and correct role - render the route
  return <Outlet />;
}
