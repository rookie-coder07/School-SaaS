import { useMemo, useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { createNotification } from "../utils/notificationHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_CONFIG = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  rows: [
    { rowKey: "row_1_period", type: "period", label: "Period 1", startTime: "08:00", endTime: "08:45" },
    { rowKey: "row_2_period", type: "period", label: "Period 2", startTime: "08:45", endTime: "09:30" },
    { rowKey: "row_3_break", type: "break", label: "Break", startTime: "09:30", endTime: "09:45" },
    { rowKey: "row_4_period", type: "period", label: "Period 3", startTime: "09:45", endTime: "10:30" },
    { rowKey: "row_5_period", type: "period", label: "Period 4", startTime: "10:30", endTime: "11:15" },
    { rowKey: "row_6_break", type: "break", label: "Lunch Break", startTime: "11:15", endTime: "11:45" },
    { rowKey: "row_7_period", type: "period", label: "Period 5", startTime: "11:45", endTime: "12:30" },
    { rowKey: "row_8_period", type: "period", label: "Period 6", startTime: "12:30", endTime: "13:15" },
  ],
};

const createRowKey = (type) => `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${type}`;

export default function TimetableGrid({ token, isTeacher = false, readOnly = false }) {
  const toast = useToast();
  const canEdit = isTeacher && !readOnly;

  const [timetable, setTimetable] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configDraft, setConfigDraft] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formData, setFormData] = useState({ day: "", subject: "" });
  const [showForm, setShowForm] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [undoing, setUndoing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const periodRows = useMemo(
    () => (Array.isArray(config.rows) ? config.rows : []).filter((row) => row.type === "period"),
    [config.rows]
  );

  useEffect(() => {
    fetchConfigAndTimetable();
  }, [token, isTeacher]);

  const fetchConfigAndTimetable = async () => {
    setLoading(true);
    try {
      const configEndpoint = isTeacher ? "/api/teacher/timetable/config" : "/api/student/timetable/config";
      const timetableEndpoint = isTeacher ? "/api/teacher/timetable" : "/api/student/timetable";

      const [configRes, tableRes] = await Promise.all([
        fetch(`${API_URL}${configEndpoint}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}${timetableEndpoint}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const configData = configRes.ok ? await configRes.json() : { config: DEFAULT_CONFIG };
      const tableData = tableRes.ok ? await tableRes.json() : [];

      const cfg = configData?.config && Array.isArray(configData.config.rows) ? configData.config : DEFAULT_CONFIG;
      const normalizedCfg = {
        days: Array.isArray(cfg.days) && cfg.days.length ? cfg.days : DEFAULT_CONFIG.days,
        rows: Array.isArray(cfg.rows) && cfg.rows.length ? cfg.rows : DEFAULT_CONFIG.rows,
      };
      setConfig(normalizedCfg);
      setConfigDraft(normalizedCfg);
      setTimetable(Array.isArray(tableData) ? tableData : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load timetable");
      setConfig(DEFAULT_CONFIG);
      setConfigDraft(DEFAULT_CONFIG);
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectTone = (subjectName) => {
    const key = String(subjectName || "").trim().toLowerCase();
    if (key.includes("math")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (key.includes("science")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (key.includes("english")) return "bg-violet-100 text-violet-800 border-violet-200";
    if (key.includes("social")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (key.includes("computer")) return "bg-cyan-100 text-cyan-800 border-cyan-200";
    if (key.includes("hindi")) return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const getCellData = (row, day) => {
    const rowKey = String(row?.rowKey || "");
    const byRowKey = timetable.find((t) => String(t?.rowKey || "") === rowKey && t.day === day);
    if (byRowKey) return byRowKey;

    const periodIndex = periodRows.findIndex((p) => String(p.rowKey) === rowKey);
    if (periodIndex === -1) return null;
    return timetable.find((t) => Number(t.period) === periodIndex + 1 && t.day === day);
  };

  const handleCellClick = (row, day) => {
    if (!canEdit || row.type !== "period") return;
    const existing = getCellData(row, day);
    setSelectedCell({ rowKey: row.rowKey, day });
    setFormData({
      day,
      subject: existing?.subject || "",
    });
    setShowForm(true);
  };

  const getSelectedRow = () => (Array.isArray(config.rows) ? config.rows : []).find((r) => String(r.rowKey) === String(selectedCell?.rowKey || ""));

  const handleSave = async () => {
    const selectedRow = getSelectedRow();
    if (!selectedRow || selectedRow.type !== "period") {
      toast.warning("Select a valid period row");
      return;
    }
    if (!formData.subject.trim()) {
      toast.warning("Please enter subject");
      return;
    }
    const periodIndex = periodRows.findIndex((row) => String(row.rowKey) === String(selectedRow.rowKey));
    if (periodIndex < 0) {
      toast.error("Invalid period mapping");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teacher/timetable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rowKey: selectedRow.rowKey,
          period: periodIndex + 1,
          day: formData.day,
          subject: formData.subject.trim(),
          startTime: selectedRow.startTime,
          endTime: selectedRow.endTime,
          timetableId: getCellData(selectedRow, formData.day)?._id,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to save timetable");
      }
      toast.success("Timetable entry saved successfully!");

      try {
        await createNotification(
          "Timetable Updated",
          `Timetable updated - ${formData.day}, ${selectedRow.label}: ${formData.subject.trim()}`,
          "student",
          "info",
          token,
          null,
          { type: "timetable", day: formData.day, rowKey: selectedRow.rowKey, subject: formData.subject.trim() }
        );
      } catch (notifErr) {
        console.warn("Failed to create notification (non-critical):", notifErr);
      }

      setShowForm(false);
      setSelectedCell(null);
      await fetchConfigAndTimetable();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save timetable entry");
    }
  };

  const handleDelete = async () => {
    if (!selectedCell) return;
    const selectedRow = getSelectedRow();
    if (!selectedRow) return;
    const existing = getCellData(selectedRow, selectedCell.day);
    if (!existing) return;
    if (!window.confirm("Delete this timetable entry?")) return;

    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/api/teacher/timetable/${existing._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Timetable entry deleted!");
      setUndoStack((prev) => [...prev, { type: "DELETE", model: "timetable", data: existing, timestamp: Date.now() }]);
      setShowForm(false);
      setSelectedCell(null);
      await fetchConfigAndTimetable();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete timetable entry");
    } finally {
      setDeleting(false);
    }
  };

  const handleUndo = async () => {
    if (!undoStack.length) return;
    const lastAction = undoStack[undoStack.length - 1];
    try {
      setUndoing(true);
      const res = await fetch(`${API_URL}/api/teacher/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "timetable", data: lastAction.data }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore timetable");

      setUndoStack((prev) => prev.slice(0, -1));
      await fetchConfigAndTimetable();
      toast.success("Restored successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to undo");
    } finally {
      setUndoing(false);
    }
  };

  const setDayPreset = (preset) => {
    if (preset === "mon_fri") {
      setConfigDraft((prev) => ({ ...prev, days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }));
      return;
    }
    if (preset === "mon_sat") {
      setConfigDraft((prev) => ({ ...prev, days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] }));
    }
  };

  const toggleDay = (day) => {
    setConfigDraft((prev) => {
      const current = new Set(prev.days || []);
      if (current.has(day)) current.delete(day);
      else current.add(day);
      return { ...prev, days: WEEK_DAYS.filter((d) => current.has(d)) };
    });
  };

  const addRow = (type) => {
    const nextIndex = (configDraft.rows || []).length + 1;
    const defaultLabel = type === "period" ? `Period ${nextIndex}` : "Break";
    setConfigDraft((prev) => ({
      ...prev,
      rows: [
        ...(prev.rows || []),
        {
          rowKey: createRowKey(type),
          type,
          label: defaultLabel,
          startTime: "09:00",
          endTime: "09:45",
        },
      ],
    }));
  };

  const updateRow = (rowKey, key, value) => {
    setConfigDraft((prev) => ({
      ...prev,
      rows: (prev.rows || []).map((row) => (String(row.rowKey) === String(rowKey) ? { ...row, [key]: value } : row)),
    }));
  };

  const removeRow = (rowKey) => {
    setConfigDraft((prev) => {
      const nextRows = (prev.rows || []).filter((row) => String(row.rowKey) !== String(rowKey));
      const periodCount = nextRows.filter((row) => row.type === "period").length;
      if (periodCount === 0) {
        toast.warning("At least one period row is required");
        return prev;
      }
      return { ...prev, rows: nextRows };
    });
  };

  const saveConfig = async () => {
    const days = Array.isArray(configDraft.days) ? configDraft.days.filter(Boolean) : [];
    const rows = Array.isArray(configDraft.rows) ? configDraft.rows : [];
    if (!days.length) {
      toast.warning("Select at least one active day");
      return;
    }
    if (!rows.some((row) => row.type === "period")) {
      toast.warning("Add at least one period row");
      return;
    }
    const hasInvalidRow = rows.some(
      (row) => !String(row.label || "").trim() || !String(row.startTime || "").trim() || !String(row.endTime || "").trim()
    );
    if (hasInvalidRow) {
      toast.warning("Fill label, start time, and end time for all rows");
      return;
    }

    try {
      setConfigSaving(true);
      const res = await fetch(`${API_URL}/api/teacher/timetable/config`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days,
          rows: rows.map((row) => ({
            rowKey: row.rowKey,
            type: row.type === "break" ? "break" : "period",
            label: String(row.label || "").trim(),
            startTime: String(row.startTime || "").trim(),
            endTime: String(row.endTime || "").trim(),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save timetable settings");
      toast.success("Timetable settings saved");
      await fetchConfigAndTimetable();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save timetable settings");
    } finally {
      setConfigSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading timetable...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="w-full px-4 md:px-6 space-y-6">
      {canEdit && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Timetable Settings</h3>
            <div className="flex gap-2">
              <button onClick={() => setDayPreset("mon_fri")} type="button" className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200">
                Mon-Fri
              </button>
              <button onClick={() => setDayPreset("mon_sat")} type="button" className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200">
                Mon-Sat
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const active = (configDraft.days || []).includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    active ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {(configDraft.rows || []).map((row, index) => (
              <div key={row.rowKey || index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 border border-slate-200 rounded-xl bg-slate-50">
                <select
                  value={row.type}
                  onChange={(e) => updateRow(row.rowKey, "type", e.target.value === "break" ? "break" : "period")}
                  className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="period">Period</option>
                  <option value="break">Break</option>
                </select>
                <input
                  value={row.label || ""}
                  onChange={(e) => updateRow(row.rowKey, "label", e.target.value)}
                  placeholder="Label"
                  className="md:col-span-4 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="time"
                  value={row.startTime || ""}
                  onChange={(e) => updateRow(row.rowKey, "startTime", e.target.value)}
                  className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="time"
                  value={row.endTime || ""}
                  onChange={(e) => updateRow(row.rowKey, "endTime", e.target.value)}
                  className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <button type="button" onClick={() => removeRow(row.rowKey)} className="md:col-span-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm">
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={() => addRow("period")} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
                Add Period
              </button>
              <button type="button" onClick={() => addRow("break")} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
                Add Break
              </button>
            </div>
            <button
              type="button"
              onClick={saveConfig}
              disabled={configSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold disabled:opacity-50"
            >
              {configSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {isTeacher && undoStack.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50"
          >
            {undoing ? "Undoing..." : `Undo (${undoStack.length})`}
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <div className="min-w-[1100px]">
          <table className="border-collapse w-full text-sm">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-100 px-4 py-3 whitespace-nowrap font-bold text-slate-700 text-center rounded-tl-xl">Row / Time</th>
              {(config.days || []).map((day, idx) => (
                <th
                  key={day}
                  className={`border border-slate-200 bg-slate-100 px-4 py-3 whitespace-nowrap font-bold text-slate-700 text-center min-w-28 md:min-w-36 ${
                    idx === (config.days || []).length - 1 ? "rounded-tr-xl" : ""
                  }`}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(config.rows || []).map((row, rowIndex) => {
              const timeText = `${row.startTime || "--:--"} - ${row.endTime || "--:--"}`;
              if (row.type === "break") {
                const isLunch = String(row.label || "").toLowerCase().includes("lunch");
                const rowBg = isLunch ? "bg-orange-100 text-orange-800" : "bg-yellow-50 text-yellow-800";
                return (
                  <tr key={row.rowKey || rowIndex}>
                    <td colSpan={(config.days || []).length + 1} className={`border border-slate-200 px-4 py-3 whitespace-nowrap text-center font-semibold ${rowBg}`}>
                      {row.label} ({timeText})
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.rowKey || rowIndex}>
                  <td
                    className={`border border-slate-200 bg-slate-50 px-4 py-3 whitespace-nowrap font-semibold text-slate-700 text-center ${
                      rowIndex === (config.rows || []).length - 1 ? "rounded-bl-xl" : ""
                    }`}
                  >
                    <div>{row.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{timeText}</div>
                  </td>
                  {(config.days || []).map((day, dayIndex) => {
                    const cellData = getCellData(row, day);
                    const isSelected = String(selectedCell?.rowKey || "") === String(row.rowKey || "") && selectedCell?.day === day;
                    return (
                      <td
                        key={`${row.rowKey}-${day}`}
                        onClick={() => handleCellClick(row, day)}
                        className={`
                          border border-slate-200 px-4 py-3 whitespace-nowrap text-center min-h-20 transition
                          ${canEdit ? "cursor-pointer hover:bg-blue-50 hover:border-blue-200" : "cursor-default bg-white"}
                          ${isSelected ? "bg-blue-100 border-blue-400" : ""}
                          ${rowIndex === (config.rows || []).length - 1 && dayIndex === (config.days || []).length - 1 ? "rounded-br-xl" : ""}
                        `}
                      >
                        {cellData ? (
                          <div className="text-xs md:text-sm space-y-1">
                            <div className="text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full border text-xs font-semibold ${getSubjectTone(cellData.subject)}`}>
                                {cellData.subject}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className={`text-xs ${canEdit ? "text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-block" : "text-slate-300"}`}>
                            {canEdit ? "Click to add" : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {showForm && selectedCell && canEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Assign Subject</h3>
            <div className="text-sm text-slate-600">
              {selectedCell.day} - {getSelectedRow()?.label} ({getSelectedRow()?.startTime} - {getSelectedRow()?.endTime})
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
              <input
                type="text"
                placeholder="e.g., Mathematics"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition">
                Save
              </button>
              {(() => {
                const row = getSelectedRow();
                const existing = row ? getCellData(row, selectedCell.day) : null;
                return existing ? (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                ) : null;
              })()}
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
