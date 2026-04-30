import { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaCalendarAlt } from "react-icons/fa";
import { MdDelete, MdClose, MdSave } from "react-icons/md";
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from "../api/HolidayApi";
import ConfirmationModal from "../components/ConfirmationModal";
import { toast } from "react-toastify";

const TYPES = ["Regular Holiday", "Special Non-Working Day"];

const TYPE_BADGE = {
  "Regular Holiday": "bg-red-100 text-red-700",
  "Special Non-Working Day": "bg-amber-100 text-amber-700",
};

const EMPTY_FORM = { date: "", name: "", type: "Regular Holiday" };

const currentYear = new Date().getFullYear();

export default function HolidayManagement() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(currentYear);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, holiday: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const data = await getHolidays(year);
      setHolidays(data);
    } catch {
      toast.error("Failed to load holidays.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (holiday) => {
    setEditing(holiday);
    setForm({ date: holiday.date, name: holiday.name, type: holiday.type });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.date || !form.name || !form.type) {
      toast.warning("All fields are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateHoliday(editing.id, form);
        toast.success("Holiday updated.");
      } else {
        await createHoliday(form);
        toast.success("Holiday added.");
      }
      setModalOpen(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save holiday.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const h = deleteModal.holiday;
    if (!h) return;
    setDeleteLoading(true);
    try {
      await deleteHoliday(h.id);
      setHolidays((prev) => prev.filter((x) => x.id !== h.id));
      toast.success("Holiday deleted.");
      setDeleteModal({ isOpen: false, holiday: null });
    } catch {
      toast.error("Failed to delete holiday.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (d) => {
    // Parse as local date to avoid UTC offset shifting the day
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  };

  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  const labelClass = "block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[21px] font-semibold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-red-500" />
            Holiday Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage public holidays and special non-working days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all"
          >
            <FaPlus size={12} /> Add Holiday
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Holiday Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(4)].map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-gray-100 rounded w-28" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FaCalendarAlt size={28} className="text-gray-200" />
                      <p className="font-medium text-gray-500">No holidays for {year}</p>
                      <p className="text-xs">Click "Add Holiday" to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">
                      {formatDate(h.date)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{h.name}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${TYPE_BADGE[h.type] || "bg-gray-100 text-gray-700"}`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(h)}
                          className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-sm shadow-blue-100"
                          title="Edit"
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, holiday: h })}
                          className="w-7 h-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm shadow-rose-100"
                          title="Delete"
                        >
                          <MdDelete size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Holiday" : "Add Holiday"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-full transition-colors"
              >
                <MdClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Date <span className="text-red-500 normal-case font-normal">*</span></label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Holiday Name <span className="text-red-500 normal-case font-normal">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. New Year's Day"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Type <span className="text-red-500 normal-case font-normal">*</span></label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputClass}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    <MdSave size={14} />
                  )}
                  {editing ? "Save Changes" : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, holiday: null })}
        onConfirm={handleDelete}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
        itemDetails={
          deleteModal.holiday
            ? {
                Date: formatDate(deleteModal.holiday.date),
                Name: deleteModal.holiday.name,
                Type: deleteModal.holiday.type,
              }
            : null
        }
      />
    </div>
  );
}
