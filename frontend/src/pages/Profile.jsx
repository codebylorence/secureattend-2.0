import React, { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { formatDateTimePH } from "../utils/formatDateTime";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { fetchUserProfile } from "../api/UserApi";

export default function Profile() {
  const role = localStorage.getItem("role") || "admin";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch user profile using your service
  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login first!");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchUserProfile(token);
        setProfile(data.user); //  get the `user` object directly
      } catch (error) {
        console.error("Error fetching profile:", error);
        alert("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleEdit = () => {
    alert("Edit Profile feature coming soon!");
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
        Loading profile...
      </div>
    );

  if (!profile)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-red-500">
        Failed to load profile.
      </div>
    );

  const employee = profile.employee || {}; // ✅ safely handle null employee

  return (
    <div className="grid h-screen pl-5 sm:pl-70 bg-gray-50">
      <Navbar />
      <Sidebar role={role} />

      <div className="pr-10 bg-gray-50">
        {/* Header */}
        <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3 mt-30">
          <h1 className="text-[#374151] text-[21px] font-semibold">
            My Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
          {/* Top Section */}
          <div className="flex items-center gap-6 border-b pb-6 mb-6">
            <FaUserCircle size={90} className="text-[#1E3A8A]" />
            <div>
              <h2 className="text-2xl font-bold text-[#1E3A8A]">
                {employee.fullname || profile.username || "Unknown"}
              </h2>
              <p className="text-gray-600">
                Employee ID: {employee.employee_id || "N/A"}
              </p>
              <p className="text-sm text-gray-500">
                Joined: {formatDateTimePH(profile.createdAt)}
              </p>
            </div>
            <button
              onClick={handleEdit}
              className="ml-auto bg-[#1E3A8A] hover:bg-blue-900 text-white px-4 py-2 rounded-md flex items-center gap-2 transition"
            >
              <MdEdit />
              Edit
            </button>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-500 text-sm">Department</p>
              <p className="font-semibold text-gray-800">
                {employee.department || "—"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 text-sm">Position</p>
              <p className="font-semibold text-gray-800">
                {employee.position || "—"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 text-sm">Email</p>
              <p className="font-semibold text-gray-800">
                {employee.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 text-sm">Contact Number</p>
              <p className="font-semibold text-gray-800">
                {employee.contact_number || "—"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 text-sm">Status</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  employee.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {employee.status || "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
