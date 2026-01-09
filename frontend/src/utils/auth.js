/**
 * Utility functions for authentication checks
 */

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if user has valid token and user data
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return false;
  }
  
  try {
    const user = JSON.parse(userStr);
    return !!user.role;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return false;
  }
};

/**
 * Get current user data
 * @returns {object|null} User object or null if not authenticated
 */
export const getCurrentUser = () => {
  if (!isAuthenticated()) {
    return null;
  }
  
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if current user has specific role
 * @param {string|string[]} roles - Role or array of roles to check
 * @returns {boolean} True if user has one of the specified roles
 */
export const hasRole = (roles) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
};