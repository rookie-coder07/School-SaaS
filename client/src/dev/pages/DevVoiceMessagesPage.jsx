import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TypeConfirmModal from "../components/TypeConfirmModal";
import DevRowActionMenu from "../components/DevRowActionMenu";
import { pushDevToast } from "../utils/devToast";
import { getCachedValue } from "../utils/devApiCache";

const API_URL = import.meta.env.VITE_API_URL;
const FILTERS_STORAGE_KEY = "dev_voice_filters_v1";
const PRESETS_STORAGE_KEY = "dev_voice_filter_presets_v1";
const DEV_SCHOOLS_CACHE_KEY = "dev_schools_meta_v1";
const DEV_SCHOOLS_CACHE_TTL_MS = 5 * 60 * 1000;

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const downloadFile = (filename, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const resolveAudioUrl = (audioUrl = "") => {
  const value = String(audioUrl || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_URL}${value}`;
  return `${API_URL}/${value}`;
};

export default function DevVoiceMessagesPage() {
  const token = localStorage.getItem("developerToken");
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState(() => localStorage.getItem(FILTERS_STORAGE_KEY) || "");
  const [presets, setPresets] = useState(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [presetName, setPresetName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [lastDeletedId, setLastDeletedId] = useState("");
  const [toast, setToast] = useState("");
  const [deleteState, setDeleteState] = useState({ open: false, message: null, busy: false });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
    pushDevToast({ type: "info", message: msg, durationMs: 8000 });
  };

  const loadMeta = useCallback(async () => {
    const schoolRows = await getCachedValue(DEV_SCHOOLS_CACHE_KEY, DEV_SCHOOLS_CACHE_TTL_MS, async () => {
      const response = await fetch(`${API_URL}/api/dev/schools?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to load schools");
      }
      return Array.isArray(payload?.data) ? payload.data : [];
    });
    setSchools(schoolRows);
  }, [token]);

  const loadMessages = useCallback(async () => {
    const query = schoolFilter ? `?schoolId=${encodeURIComponent(schoolFilter)}&limit=200` : "?limit=200";
    const response = await fetch(`${API_URL}/api/dev/voice-messages${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || payload?.error || "Failed to load voice messages");
    }
    setMessages(Array.isArray(payload?.data) ? payload.data : []);
  }, [schoolFilter, token]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadMeta();
      } catch (err) {
        setError(err?.message || "Failed to load schools");
      }
    };
    load();
  }, [loadMeta]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await loadMessages();
      } catch (err) {
        setError(err?.message || "Failed to load voice messages");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadMessages]);

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, String(schoolFilter || ""));
  }, [schoolFilter]);

  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    setPresets((prev) => ({ ...prev, [name]: { schoolFilter: String(schoolFilter || "") } }));
    setSelectedPreset(name);
    setPresetName("");
    showToast(`Saved preset: ${name}`);
  };

  const applyPreset = (name) => {
    const preset = presets?.[name];
    if (!preset) return;
    setSchoolFilter(String(preset.schoolFilter || ""));
    setSelectedPreset(name);
    showToast(`Applied preset: ${name}`);
  };

  const deletePreset = () => {
    if (!selectedPreset) return;
    setPresets((prev) => {
      const next = { ...prev };
      delete next[selectedPreset];
      return next;
    });
    showToast(`Deleted preset: ${selectedPreset}`);
    setSelectedPreset("");
  };

  const schoolNameMap = useMemo(() => {
    const map = new Map();
    for (const school of schools) map.set(String(school._id), school.name || "Unknown School");
    return map;
  }, [schools]);

  const filteredRows = useMemo(() => {
    const globalQ = String(searchParams.get("q") || "").trim().toLowerCase();
    return messages.filter((msg) => {
      if (!globalQ) return true;
      const sender = msg.senderName || msg.teacherName || msg.createdByName || "Unknown";
      const schoolName = schoolNameMap.get(String(msg.schoolId || "")) || String(msg.schoolId || "");
      const blob = `${sender} ${schoolName} ${msg._id || ""}`.toLowerCase();
      return blob.includes(globalQ);
    });
  }, [messages, schoolNameMap, searchParams]);

  const pagedRows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const openDelete = (msg) => setDeleteState({ open: true, message: msg, busy: false });

  const confirmDelete = async () => {
    const target = deleteState.message;
    if (!target?._id) return;
    try {
      setDeleteState((prev) => ({ ...prev, busy: true }));
      const response = await fetch(`${API_URL}/api/dev/voice-messages/${target._id}?confirm=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to delete voice message");
      }
      setMessages((prev) => prev.filter((row) => row._id !== target._id));
      setLastDeletedId(String(target._id));
      showToast("Voice message deleted");
      pushDevToast({
        type: "warning",
        message: "Voice message deleted",
        durationMs: 8000,
        actionLabel: "Undo",
        onAction: () => undoLastDelete(),
      });
      setDeleteState({ open: false, message: null, busy: false });
    } catch (err) {
      showToast(err?.message || "Delete failed");
      setDeleteState((prev) => ({ ...prev, busy: false }));
    }
  };

  const undoLastDelete = async () => {
    if (!lastDeletedId) return;
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/dev/voice-messages/${lastDeletedId}/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Undo failed");
      }
      await loadMessages();
      setLastDeletedId("");
      showToast("Voice message restored");
    } catch (err) {
      showToast(err?.message || "Undo failed");
    } finally {
      setLoading(false);
    }
  };

  const exportMessagesJson = () => {
    const rows = filteredRows.map((msg) => ({
      id: msg._id || "",
      teacher: msg.senderName || msg.teacherName || msg.createdByName || "Unknown",
      school: schoolNameMap.get(String(msg.schoolId || "")) || String(msg.schoolId || ""),
      duration: msg.duration || msg.durationSec || "",
      createdAt: msg.createdAt || "",
      audioUrl: resolveAudioUrl(msg.audioUrl || msg.fileUrl || msg.url || ""),
    }));
    downloadFile("dev-voice-messages-export.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
    showToast("Voice messages JSON exported");
  };

  const exportMessagesCsv = () => {
    const headers = ["Message ID", "Teacher", "School", "Duration", "Created At", "Audio URL"];
    const lines = [
      headers.map(csvCell).join(","),
      ...filteredRows.map((msg) =>
        [
          msg._id || "",
          msg.senderName || msg.teacherName || msg.createdByName || "Unknown",
          schoolNameMap.get(String(msg.schoolId || "")) || String(msg.schoolId || ""),
          msg.duration || msg.durationSec || "",
          msg.createdAt || "",
          resolveAudioUrl(msg.audioUrl || msg.fileUrl || msg.url || ""),
        ]
          .map(csvCell)
          .join(",")
      ),
    ];
    downloadFile("dev-voice-messages-export.csv", lines.join("\n"), "text/csv;charset=utf-8");
    showToast("Voice messages CSV exported");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Voice Messages Control</h1>
        <p className="mt-1 text-sm text-slate-300">Inspect, play, download and remove platform voice messages.</p>
      </div>

      {toast ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{toast}</div> : null}
      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">School Filter</label>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school._id} value={school._id}>{school.name}</option>
            ))}
          </select>
          <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400" />
          <button onClick={savePreset} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">Save Preset</button>
          <div className="flex gap-2">
            <select value={selectedPreset} onChange={(e) => { const name = e.target.value; setSelectedPreset(name); if (name) applyPreset(name); }} className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
              <option value="">Apply Preset</option>
              {Object.keys(presets).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button onClick={deletePreset} disabled={!selectedPreset} className="rounded-lg bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60">Delete</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportMessagesCsv} className="rounded-lg bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/30">Export CSV</button>
          <button onClick={exportMessagesJson} className="rounded-lg bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/30">Export JSON</button>
          <button onClick={undoLastDelete} disabled={!lastDeletedId || loading} className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60">Undo Last Delete</button>
        </div>
      </section>

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/45 backdrop-blur-xl md:block">
        <table className="w-full min-w-[1100px] text-left text-sm text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3">Play</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>Loading voice messages...</td></tr>
            ) : pagedRows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>No voice messages found</td></tr>
            ) : (
              pagedRows.map((msg) => {
                const audioUrl = resolveAudioUrl(msg.audioUrl || msg.fileUrl || msg.url || "");
                const schoolName = schoolNameMap.get(String(msg.schoolId || "")) || String(msg.schoolId || "-");
                const sender = msg.senderName || msg.teacherName || msg.createdByName || "Unknown";
                const createdAt = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "-";
                const duration = msg.duration || msg.durationSec || "-";
                return (
                  <tr key={msg._id} className="border-t border-white/10">
                    <td className="px-4 py-3">{sender}</td>
                    <td className="px-4 py-3">{schoolName}</td>
                    <td className="px-4 py-3">{duration}</td>
                    <td className="px-4 py-3">{createdAt}</td>
                    <td className="px-4 py-3">
                      {audioUrl ? (
                        <audio controls preload="none" className="h-8 w-56">
                          <source src={audioUrl} />
                        </audio>
                      ) : (
                        <span className="text-xs text-slate-400">No audio</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DevRowActionMenu
                        actions={[
                          {
                            label: "Download Audio",
                            disabled: !audioUrl,
                            onClick: () => {
                              if (!audioUrl) return;
                              window.open(audioUrl, "_blank", "noopener,noreferrer");
                            },
                          },
                          { label: "Delete", danger: true, disabled: deleteState.busy && deleteState.message?._id === msg._id, onClick: () => openDelete(msg) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {pagedRows.map((msg) => {
          const sender = msg.senderName || msg.teacherName || msg.createdByName || "Unknown";
          const schoolName = schoolNameMap.get(String(msg.schoolId || "")) || String(msg.schoolId || "-");
          const duration = msg.duration || msg.durationSec || "-";
          const createdAt = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "-";
          const audioUrl = resolveAudioUrl(msg.audioUrl || msg.fileUrl || msg.url || "");
          return (
            <article key={msg._id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="font-semibold text-white">{sender}</p>
              <p className="text-xs text-slate-300">{schoolName}</p>
              <p className="mt-1 text-xs text-slate-400">Duration: {duration} | {createdAt}</p>
              <div className="mt-2">
                {audioUrl ? (
                  <audio controls preload="none" className="h-8 w-full">
                    <source src={audioUrl} />
                  </audio>
                ) : (
                  <span className="text-xs text-slate-400">No audio</span>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <DevRowActionMenu
                  actions={[
                    {
                      label: "Download Audio",
                      disabled: !audioUrl,
                      onClick: () => {
                        if (!audioUrl) return;
                        window.open(audioUrl, "_blank", "noopener,noreferrer");
                      },
                    },
                    { label: "Delete", danger: true, disabled: deleteState.busy && deleteState.message?._id === msg._id, onClick: () => openDelete(msg) },
                  ]}
                />
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-slate-300">
        <p>Rows: {filteredRows.length}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50">Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>

      <TypeConfirmModal
        isOpen={deleteState.open}
        title="Delete Voice Message"
        message="Delete this voice message?"
        confirmKeyword="DELETE"
        confirmText={deleteState.busy ? "Deleting..." : "Delete"}
        isLoading={deleteState.busy}
        onCancel={() => setDeleteState({ open: false, message: null, busy: false })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
