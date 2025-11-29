import { Navigate, Outlet } from "react-router-dom";

/**
 * PrivateRoute component to protect routes based on authentication and role
 * @param {string} allowedRole - The role allowed to access this route (admin, teamleader, employee)
 */
export default function PrivateRoute({ allowedRole }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthenticated = !!token && !!user.role;
  const userRole = user.role;

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Authenticated but wrong role - redirect to their dashboard
  if (allowedRole && userRole !== allowedRole) {
    switch (userRole) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "teamleader":
        return <Navigate to="/team/dashboard" replace />;
      case "employee":
        return <Navigate to="/employee/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // Authenticated and correct role - render the route
  return <Outlet />;
}
