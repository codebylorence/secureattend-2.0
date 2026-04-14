import { useState, useEffect } from "react";
import { FaUsers, FaSearch, FaBuilding } from "react-icons/fa";
import { fetchTeamMembers } from "../api/EmployeeApi";

const avatarColors = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-rose-500", "bg-amber-500", "bg-cyan-500", "bg-pink-500",
];

const getColor = (id) =>
  avatarColors[(id?.charCodeAt(0) || 0) % avatarColors.length];

const getInitials = (first, last) =>
  `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";

export default function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const dept = user.employee?.department || "";
    setDepartment(dept);
    if (dept) {
      loadMembers(dept);
    } else {
      setLoading(false);
      setError("No department found for your account.");
    }
  }, []);

  const loadMembers = async (dept) => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchTeamMembers(dept);
      setMembers(data);
      setFiltered(data);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
      setError("Failed to load team members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      members.filter(
        (m) =>
          `${m.firstname} ${m.lastname}`.toLowerCase().includes(q) ||
          m.employee_id?.toLowerCase().includes(q) ||
          m.position?.toLowerCase().includes(q)
      )
    );
  }, [search, members]);

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-3 mb-6 pt-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[21px] font-semibold text-gray-800 flex items-center gap-2">
            <FaUsers className="text-blue-600" />
            Team Members
          </h1>
          {department && (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <FaBuilding size={11} />
              {department}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-2">
            <FaUsers className="text-blue-500" size={13} />
            <span className="text-sm font-semibold text-blue-700">
              {filtered.length} {filtered.length === 1 ? "Member" : "Members"}
            </span>
          </div>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-52"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                        <div className="h-3.5 bg-gray-200 rounded w-32" />
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
                    <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-24" /></td>
                    <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
                    <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-28" /></td>
                    <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-14" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-red-500">{error}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FaUsers size={28} className="text-gray-200" />
                      <p className="font-medium text-gray-500">
                        {search ? "No members match your search" : "No team members found"}
                      </p>
                      <p className="text-xs">
                        {search ? "Try a different keyword" : "Members in your department will appear here"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const fullName = `${member.firstname || ""} ${member.lastname || ""}`.trim() || member.employee_id;
                  const isActive = member.status === "Active";
                  return (
                    <tr key={member.employee_id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={fullName}
                              className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full ${getColor(member.employee_id)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                              {getInitials(member.firstname, member.lastname)}
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{fullName}</span>
                        </div>
                      </td>
                      {/* ID */}
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{member.employee_id}</td>
                      {/* Position */}
                      <td className="px-5 py-3.5 text-gray-600">{member.position || "—"}</td>
                      {/* Department */}
                      <td className="px-5 py-3.5 text-gray-600">{member.department || "—"}</td>
                      {/* Contact */}
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{member.contact_number || "—"}</td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {member.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
