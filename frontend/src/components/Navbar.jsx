import { useState } from "react";
import { IoNotifications } from "react-icons/io5";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "Admin";
  const role = localStorage.getItem("role") || "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/");
  };

  return (
    <div className="bg-[#1E3A8A] py-8 px-5 flex justify-between items-center fixed top-0 inset-x-0 z-50">
      {/* Title */}
      <h1 className="text-2xl text-white font-bold">SecureAttend</h1>

      {/* Right Side */}
      <div className="flex items-center gap-6 relative">
        {/* Notification Icon */}
        <IoNotifications size={25} color="white" className="cursor-pointer" />

        {/* Profile Section */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <img
            src="https://scontent.fmnl33-3.fna.fbcdn.net/v/t39.30808-1/472020402_566286066169802_7055273986583081106_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=110&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeGU0TWw03kXMsF3TJWdCMVsV6hpqbCo74NXqGmpsKjvgyaDvVDnuycRe06yBkHa9PatDY9aZ6zTgkX1eKCUQGE6&_nc_ohc=njDec7phJ-gQ7kNvwFhnDwc&_nc_oc=AdnT1EjLs-TUfepEmqXt4mAijFN17e4pdnlVTOT5UM62JGMwAIzMxjtIGxVycaekRuA&_nc_zt=24&_nc_ht=scontent.fmnl33-3.fna&_nc_gid=H9KcBtSlIdABTf5ZEVd_SQ&oh=00_AfePzmNxRoXzPKBzHJIph8gH1dxGOAYGMhiP2a1sA1VSww&oe=69002E90"
            alt="Profile"
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <p className="text-white text-sm font-medium">{username}</p>
        </div>

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute right-0 top-14 bg-white shadow-lg rounded-lg w-52 p-4 z-50">
            {/* Profile Info */}
            <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
              <img
                src="https://scontent.fmnl33-3.fna.fbcdn.net/v/t39.30808-1/472020402_566286066169802_7055273986583081106_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=110&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeGU0TWw03kXMsF3TJWdCMVsV6hpqbCo74NXqGmpsKjvgyaDvVDnuycRe06yBkHa9PatDY9aZ6zTgkX1eKCUQGE6&_nc_ohc=njDec7phJ-gQ7kNvwFhnDwc&_nc_oc=AdnT1EjLs-TUfepEmqXt4mAijFN17e4pdnlVTOT5UM62JGMwAIzMxjtIGxVycaekRuA&_nc_zt=24&_nc_ht=scontent.fmnl33-3.fna&_nc_gid=H9KcBtSlIdABTf5ZEVd_SQ&oh=00_AfePzmNxRoXzPKBzHJIph8gH1dxGOAYGMhiP2a1sA1VSww&oe=69002E90"
                alt="User Avatar"
                className="w-10 h-10 rounded-full"
              />
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
                navigate("/profile");
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
