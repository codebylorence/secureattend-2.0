import React, { useState } from "react";
import { FaFingerprint } from "react-icons/fa";
import { loginUser } from "../api/UserApi"; 
import { useNavigate } from "react-router-dom";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Redirect user based on role
      if (data.user.role === "admin") navigate("/admin/dashboard");
      else if (data.user.role === "teamleader") navigate("/team/dashboard");
      else navigate("/employee/dashboard");
    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    console.log("Forgot password email sent to:", forgotEmail);
    setShowForgotModal(false);
    alert("Password reset link has been sent to your email!");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#374151]">
      {/* LOGIN CARD */}
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8 relative overflow-hidden">
        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#1E3A8A] p-4 rounded-full mb-3 shadow-md">
            <FaFingerprint size={35} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A8A]">SecureAttend</h1>
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
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-[#1E3A8A] outline-none"
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
                className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:ring-2 focus:ring-[#1E3A8A] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-gray-500 hover:text-[#1E3A8A]"
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
              className="text-sm text-[#1E3A8A] hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white font-medium py-2 rounded-md transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-gray-400 text-xs mt-6">
          © 2025 SecureAttend | Toplis Solutions Inc.
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-[#1E3A8A] mb-4">
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
                  className="px-4 py-2 bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900"
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
