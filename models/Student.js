export const normalizeStudentPayload = (payload = {}) => ({
  name: String(payload?.name ?? "").trim(),
  rollNo: String(payload?.rollNo ?? "").trim(),
  class: String(payload?.class ?? payload?.className ?? "").trim(),
  className: String(payload?.className ?? payload?.class ?? "").trim(),
  section: String(payload?.section ?? "").trim(),
  parentName: String(payload?.parentName ?? "").trim(),
  parentPhone: String(payload?.parentPhone ?? payload?.phone ?? "").trim(),
  email: String(payload?.email ?? "").trim().toLowerCase(),
  status: String(payload?.status ?? "Active").trim() || "Active",
});

export default function StudentModel(db) {
  return db.collection("students");
}
