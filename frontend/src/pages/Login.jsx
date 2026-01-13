import React, { useState } from "react";
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
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { systemConfig } = useSystemConfig();

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

      // Show success toast
      toast.success("Login successful! Welcome back.");

      // Redirect user based on role
      if (data.user.role === "admin") navigate("/admin/dashboard");
      else if (data.user.role === "superadmin") navigate("/admin/dashboard");
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

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    console.log("Forgot password email sent to:", forgotEmail);
    setShowForgotModal(false);
    toast.success("Password reset link has been sent to your email!");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#374151]">
      {/* LOGIN CARD */}
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8 relative overflow-hidden">
        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-6">
          {systemConfig.logo ? (
            // Display uploaded logo
            <div className="mb-3">
              <img 
                src={systemConfig.logo} 
                alt={systemConfig.systemName || "System Logo"} 
                className="max-h-16 max-w-48 object-contain"
              />
            </div>
          ) : (
            // Fallback to fingerprint icon
            <div className="bg-primary p-4 rounded-full mb-3 shadow-md">
              <FaFingerprint size={35} color="white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-primary">{systemConfig.systemName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Attendance Management System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
              className="w-full border border-gray-300 rounded-md px-4 py-2 input-primary"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
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
                className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 input-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-gray-500 hover:text-primary"
              >
                {showPassword ? 
                <IoMdEyeOff size={25}/>
                : <IoMdEye size={25} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-sm link-primary hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary font-medium py-2 rounded-md transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Registration Links */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="link-primary hover:underline font-medium"
            >
              Register here
            </button>
          </p>
          <p className="text-gray-600 text-sm">
            Already submitted a registration?{' '}
            <button
              onClick={() => navigate('/check-status')}
              className="link-primary hover:underline font-medium"
            >
              Check status
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-xs mt-4">
          © 2025 {systemConfig.systemName} | {systemConfig.companyName}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Forgot Password
            </h2>
            <form onSubmit={handleForgotSubmit}>
              <label className="block text-sm text-gray-700 mb-2">
                Enter your registered email:
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md p-2 mb-4"
                placeholder="you@example.com"
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 btn-primary rounded-md"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
