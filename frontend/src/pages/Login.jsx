import { useState } from "react";
import { FaFingerprint } from "react-icons/fa";
import { loginUser } from "../api/UserApi"; 
import { useNavigate } from "react-router-dom";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { toast } from 'react-toastify';

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { systemConfig, loadSystemConfig } = useSystemConfig();

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(formData);

      // Store token and user info in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Load system configuration after successful login
      await loadSystemConfig();

      // Show success toast
      toast.success("Login successful! Welcome back.");

      // Redirect user based on role
      if (data.user.role === "admin") navigate("/admin/dashboard");
      else if (data.user.role === "warehouseadmin") navigate("/warehouseadmin/dashboard");
      else if (data.user.role === "supervisor") navigate("/admin/dashboard");
      else if (data.user.role === "teamleader") navigate("/team/dashboard");
      else navigate("/employee/dashboard");
    } catch (err) {
      // Show error toast
      toast.error(err.message || "Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 font-sans px-4 sm:px-6 lg:px-8 py-6">
      
      {/* LOGIN CARD */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-100 relative overflow-hidden">
        
        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-6">
          {systemConfig.logo ? (
            // Display uploaded logo
            <div className="mb-4">
              <img 
                src={systemConfig.logo} 
                alt={systemConfig.systemName || "System Logo"} 
                className="max-h-12 max-w-36 object-contain"
              />
            </div>
          ) : (
            // Fallback to fingerprint icon
            <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg transform transition hover:scale-105">
              <FaFingerprint size={28} className="text-white" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight text-center">
            {systemConfig.systemName || "System Login"}
          </h1>
          <p className="text-[10px] sm:text-xs text-blue-600 mt-1.5 font-medium bg-blue-50 inline-block px-2.5 py-0.5 rounded-full">
            Attendance Management System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="w-full pl-3 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <IoMdEyeOff size={18}/> : <IoMdEye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow mt-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Registration Links */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-[11px] sm:text-xs text-gray-500">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors hover:underline"
            >
              Register here
            </button>
          </p>
          <p className="text-[11px] sm:text-xs text-gray-500">
            Already submitted a registration?{' '}
            <button
              onClick={() => navigate('/check-status')}
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors hover:underline"
            >
              Check status
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-[10px] mt-6 pt-2">
          © {new Date().getFullYear()} {systemConfig.systemName}
          {systemConfig.companyName && ` | ${systemConfig.companyName}`}
        </div>
      </div>
    </div>
  );
}