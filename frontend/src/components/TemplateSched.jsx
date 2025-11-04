import { MdAddCircle, MdEditCalendar} from "react-icons/md";
import { useState } from "react";

export default function TemplateSched() {
  const [templates, setTemplates] = useState([
    { id: 1, name: "Morning Shift", time: "8:00 AM - 4:00 PM" },
    { id: 2, name: "Night Shift", time: "10:00 PM - 6:00 AM" },
  ]);

    const handleAddTemplate = (e) => {
      e.preventDefault();
      if (!newTemplate.name || !newTemplate.time) return alert("Fill all fields!");
      setTemplates([...templates, { id: Date.now(), ...newTemplate }]);
      setNewTemplate({ name: "", time: "" });
    };

    const [newTemplate, setNewTemplate] = useState({ name: "", time: "" });
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
        <MdAddCircle /> Add Schedule Template
      </h2>
      <form
        onSubmit={handleAddTemplate}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <input
          type="text"
          placeholder="Shift Name"
          value={newTemplate.name}
          onChange={(e) =>
            setNewTemplate({ ...newTemplate, name: e.target.value })
          }
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Time (e.g. 8:00 AM - 4:00 PM)"
          value={newTemplate.time}
          onChange={(e) =>
            setNewTemplate({ ...newTemplate, time: e.target.value })
          }
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <button
          type="submit"
          className="bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900 px-4 py-2"
        >
          Add Template
        </button>
      </form>

      <div className="mt-5">
        <h3 className="font-medium mb-2">Existing Templates</h3>
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex justify-between items-center border-b pb-2 text-sm text-gray-700"
            >
              <span>
                {t.name} — <span className="text-gray-500">{t.time}</span>
              </span>
              <MdEditCalendar className="text-blue-700 cursor-pointer" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
