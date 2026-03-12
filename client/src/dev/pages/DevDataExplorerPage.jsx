import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TypeConfirmModal from "../components/TypeConfirmModal";
import DevRowActionMenu from "../components/DevRowActionMenu";
import { pushDevToast } from "../utils/devToast";
import { getCachedValue } from "../utils/devApiCache";

const API_URL = import.meta.env.VITE_API_URL;
const FILTERS_STORAGE_KEY = "dev_data_explorer_filters_v1";
const PRESETS_STORAGE_KEY = "dev_data_explorer_presets_v1";
const DEV_SCHOOLS_CACHE_KEY = "dev_schools_meta_v1";
const DEV_SCHOOLS_CACHE_TTL_MS = 5 * 60 * 1000;
const selectClass = "relative z-20 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100";
const selectStyle = { backgroundColor: "#0f172a", color: "#e2e8f0", zIndex: 999 };

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

const tabConfig = [
  { id: "students", label: "Students", endpoint: "/api/dev/data/students", columns: ["name", "_id", "class", "section", "rollNo", "schoolId", "isDeleted", "updatedAt"], editableFields: ["name", "class", "section", "rollNo", "isDeleted"] },
  { id: "teachers", label: "Teachers", endpoint: "/api/dev/data/teachers", columns: ["name", "_id", "subject", "class", "section", "schoolId", "isDeleted", "updatedAt"], editableFields: ["name", "subject", "class", "section", "isDeleted"] },
  { id: "attendance", label: "Attendance", endpoint: "/api/dev/data/attendance", columns: ["_id", "studentId", "class", "section", "status", "date", "schoolId", "updatedAt"], editableFields: ["status", "class", "section"] },
  { id: "homework", label: "Homework", endpoint: "/api/dev/data/homework", columns: ["title", "_id", "subject", "class", "section", "dueDate", "schoolId", "updatedAt"], editableFields: ["title", "description", "subject", "class", "section", "dueDate"] },
  { id: "exams", label: "Exams", endpoint: "/api/dev/data/exams", columns: ["name", "_id", "subject", "class", "section", "examDate", "maxMarks", "schoolId", "updatedAt"], editableFields: ["name", "examName", "title", "subject", "class", "section", "examDate", "date", "maxMarks"] },
];

const extractClass = (row = {}) => String(row.class || row.className || row.standard || "").trim();
const extractSection = (row = {}) => String(row.section || row.sec || "").trim();

export default function DevDataExplorerPage() {
  const token = localStorage.getItem("developerToken");
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? String(JSON.parse(raw)?.activeTab || "students") : "students";
    } catch {
      return "students";
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [actionBusyId, setActionBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [editState, setEditState] = useState({ open: false, id: "", original: {}, draft: {} });
  const [deleteState, setDeleteState] = useState({ open: false, id: "" });
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        schoolId: searchParams.get("schoolId") || String(parsed?.filters?.schoolId || ""),
        className: String(parsed?.filters?.className || ""),
        section: String(parsed?.filters?.section || ""),
      };
    } catch {
      return { schoolId: searchParams.get("schoolId") || "", className: "", section: "" };
    }
  });
  const [searchText, setSearchText] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? String(JSON.parse(raw)?.searchText || "") : "";
    } catch {
      return "";
    }
  });
  const [sortKey, setSortKey] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? String(JSON.parse(raw)?.sortKey || "") : "";
    } catch {
      return "";
    }
  });
  const [sortDir, setSortDir] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      const value = raw ? String(JSON.parse(raw)?.sortDir || "desc") : "desc";
      return value === "asc" ? "asc" : "desc";
    } catch {
      return "desc";
    }
  });
  const [density, setDensity] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? String(JSON.parse(raw)?.density || "comfortable") : "comfortable";
    } catch {
      return "comfortable";
    }
  });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw)?.visibleColumns : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
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

  const activeEndpoint = useMemo(() => tabConfig.find((tab) => tab.id === activeTab)?.endpoint || "/api/dev/data/students", [activeTab]);
  const activeConfig = useMemo(() => tabConfig.find((tab) => tab.id === activeTab) || tabConfig[0], [activeTab]);

  const loadSchools = useCallback(async () => {
    const schoolRows = await getCachedValue(DEV_SCHOOLS_CACHE_KEY, DEV_SCHOOLS_CACHE_TTL_MS, async () => {
      const response = await fetch(`${API_URL}/api/dev/schools?page=1&limit=200`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) throw new Error(payload?.message || payload?.error || "Failed to load schools");
      return Array.isArray(payload?.data) ? payload.data : [];
    });
    setSchools(schoolRows);
  }, [token]);

  const loadRows = useCallback(async () => {
    const query = new URLSearchParams({ page: "1", limit: "200" });
    if (filters.schoolId) query.set("schoolId", filters.schoolId);
    const response = await fetch(`${API_URL}${activeEndpoint}?${query.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) throw new Error(payload?.message || payload?.error || "Failed to load data");
    setRows(Array.isArray(payload?.data) ? payload.data : []);
  }, [activeEndpoint, filters.schoolId, token]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadSchools();
      } catch (err) {
        setError(err?.message || "Failed to load schools");
      }
    };
    load();
  }, [loadSchools]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await loadRows();
      } catch (err) {
        setError(err?.message || "Failed to load data explorer");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadRows]);

  useEffect(() => {
    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        activeTab,
        filters,
        searchText,
        sortKey,
        sortDir,
        density,
        visibleColumns,
      })
    );
  }, [activeTab, filters, searchText, sortKey, sortDir, density, visibleColumns]);

  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const filteredRows = useMemo(() => {
    const textQuery = String(searchText || "").trim().toLowerCase();
    const globalQ = String(searchParams.get("q") || "").trim().toLowerCase();
    const base = rows.filter((row) => {
      if (filters.className && extractClass(row).toLowerCase() !== filters.className.toLowerCase()) return false;
      if (filters.section && extractSection(row).toLowerCase() !== filters.section.toLowerCase()) return false;
      if (textQuery && !JSON.stringify(row || {}).toLowerCase().includes(textQuery)) return false;
      if (globalQ && !JSON.stringify(row || {}).toLowerCase().includes(globalQ)) return false;
      return true;
    });
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      const at = String(a?.[sortKey] ?? "").toLowerCase();
      const bt = String(b?.[sortKey] ?? "").toLowerCase();
      if (at < bt) return sortDir === "asc" ? -1 : 1;
      if (at > bt) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, filters.className, filters.section, searchText, sortKey, sortDir, searchParams]);

  const columns = useMemo(() => activeConfig.columns || [], [activeConfig]);
  const activeColumns = useMemo(() => columns.filter((c) => visibleColumns[c] !== false), [columns, visibleColumns]);
  const classOptions = useMemo(() => {
    const set = new Set();
    for (const row of rows) {
      const value = extractClass(row);
      if (value) set.add(value);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const sectionOptions = useMemo(() => {
    const set = new Set();
    for (const row of rows) {
      const value = extractSection(row);
      if (value) set.add(value);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const pagedRows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const toText = (value) => {
    if (value == null || value === "") return "-";
    if (typeof value === "object") return value?.$date ? String(value.$date) : JSON.stringify(value);
    return String(value);
  };

  const parseTypedValue = (value, referenceValue) => {
    const raw = String(value ?? "");
    if (typeof referenceValue === "boolean") return raw.toLowerCase() === "true";
    if (typeof referenceValue === "number") {
      const num = Number(raw);
      return Number.isNaN(num) ? referenceValue : num;
    }
    return raw;
  };

  const hasChanges = useMemo(() => {
    if (!editState.open) return false;
    return Object.keys(editState.draft || {}).some((k) => String(editState.draft[k] ?? "") !== String(editState.original?.[k] ?? ""));
  }, [editState]);

  const reloadRows = async () => {
    setLoading(true);
    setError("");
    try {
      await loadRows();
    } catch (err) {
      setError(err?.message || "Failed to reload data");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteRow = (row) => {
    const id = String(row?._id || "");
    if (!id) return;
    setDeleteState({ open: true, id });
  };

  const deleteRow = async () => {
    const id = deleteState.id;
    if (!id) return;
    try {
      setActionBusyId(id);
      setNotice("");
      const response = await fetch(`${API_URL}/api/dev/data/${activeTab}/${id}?confirm=true`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) throw new Error(payload?.message || payload?.error || "Delete failed");
      setNotice("Record deleted. You can use Undo to restore it.");
      pushDevToast({
        type: "warning",
        message: "Record deleted",
        durationMs: 8000,
        actionLabel: "Undo",
        onAction: () => undoRow({ _id: id }),
      });
      setDeleteState({ open: false, id: "" });
      await reloadRows();
    } catch (err) {
      setError(err?.message || "Delete failed");
    } finally {
      setActionBusyId("");
    }
  };

  const undoRow = async (row) => {
    const id = String(row?._id || "");
    if (!id) return;
    try {
      setActionBusyId(id);
      setNotice("");
      const response = await fetch(`${API_URL}/api/dev/data/${activeTab}/${id}/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) throw new Error(payload?.message || payload?.error || "Undo failed");
      setNotice("Record restored.");
      await reloadRows();
    } catch (err) {
      setError(err?.message || "Undo failed");
    } finally {
      setActionBusyId("");
    }
  };

  const editRow = (row) => {
    const id = String(row?._id || "");
    if (!id) return;
    const draft = {};
    for (const field of activeConfig.editableFields || []) draft[field] = row?.[field] ?? "";
    setEditState({ open: true, id, original: { ...draft }, draft });
  };

  const closeEdit = () => setEditState({ open: false, id: "", original: {}, draft: {} });

  const saveEdit = async () => {
    const id = editState.id;
    if (!id) return;
    const updates = {};
    for (const field of Object.keys(editState.draft || {})) {
      const prevValue = editState.original?.[field];
      const nextValue = parseTypedValue(editState.draft?.[field], prevValue);
      if (String(nextValue ?? "") !== String(prevValue ?? "")) updates[field] = nextValue;
    }
    if (Object.keys(updates).length === 0) return closeEdit();

    try {
      setActionBusyId(id);
      setNotice("");
      const response = await fetch(`${API_URL}/api/dev/data/${activeTab}/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) throw new Error(payload?.message || payload?.error || "Edit failed");
      setNotice("Record updated.");
      closeEdit();
      await reloadRows();
    } catch (err) {
      setError(err?.message || "Edit failed");
    } finally {
      setActionBusyId("");
    }
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    setPresets((prev) => ({
      ...prev,
      [name]: { activeTab, filters: { ...filters }, searchText, sortKey, sortDir, density, visibleColumns },
    }));
    setSelectedPreset(name);
    setPresetName("");
    setNotice(`Saved preset: ${name}`);
  };

  const applyPreset = (name) => {
    const preset = presets?.[name];
    if (!preset) return;
    setActiveTab(String(preset.activeTab || "students"));
    setFilters({
      schoolId: String(preset?.filters?.schoolId || ""),
      className: String(preset?.filters?.className || ""),
      section: String(preset?.filters?.section || ""),
    });
    setSearchText(String(preset.searchText || ""));
    setSortKey(String(preset.sortKey || ""));
    setSortDir(String(preset.sortDir || "desc") === "asc" ? "asc" : "desc");
    setDensity(String(preset.density || "comfortable"));
    setVisibleColumns(preset.visibleColumns && typeof preset.visibleColumns === "object" ? preset.visibleColumns : {});
    setSelectedPreset(name);
    setNotice(`Applied preset: ${name}`);
  };

  const deletePreset = () => {
    if (!selectedPreset) return;
    setPresets((prev) => {
      const next = { ...prev };
      delete next[selectedPreset];
      return next;
    });
    setNotice(`Deleted preset: ${selectedPreset}`);
    setSelectedPreset("");
  };

  const exportRowsJson = () => {
    const exportRows = filteredRows.map((row) =>
      activeColumns.reduce((acc, column) => {
        acc[column] = row?.[column] ?? "";
        return acc;
      }, { _id: row?._id || "" })
    );
    downloadFile(`dev-data-explorer-${activeTab}.json`, JSON.stringify(exportRows, null, 2), "application/json;charset=utf-8");
    setNotice(`Exported ${exportRows.length} rows as JSON`);
  };

  const exportRowsCsv = () => {
    const headers = ["_id", ...activeColumns];
    const lines = [
      headers.map(csvCell).join(","),
      ...filteredRows.map((row) =>
        [row?._id || "", ...activeColumns.map((column) => toText(row?.[column]))]
          .map(csvCell)
          .join(",")
      ),
    ];
    downloadFile(`dev-data-explorer-${activeTab}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
    setNotice(`Exported ${filteredRows.length} rows as CSV`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Data Explorer</h1>
        <p className="mt-1 text-sm text-slate-300">Browse core platform collections with school/class/section filters.</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{notice}</div> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {tabConfig.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? "rounded-full border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100" : "rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">School</p>
            <select value={filters.schoolId} onChange={(e) => setFilters((prev) => ({ ...prev, schoolId: e.target.value }))} className={selectClass} style={selectStyle}>
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school._id} value={school._id}>{school.name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Class</p>
            <select value={filters.className} onChange={(e) => setFilters((prev) => ({ ...prev, className: e.target.value }))} className={selectClass} style={selectStyle}>
              <option value="">{classOptions.length ? "All Classes" : "No classes available"}</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Section</p>
            <select value={filters.section} onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))} className={selectClass} style={selectStyle}>
              <option value="">{sectionOptions.length ? "All Sections" : "No sections available"}</option>
              {sectionOptions.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Search</p>
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search all visible fields" className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Sort</p>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={selectClass} style={selectStyle}>
              <option value="">Sort by</option>
              {columns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Order</p>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className={selectClass} style={selectStyle}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Density</p>
            <select value={density} onChange={(e) => setDensity(e.target.value)} className={selectClass} style={selectStyle}>
              <option value="comfortable">Density: Comfortable</option>
              <option value="compact">Density: Compact</option>
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Columns</p>
            <div className="flex flex-wrap gap-2">
              {columns.map((column) => (
                <label key={column} className="inline-flex items-center gap-1 text-xs text-slate-200">
                  <input type="checkbox" checked={visibleColumns[column] !== false} onChange={(e) => setVisibleColumns((prev) => ({ ...prev, [column]: e.target.checked }))} />
                  {column}
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Record Count</p>
            <p className="text-sm text-slate-200">{filteredRows.length} visible</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="saas-input-dark" />
          <button onClick={savePreset} className="saas-button-dark">Save Preset</button>
          <select value={selectedPreset} onChange={(e) => { const name = e.target.value; setSelectedPreset(name); if (name) applyPreset(name); }} className={selectClass} style={selectStyle}>
            <option value="">Apply Preset</option>
            {Object.keys(presets).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button onClick={deletePreset} disabled={!selectedPreset} className="saas-button-dark disabled:cursor-not-allowed disabled:opacity-60">Delete Preset</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportRowsCsv} className="saas-button-dark">Export CSV</button>
          <button onClick={exportRowsJson} className="saas-button-dark">Export JSON</button>
        </div>
      </section>

      <div className="hidden md:block overflow-x-auto max-h-[520px] rounded-2xl border border-white/10 bg-slate-950/45 backdrop-blur-xl">
        <table className="saas-table-dark min-w-[1100px]">
          <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {activeColumns.map((column) => (
                <th key={column} className="px-4 py-3">{column}</th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={Math.max(1, activeColumns.length + 1)}>Loading data...</td></tr>
            ) : pagedRows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={Math.max(1, activeColumns.length + 1)}>No data found</td></tr>
            ) : (
              pagedRows.map((row, index) => (
                <tr key={String(row?._id || index)} className="border-t border-white/10">
                  {activeColumns.map((column) => (
                    <td key={`${String(row?._id || index)}-${column}`} className={`${density === "compact" ? "px-3 py-2" : "px-4 py-3"} max-w-xs truncate`}>
                      {toText(row?.[column])}
                    </td>
                  ))}
                  <td className={`${density === "compact" ? "px-3 py-2" : "px-4 py-3"} text-right`}>
                    <DevRowActionMenu
                      actions={[
                        { label: "Edit", disabled: actionBusyId === String(row?._id || ""), onClick: () => editRow(row) },
                        { label: "Undo", disabled: actionBusyId === String(row?._id || ""), onClick: () => undoRow(row) },
                        { label: "Delete", danger: true, disabled: actionBusyId === String(row?._id || ""), onClick: () => requestDeleteRow(row) },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-center text-sm text-slate-400">Loading data...</div>
        ) : pagedRows.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-center text-sm text-slate-400">No data found</div>
        ) : (
          pagedRows.map((row, index) => {
            const titleColumn = activeColumns[0];
            const subtitleColumns = activeColumns.slice(1, 4);
            return (
              <article key={String(row?._id || index)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-sm font-semibold text-white">{toText(row?.[titleColumn]) || "Record"}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-300">
                  {subtitleColumns.map((column) => (
                    <p key={`${String(row?._id || index)}-${column}`}>
                      <span className="text-slate-400">{column}:</span> {toText(row?.[column]) || "-"}
                    </p>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <DevRowActionMenu
                    actions={[
                      { label: "Edit", disabled: actionBusyId === String(row?._id || ""), onClick: () => editRow(row) },
                      { label: "Undo", disabled: actionBusyId === String(row?._id || ""), onClick: () => undoRow(row) },
                      { label: "Delete", danger: true, disabled: actionBusyId === String(row?._id || ""), onClick: () => requestDeleteRow(row) },
                    ]}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-slate-300">
        <p>Records: {filteredRows.length}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50">Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>

      {editState.open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-slate-950/55 md:items-center md:justify-center">
          <div className="h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/15 bg-slate-900 p-5 md:h-auto md:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Record</h2>
                <p className="text-xs text-slate-300">ID: {editState.id}</p>
              </div>
              <button type="button" onClick={closeEdit} className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-white/20">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(activeConfig.editableFields || []).map((field) => (
                <label key={field} className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{field}</span>
                  <input value={String(editState.draft?.[field] ?? "")} onChange={(e) => setEditState((prev) => ({ ...prev, draft: { ...prev.draft, [field]: e.target.value } }))} className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400" />
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Changes Preview</p>
              {!hasChanges ? (
                <p className="text-sm text-slate-400">No changes yet.</p>
              ) : (
                <div className="space-y-1 text-sm text-slate-200">
                  {Object.keys(editState.draft || {})
                    .filter((key) => String(editState.draft[key] ?? "") !== String(editState.original?.[key] ?? ""))
                    .map((key) => (
                      <p key={key}><span className="font-semibold text-cyan-200">{key}</span>: {toText(editState.original?.[key])} {"->"} {toText(editState.draft?.[key])}</p>
                    ))}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeEdit} className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/20">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={!hasChanges || actionBusyId === editState.id} className="rounded-md border border-cyan-300/30 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60">
                {actionBusyId === editState.id ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TypeConfirmModal
        isOpen={deleteState.open}
        title="Delete Record"
        message="This will remove the selected record from the collection. Undo is available if a snapshot exists."
        confirmKeyword="DELETE"
        confirmText="Delete Record"
        isLoading={actionBusyId === deleteState.id}
        onCancel={() => setDeleteState({ open: false, id: "" })}
        onConfirm={deleteRow}
      />
    </div>
  );
}
