import { useState, useEffect } from "react";
import { IoNotifications } from "react-icons/io5";
import { FaUserCircle, FaSignOutAlt, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [photo, setPhoto] = useState(null);
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "Admin";
  const role = localStorage.getItem("role") || "admin";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setPhoto(user.employee?.photo);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getProfileRoute = () => {
    if (role === "admin") return "/admin/profile";
    if (role === "teamleader") return "/team/profile";
    return "/employee/profile";
  };

  return (
    <div className="bg-[#1E3A8A] py-8 px-5 flex justify-between items-center fixed top-0 inset-x-0 z-20">
      {/* Title */}
      <h1 className="text-2xl text-white font-bold pl-12 lg:pl-0">SecureAttend</h1>

      {/* Right Side */}
      <div className="flex items-center gap-6 relative">
        {/* Notification Icon */}
        <IoNotifications size={25} color="white" className="cursor-pointer" />

        {/* Profile Section */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          {photo ? (
            <img
              src={photo}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
              <FaUser className="text-gray-600" size={20} />
            </div>
          )}
          <p className="text-white text-sm font-medium">{username}</p>
        </div>

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute right-0 top-14 bg-white shadow-lg rounded-lg w-52 p-4 z-50">
            {/* Profile Info */}
            <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
              {photo ? (
                <img
                  src={photo}
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <FaUser className="text-gray-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {username}
                </p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => {
                setShowProfileMenu(false);
                navigate(getProfileRoute());
              }}
              className="flex items-center gap-2 text-gray-700 hover:text-[#1E3A8A] text-sm mb-3 w-full text-left"
            >
              <FaUserCircle /> View Profile
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm w-full text-left"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
