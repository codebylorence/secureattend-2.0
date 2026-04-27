import { useState, useEffect } from "react";
import { FaArchive, FaSearch, FaTrashAlt, FaUndo } from "react-icons/fa";
import { MdDelete, MdRestoreFromTrash } from "react-icons/md";
import {
  getArchivedAttendances,
  restoreAttendance,
  permanentlyDeleteAttendance,
} from "../api/AttendanceApi";
import ConfirmationModal from "../components/ConfirmationModal";
import { toast } from "react-toastify";
import { formatDateTime24 } from "../utils/timeFormat";

const statusColors = {
  Present: "bg-green-100 text-green-800",
  Late: "bg-orange-100 text-orange-800",
  Absent: "bg-red-100 text-red-800",
  Overtime: "bg-purple-100 text-purple-800",
  "Missed Clock-out": "bg-yellow-100 text-yellow-800",
  IN: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function AttendanceArchive() {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [restoreModal, setRestoreModal] = useState({ isOpen: false, record: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchArchived();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      records.filter(
        (r) =>
          r.employee_name?.toLowerCase().includes(q) ||
          r.employee_id?.toLowerCase().includes(q) ||
          r.department?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          r.archived_by?.toLowerCase().includes(q)
      )
    );
    setCurrentPage(1);
  }, [search, records]);

  const fetchArchived = async () => {
    try {
      setLoading(true);
      const data = await getArchivedAttendances();
      setRecords(data);
    } catch (error) {
      console.error("Error fetching archived records:", error);
      toast.error("Failed to load archived records.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    const record = restoreModal.record;
    if (!record) return;
    setActionLoading(true);
    try {
      await restoreAttendance(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      toast.success("Record restored successfully.");
      setRestoreModal({ isOpen: false, record: null });
    } catch (error) {
      toast.error("Failed to restore record.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    const record = deleteModal.record;
    if (!record) return;
    setActionLoading(true);
    try {
      await permanentlyDeleteAttendance(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      toast.success("Record permanently deleted.");
      setDeleteModal({ isOpen: false, record: null });
    } catch (error) {
      toast.error("Failed to permanently delete record.");
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getItemDetails = (record) =>
    record
      ? {
          Employee: record.employee_name || record.employee_id,
          Date: formatDate(record.date),
          Status: record.status,
          Department: record.department || "—",
          "Archived by": record.archived_by || "—",
          "Archived at": record.archived_at
            ? new Date(record.archived_at).toLocaleString()
            : "—",
        }
      : null;

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-heading text-[21px] font-semibold">
            Attendance Archive
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 flex items-center gap-2">
            <FaArchive className="text-amber-500" size={13} />
            <span className="text-sm font-semibold text-amber-700">
              {filtered.length} {filtered.length === 1 ? "Record" : "Records"}
            </span>
          </div>
          <div className="relative">
            <FaSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={13}
            />
            <input
              type="text"
              placeholder="Search archived..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-52"
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
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Clock In</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Clock Out</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Archived By</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Archived At</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-gray-100 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FaArchive size={28} className="text-gray-200" />
                      <p className="font-medium text-gray-500">
                        {search ? "No records match your search" : "Archive is empty"}
                      </p>
                      <p className="text-xs">
                        {search
                          ? "Try a different keyword"
                          : "Deleted attendance records will appear here"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((record) => {
                  const statusClass =
                    statusColors[record.status] || "bg-gray-100 text-gray-800";
                  return (
                    <tr key={record.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">
                        {record.employee_name || record.employee_id}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {formatDateTime24(record.clock_in) || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {formatDateTime24(record.clock_out) || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {record.department || "—"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {record.archived_by || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {record.archived_at
                          ? new Date(record.archived_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Restore */}
                          <button
                            onClick={() => setRestoreModal({ isOpen: true, record })}
                            className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-sm shadow-emerald-100"
                            title="Restore record"
                          >
                            <MdRestoreFromTrash size={16} />
                          </button>
                          {/* Permanently delete */}
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, record })}
                            className="w-7 h-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm shadow-rose-100"
                            title="Permanently delete"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > itemsPerPage && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–
              {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                )
                .map((p, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span key={`ellipsis-${p}`} className="px-2 py-1 text-sm text-gray-400">…</span>
                    )}
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1 text-sm border rounded ${
                        currentPage === p
                          ? "bg-amber-500 text-white border-amber-500"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  </>
                ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Modal */}
      <ConfirmationModal
        isOpen={restoreModal.isOpen}
        onClose={() => setRestoreModal({ isOpen: false, record: null })}
        onConfirm={handleRestore}
        title="Restore Record"
        message="This will move the record back to the active attendance list."
        confirmText="Restore"
        cancelText="Cancel"
        type="info"
        loading={actionLoading}
        itemDetails={getItemDetails(restoreModal.record)}
      />

      {/* Permanent Delete Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, record: null })}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete"
        message="This will permanently remove the record. This action cannot be undone."
        confirmText="Delete Forever"
        cancelText="Cancel"
        type="danger"
        loading={actionLoading}
        itemDetails={getItemDetails(deleteModal.record)}
      />
    </div>
  );
}
