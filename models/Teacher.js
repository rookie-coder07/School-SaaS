export const normalizeTeacherPayload = (payload = {}) => {
  const phone = String(
    payload?.phone ?? payload?.mobile ?? payload?.contact ?? payload?.contactNumber ?? ""
  ).trim();

  return {
    name: String(payload?.name ?? "").trim(),
    email: String(payload?.email ?? "").trim().toLowerCase(),
    class: String(payload?.class ?? payload?.className ?? "").trim(),
    section: String(payload?.section ?? "").trim(),
    subject: payload?.subject ?? "",
    phone,
    mobile: phone,
  };
};

export default function TeacherModel(db) {
  return db.collection("teachers");
}

