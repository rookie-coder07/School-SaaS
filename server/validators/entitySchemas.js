const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const ok = () => ({ valid: true });
const fail = (error) => ({ valid: false, error });

export function validateSchoolInput(payload = {}) {
  if (!isNonEmptyString(payload.name)) return fail("School name is required");
  if (payload.address != null && typeof payload.address !== "string") return fail("School address must be a string");
  if (payload.status != null && !["active", "disabled"].includes(String(payload.status).toLowerCase())) {
    return fail("School status must be active or disabled");
  }
  return ok();
}

export function validateTeacherInput(payload = {}) {
  if (!isNonEmptyString(payload.name)) return fail("Teacher name is required");
  if (!isNonEmptyString(String(payload.schoolId || ""))) return fail("Teacher schoolId is required");
  if (!isNonEmptyString(String(payload.class || ""))) return fail("Teacher class is required");
  if (!isNonEmptyString(String(payload.section || ""))) return fail("Teacher section is required");
  return ok();
}

export function validateStudentInput(payload = {}) {
  if (!isNonEmptyString(payload.name)) return fail("Student name is required");
  if (!isNonEmptyString(String(payload.admissionNumber || payload.rollNo || ""))) return fail("Student admissionNumber is required");
  if (!isNonEmptyString(String(payload.schoolId || ""))) return fail("Student schoolId is required");
  if (!isNonEmptyString(String(payload.class || payload.className || ""))) return fail("Student class is required");
  if (!isNonEmptyString(payload.section)) return fail("Student section is required");
  if (payload.parentName != null && !isNonEmptyString(String(payload.parentName || ""))) return fail("Student parentName must be non-empty when provided");
  if (payload.parentPhone != null && !isNonEmptyString(String(payload.parentPhone || ""))) return fail("Student parentPhone must be non-empty when provided");
  return ok();
}

export function validateAttendanceInput(payload = {}) {
  if (!isNonEmptyString(String(payload.studentId || ""))) return fail("Attendance studentId is required");
  if (!isNonEmptyString(String(payload.schoolId || ""))) return fail("Attendance schoolId is required");
  if (!isNonEmptyString(String(payload.class || ""))) return fail("Attendance class is required");
  if (!isNonEmptyString(String(payload.section || ""))) return fail("Attendance section is required");
  if (!isNonEmptyString(String(payload.date || ""))) return fail("Attendance date is required");
  const normalizedStatus = String(payload.status || "").toLowerCase();
  if (!["present", "absent", "leave"].includes(normalizedStatus)) return fail("Attendance status is invalid");
  return ok();
}

export function validateExamInput(payload = {}) {
  if (!isNonEmptyString(String(payload.name || payload.exam || ""))) return fail("Exam name is required");
  if (payload.maxMarks != null && (!Number.isFinite(Number(payload.maxMarks)) || Number(payload.maxMarks) <= 0)) {
    return fail("Exam maxMarks must be a positive number");
  }
  return ok();
}

export function validateAnalyticsInput(payload = {}) {
  if (!isNonEmptyString(String(payload.metric || ""))) return fail("Analytics metric is required");
  if (!Number.isFinite(Number(payload.value))) return fail("Analytics value must be numeric");
  return ok();
}

export function validateNotificationInput(payload = {}) {
  if (!isNonEmptyString(String(payload.title || ""))) return fail("Notification title is required");
  if (!isNonEmptyString(String(payload.message || ""))) return fail("Notification message is required");
  if (!isNonEmptyString(String(payload.targetRole || ""))) return fail("Notification targetRole is required");
  return ok();
}
