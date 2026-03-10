import express from "express";
import os from "os";
import bcrypt from "bcryptjs";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";
import {
  validateSchoolInput,
  validateTeacherInput,
  validateStudentInput,
  validateAttendanceInput,
  validateExamInput,
  validateAnalyticsInput,
  validateNotificationInput,
} from "../validators/entitySchemas.js";
import devIpGuard from "../middleware/devIpGuard.js";
import { logDeveloperAction } from "../services/devAuditService.js";
import { createPlatformControlService } from "../services/platformControlService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toObjectId = (value) => {
  try {
    if (!value) return null;
    return new ObjectId(String(value));
  } catch {
    return null;
  }
};

const formatUptime = (secondsValue = 0) => {
  const seconds = Math.max(0, Math.floor(Number(secondsValue) || 0));
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  return `${minutes}m ${remSeconds}s`;
};

const parsePagination = (query, fallbackLimit = 50) => {
  const page = Math.max(1, Number.parseInt(query?.page, 10) || 1);
  const limit = Math.max(1, Math.min(200, Number.parseInt(query?.limit, 10) || fallbackLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const ensureBoolean = (value, fieldName) => {
  if (typeof value !== "boolean") {
    const err = new Error(`${fieldName} boolean required`);
    err.statusCode = 400;
    throw err;
  }
  return value;
};

const normalizeSchoolStatus = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "disabled" ? "disabled" : "active";
};

const handleError = (res, err, fallback = "Request failed") => {
  const status = Number(err?.statusCode) || 500;
  const message = String(err?.message || fallback);
  return res.status(status).json({ success: false, error: message, message });
};

const requireConfirmation = (req) => {
  if (String(req.query?.confirm || "").toLowerCase() !== "true") {
    const err = new Error("Confirmation required. Add ?confirm=true");
    err.statusCode = 400;
    throw err;
  }
};

const DATA_COLLECTIONS = {
  students: "students",
  teachers: "teachers",
  attendance: "attendance",
  homework: "homework",
  exams: "exams",
};

const DATA_EDITABLE_FIELDS = {
  students: ["name", "class", "section", "rollNo", "isDeleted"],
  teachers: ["name", "subject", "class", "section", "isDeleted"],
  attendance: ["status", "class", "section"],
  homework: ["title", "description", "subject", "class", "section", "dueDate"],
  exams: ["name", "examName", "title", "subject", "class", "section", "examDate", "date", "maxMarks"],
};

const resolveDataCollection = (entity) => {
  const normalized = String(entity || "").trim().toLowerCase();
  const collectionName = DATA_COLLECTIONS[normalized];
  if (!collectionName) {
    const err = new Error("Unsupported data explorer entity");
    err.statusCode = 400;
    throw err;
  }
  return { entity: normalized, collectionName };
};

export default function devRoutes({
  db,
  requireAuth,
  requireDeveloper,
  isMongoConnected,
  controlState = { maintenanceMode: false, uploadsDisabled: false, forceLogoutIssuedAfter: 0 },
  clearCache = () => true,
}) {
  const router = express.Router();
  router.use(requireAuth, requireDeveloper, devIpGuard);
  const platformControlService = createPlatformControlService({ db, controlState, clearCache });

  const audit = async (req, { action, targetType, targetId, metadata = {} }) => {
    console.log("[DEV ACTION]", action, targetId || "");
    await logDeveloperAction({
      db,
      developerId: req?.user?.userId || "unknown",
      action,
      targetType,
      targetId,
      metadata,
      req,
    });
  };

  router.get("/dashboard", async (_req, res) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [totalSchools, usersCount, apiRequests, errorsToday] = await Promise.all([
        db.collection("schools").countDocuments({ isDeleted: { $ne: true } }),
        db.collection("users").countDocuments({ isDeleted: { $ne: true } }),
        db.collection("requestTraces").countDocuments({ createdAt: { $gte: oneDayAgo } }),
        db.collection("activityLogs").countDocuments({ createdAt: { $gte: oneDayAgo }, action: "error" }),
      ]);
      return res.json({
        success: true,
        data: {
          systemUptime: formatUptime(process.uptime()),
          activeUsers: Math.max(1, Math.round(usersCount * 0.3)),
          apiRequests,
          errorsToday,
          totalSchools,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch dashboard data");
    }
  });

  router.get("/portal/overview", async (_req, res) => {
    try {
      const [totalSchools, totalStudents, totalTeachers, apiRequestsToday] = await Promise.all([
        db.collection("schools").countDocuments({ isDeleted: { $ne: true } }),
        db.collection("users").countDocuments({ role: "STUDENT", isDeleted: { $ne: true } }),
        db.collection("users").countDocuments({ role: "TEACHER", isDeleted: { $ne: true } }),
        db.collection("requestTraces").countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      ]);
      return res.json({
        success: true,
        data: {
          totalSchools,
          totalStudents,
          totalTeachers,
          activeUsers: Math.max(1, Math.round((totalStudents + totalTeachers) * 0.2)),
          activeSessions: Math.max(0, Math.round((totalStudents + totalTeachers) * 0.1)),
          serverUptime: process.uptime(),
          apiRequestsToday,
          apiRequestsPerMinute: Math.max(0, Math.round(apiRequestsToday / Math.max(1, process.uptime() / 60))),
          dbStatus: isMongoConnected ? "connected" : "disconnected",
          systemErrorsToday: await db.collection("activityLogs").countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            action: "error",
          }),
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch developer overview");
    }
  });

  router.get("/system-health", async (_req, res) => {
    try {
      const memory = process.memoryUsage();
      const totalMemMB = Math.round(memory.heapTotal / 1024 / 1024);
      const usedMemMB = Math.round(memory.heapUsed / 1024 / 1024);
      const memoryPercent = totalMemMB > 0 ? Math.round((usedMemMB / totalMemMB) * 100) : 0;
      const cpuLoad = os.loadavg();
      const cpuPercent = Math.min(100, Number(((cpuLoad[0] / Math.max(1, os.cpus().length)) * 100).toFixed(2)));
      let mongoStatus = isMongoConnected ? "Connected" : "Disconnected";
      try {
        await db.command({ ping: 1 });
      } catch {
        mongoStatus = "Disconnected";
      }
      return res.json({
        success: true,
        data: {
          uptime: formatUptime(process.uptime()),
          memoryUsage: `${usedMemMB} MB / ${totalMemMB} MB`,
          memoryPercent,
          cpuUsage: `${cpuPercent}%`,
          cpuPercent,
          mongoStatus,
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || "development",
          timestamp: new Date().toISOString(),
          memory,
          cpu: { usagePercent: cpuPercent, load1m: cpuLoad[0], load5m: cpuLoad[1], load15m: cpuLoad[2] },
          mongodb: mongoStatus.toLowerCase(),
          pid: process.pid,
          platformControl: {
            maintenanceMode: Boolean(controlState?.maintenanceMode),
            uploadsDisabled: Boolean(controlState?.uploadsDisabled),
            forceLogoutIssuedAfter: Number(controlState?.forceLogoutIssuedAfter || 0),
            updatedAt: controlState?.updatedAt || null,
          },
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch system health");
    }
  });

  router.get("/logs", async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(10, Number.parseInt(req.query.limit, 10) || 100));
      const skip = Math.max(0, Number.parseInt(req.query.skip, 10) || 0);
      const [logs, total, auditLogs] = await Promise.all([
        db.collection("systemLogs").find({}).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("systemLogs").countDocuments({}),
        db.collection("auditLogs").find({}).sort({ timestamp: -1 }).limit(limit).toArray(),
      ]);
      return res.json({ success: true, data: { logs, total, limit, skip, crashLogs: [], auditLogs } });
    } catch (err) {
      return handleError(res, err, "Failed to fetch logs");
    }
  });

  router.get("/api-usage", async (_req, res) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const traceMatch = { createdAt: { $gte: oneDayAgo } };
      const [apiRequestsToday, topEndpointRows, slowestEndpointRows, requestTimelineRows] = await Promise.all([
        db.collection("requestTraces").countDocuments(traceMatch),
        db
          .collection("requestTraces")
          .aggregate([
            { $match: traceMatch },
            {
              $group: {
                _id: { $ifNull: ["$route", "unknown"] },
                count: { $sum: 1 },
                totalMs: {
                  $sum: {
                    $convert: { input: "$responseTime", to: "double", onError: 0, onNull: 0 },
                  },
                },
                maxMs: {
                  $max: {
                    $convert: { input: "$responseTime", to: "double", onError: 0, onNull: 0 },
                  },
                },
              },
            },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 10 },
          ])
          .toArray(),
        db
          .collection("requestTraces")
          .aggregate([
            { $match: traceMatch },
            {
              $group: {
                _id: { $ifNull: ["$route", "unknown"] },
                count: { $sum: 1 },
                totalMs: {
                  $sum: {
                    $convert: { input: "$responseTime", to: "double", onError: 0, onNull: 0 },
                  },
                },
                maxMs: {
                  $max: {
                    $convert: { input: "$responseTime", to: "double", onError: 0, onNull: 0 },
                  },
                },
              },
            },
            {
              $addFields: {
                avgMs: {
                  $cond: [{ $gt: ["$count", 0] }, { $divide: ["$totalMs", "$count"] }, 0],
                },
              },
            },
            { $sort: { avgMs: -1, _id: 1 } },
            { $limit: 10 },
          ])
          .toArray(),
        db
          .collection("requestTraces")
          .aggregate([
            { $match: traceMatch },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%dT%H",
                    date: "$createdAt",
                    timezone: "UTC",
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray(),
      ]);

      const topEndpoints = topEndpointRows.map((entry) => ({
        _id: entry._id,
        endpoint: entry._id,
        count: Number(entry.count || 0),
        avgMs: Math.round(Number(entry.totalMs || 0) / Math.max(1, Number(entry.count || 0))),
        maxMs: Number(entry.maxMs || 0),
      }));
      const slowestEndpoints = slowestEndpointRows.map((entry) => ({
        endpoint: entry._id,
        avgMs: Math.round(Number(entry.avgMs || 0)),
        maxMs: Number(entry.maxMs || 0),
        count: Number(entry.count || 0),
      }));
      const requestTimeline = requestTimelineRows.map((row) => ({
        hour: `${String(row._id)}:00`,
        count: Number(row.count || 0),
      }));
      return res.json({
        success: true,
        data: {
          apiRequestsToday,
          topEndpoints,
          slowestEndpoints,
          requestTimeline,
          period: "Last 24 hours",
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch API usage analytics");
    }
  });

  router.get("/errors", async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(10, Number.parseInt(req.query.limit, 10) || 50));
      const errors = await db.collection("activityLogs").find({ action: "error" }).sort({ createdAt: -1 }).limit(limit).toArray();
      const recentErrors = errors.map((entry) => ({
        timestamp: entry.createdAt || new Date(),
        route: entry.metadata?.route || "unknown",
        message: entry.metadata?.message || "error",
        userRole: entry.role || "unknown",
        school: entry.schoolId || null,
        statusCode: Number(entry.metadata?.statusCode || 500),
      }));
      const routeCounts = new Map();
      const timelineCounts = new Map();
      recentErrors.forEach((entry) => {
        routeCounts.set(entry.route, (routeCounts.get(entry.route) || 0) + 1);
        const hour = String(entry.timestamp).slice(0, 13);
        timelineCounts.set(hour, (timelineCounts.get(hour) || 0) + 1);
      });
      const errorsByRoute = Array.from(routeCounts.entries()).map(([route, count]) => ({ route, count }));
      const errorsTimeline = Array.from(timelineCounts.entries()).map(([hour, count]) => ({ hour: `${hour}:00`, count }));
      return res.json({
        success: true,
        data: {
          cards: {
            errorsToday: recentErrors.length,
            errorsLastHour: recentErrors.length,
            mostFailingApi: errorsByRoute[0]?.route || "N/A",
            totalSystemErrors: recentErrors.length,
          },
          errorsByRoute,
          errorsTimeline,
          recentErrors,
          errors: recentErrors,
          total: recentErrors.length,
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch error analytics");
    }
  });

  router.get("/live-activity", async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(10, Number.parseInt(req.query.limit, 10) || 50));
      const rows = await db.collection("activityLogs").find({}).sort({ createdAt: -1 }).limit(limit).toArray();
      return res.json({
        success: true,
        data: rows.map((item) => ({
          _id: String(item._id),
          action: item.action || "activity",
          userId: item.userId || null,
          role: item.role || "unknown",
          schoolId: item.schoolId || null,
          metadata: item.metadata || {},
          createdAt: item.createdAt || new Date(),
        })),
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch live activity");
    }
  });

  router.get("/traces", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const [rows, totalCount] = await Promise.all([
        db.collection("requestTraces").find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("requestTraces").countDocuments({}),
      ]);
      return res.json({
        success: true,
        data: rows.map((row) => ({
          _id: String(row._id),
          route: row.route || "unknown",
          method: row.method || "GET",
          responseTime: Number(row.responseTime || 0),
          statusCode: Number(row.statusCode || 0),
          userId: row.userId || null,
          schoolId: row.schoolId || null,
          createdAt: row.createdAt || new Date(),
        })),
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch traces");
    }
  });

  router.get("/schools", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 20);
      const baseMatch = { _id: { $exists: true } };
      const totalCount = await db.collection("schools").countDocuments(baseMatch);
      const rows = await db.collection("schools").aggregate([
        { $match: baseMatch },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            let: { schoolId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$schoolId", "$$schoolId"] },
                      { $eq: ["$role", "ADMIN"] },
                      { $ne: ["$isDeleted", true] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: 1 } },
              { $limit: 1 },
              { $project: { _id: 1, name: 1, email: 1 } },
            ],
            as: "adminUsers",
          },
        },
        {
          $lookup: {
            from: "users",
            let: { schoolId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$schoolId", "$$schoolId"] },
                      { $eq: ["$role", "STUDENT"] },
                      { $ne: ["$isDeleted", true] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "studentCounts",
          },
        },
        {
          $lookup: {
            from: "users",
            let: { schoolId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$schoolId", "$$schoolId"] },
                      { $eq: ["$role", "TEACHER"] },
                      { $ne: ["$isDeleted", true] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "teacherCounts",
          },
        },
      ]).toArray();

      const data = rows.map((school) => {
        const admin = Array.isArray(school.adminUsers) ? school.adminUsers[0] : null;
        return {
          _id: String(school._id),
          name: school.name || "Unnamed School",
          address: school.address || "",
          status: normalizeSchoolStatus(school.status || (school.isEnabled === false ? "disabled" : "active")),
          code: school.code || "SCH",
          enabled: school.enabled !== false,
          uploadsAllowed: school.uploadsAllowed !== false,
          isEnabled: school.isEnabled !== false && school.enabled !== false,
          totalStudents: Number(school.studentCounts?.[0]?.count || 0),
          totalTeachers: Number(school.teacherCounts?.[0]?.count || 0),
          admin: admin
            ? {
                id: String(admin._id),
                name: String(admin.name || "").trim() || "Unnamed Admin",
                email: String(admin.email || "").trim() || "-",
              }
            : null,
          createdAt: school.createdAt || null,
        };
      });

      return res.json({
        success: true,
        data,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch schools");
    }
  });

  router.get("/schools/:id/controls", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.id);
      if (!schoolId) {
        const err = new Error("Invalid school ID");
        err.statusCode = 400;
        throw err;
      }
      const school = await db.collection("schools").findOne({ _id: schoolId });
      if (!school) {
        const err = new Error("School not found");
        err.statusCode = 404;
        throw err;
      }
      return res.json({
        success: true,
        data: {
          _id: String(school._id),
          name: school.name || "Unnamed School",
          code: school.code || "SCH",
          enabled: school.enabled !== false,
          uploadsAllowed: school.uploadsAllowed !== false,
          isEnabled: school.isEnabled !== false && school.enabled !== false,
          createdAt: school.createdAt || null,
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch controls");
    }
  });

  router.get("/schools/:schoolId/details", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.schoolId);
      if (!schoolId) {
        const err = new Error("Invalid school ID");
        err.statusCode = 400;
        throw err;
      }
      const school = await db.collection("schools").findOne({ _id: schoolId });
      if (!school) {
        const err = new Error("School not found");
        err.statusCode = 404;
        throw err;
      }
      const [admins, teachers, students, teacherProfiles] = await Promise.all([
        db.collection("users").find({ schoolId, role: "ADMIN" }).toArray(),
        db.collection("users").find({ schoolId, role: "TEACHER" }).toArray(),
        db.collection("users").find({ schoolId, role: "STUDENT" }).toArray(),
        db.collection("teachers").find({ schoolId }).toArray(),
      ]);
      const teacherByUserId = new Map(teacherProfiles.map((row) => [String(row.userId || ""), row]));
      return res.json({
        success: true,
        school: { _id: String(school._id), name: school.name, code: school.code || null, createdAt: school.createdAt || null },
        stats: {
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalAdmins: admins.length,
          totalAttendance: await db.collection("attendance").countDocuments({ schoolId }),
          attendanceRate: 0,
          totalHomework: await db.collection("homework").countDocuments({ schoolId }),
          totalAnnouncements: await db.collection("announcements").countDocuments({ schoolId }),
          totalMarks: await db.collection("marks").countDocuments({ schoolId }),
        },
        recentErrors: [],
        admins: admins.map((u) => ({ _id: String(u._id), name: u.name || u.email, email: u.email, createdAt: u.createdAt || null })),
        teachers: teachers.map((u) => {
          const profile = teacherByUserId.get(String(u._id)) || {};
          return {
            _id: String(u._id),
            name: profile.name || u.name || u.email,
            email: u.email,
            class: profile.class || profile.className || "",
            section: profile.section || "",
            subject: profile.subject || "",
            createdAt: u.createdAt || null,
          };
        }),
        students: students.map((u) => ({
          _id: String(u._id),
          name: u.name || u.email,
          email: u.email,
          class: u.class || u.className || "",
          section: u.section || "",
          rollNo: u.rollNo || "",
          createdAt: u.createdAt || null,
        })),
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch school details");
    }
  });

  router.patch("/schools/:schoolId/status", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.schoolId);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      const isEnabled = ensureBoolean(req.body?.isEnabled, "isEnabled");
      const result = await db.collection("schools").updateOne({ _id: schoolId }, { $set: { isEnabled, enabled: isEnabled, updatedAt: new Date() } });
      if (!result.matchedCount) throw Object.assign(new Error("School not found"), { statusCode: 404 });
      await audit(req, {
        action: "PATCH_SCHOOL",
        targetType: "school",
        targetId: String(schoolId),
        metadata: { fields: ["isEnabled", "enabled"], isEnabled },
      });
      return res.json({ success: true, data: { _id: String(schoolId), isEnabled } });
    } catch (err) {
      return handleError(res, err, "Failed to update school status");
    }
  });

  router.patch("/schools/:id", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.id);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      const updates = {};

      if (req.body?.name != null) {
        const nextName = String(req.body.name || "").trim().replace(/\s+/g, " ");
        if (!nextName) throw Object.assign(new Error("School name cannot be empty"), { statusCode: 400 });
        updates.name = nextName;
        updates.nameKey = nextName.toLowerCase();
      }
      if (req.body?.address != null) {
        updates.address = String(req.body.address || "").trim();
      }
      if (req.body?.status != null || req.body?.isEnabled != null) {
        const status = req.body?.status != null
          ? normalizeSchoolStatus(req.body.status)
          : (Boolean(req.body?.isEnabled) ? "active" : "disabled");
        updates.status = status;
        updates.isEnabled = status === "active";
        updates.enabled = status === "active";
      }
      if (Object.keys(updates).length === 0) {
        throw Object.assign(new Error("No valid fields provided to update"), { statusCode: 400 });
      }
      updates.updatedAt = new Date();

      const result = await db.collection("schools").findOneAndUpdate(
        { _id: schoolId },
        { $set: updates },
        { returnDocument: "after" }
      );
      if (!result.value) throw Object.assign(new Error("School not found"), { statusCode: 404 });
      await audit(req, {
        action: "PATCH_SCHOOL",
        targetType: "school",
        targetId: String(schoolId),
        metadata: { fields: Object.keys(updates) },
      });
      return res.json({
        success: true,
        school: {
          _id: String(result.value._id),
          name: result.value.name,
          address: result.value.address || "",
          status: normalizeSchoolStatus(result.value.status || (result.value.isEnabled === false ? "disabled" : "active")),
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to update school");
    }
  });

  router.put("/schools/:id/toggle-disabled", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.id);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      const enabled = ensureBoolean(req.body?.enabled, "enabled");
      const result = await db.collection("schools").updateOne({ _id: schoolId }, { $set: { enabled, isEnabled: enabled, updatedAt: new Date() } });
      if (!result.matchedCount) throw Object.assign(new Error("School not found"), { statusCode: 404 });
      return res.json({ success: true, message: `School ${enabled ? "enabled" : "disabled"}` });
    } catch (err) {
      return handleError(res, err, "Failed to toggle school status");
    }
  });

  router.put("/schools/:id/uploads", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.id);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      const uploadsAllowed = ensureBoolean(req.body?.uploadsAllowed, "uploadsAllowed");
      const result = await db.collection("schools").updateOne({ _id: schoolId }, { $set: { uploadsAllowed, updatedAt: new Date() } });
      if (!result.matchedCount) throw Object.assign(new Error("School not found"), { statusCode: 404 });
      return res.json({ success: true, message: `Uploads ${uploadsAllowed ? "enabled" : "disabled"}` });
    } catch (err) {
      return handleError(res, err, "Failed to toggle uploads");
    }
  });

  router.put("/schools/:id/maintenance-mode", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.id);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      const maintenanceMode = ensureBoolean(req.body?.maintenanceMode, "maintenanceMode");
      const enabled = !maintenanceMode;
      const result = await db.collection("schools").updateOne({ _id: schoolId }, { $set: { enabled, isEnabled: enabled, updatedAt: new Date() } });
      if (!result.matchedCount) throw Object.assign(new Error("School not found"), { statusCode: 404 });
      return res.json({ success: true, message: `Maintenance mode ${maintenanceMode ? "enabled" : "disabled"}` });
    } catch (err) {
      return handleError(res, err, "Failed to toggle maintenance mode");
    }
  });

  router.post("/schools", async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
      const address = String(req.body?.address || "").trim();
      const validation = validateSchoolInput({ name, address, status: "active" });
      if (!validation.valid) throw Object.assign(new Error(validation.error), { statusCode: 400 });
      const nameKey = name.toLowerCase();
      const result = await db.collection("schools").findOneAndUpdate(
        { name, address },
        {
          $setOnInsert: {
            name,
            address,
            nameKey,
            status: "active",
            enabled: true,
            isEnabled: true,
            uploadsAllowed: true,
            createdAt: new Date(),
          },
          $set: { nameKey, updatedAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );
      if (result?.lastErrorObject?.updatedExisting === true) {
        console.log("School already exists, returning existing record");
      }
      return res.json({
        success: true,
        school: {
          _id: String(result.value?._id),
          name: result.value?.name || name,
          address: result.value?.address || address,
          status: normalizeSchoolStatus(result.value?.status || (result.value?.isEnabled === false ? "disabled" : "active")),
        },
        existing: result?.lastErrorObject?.updatedExisting === true,
      });
    } catch (err) {
      return handleError(res, err, "Failed to create school");
    }
  });

  router.post("/users", async (req, res) => {
    try {
      const schoolId = toObjectId(req.body?.schoolId);
      if (!schoolId) throw Object.assign(new Error("Invalid schoolId format"), { statusCode: 400 });
      const role = String(req.body?.role || "").toUpperCase();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const name = String(req.body?.name || "").trim();
      if (!name || !email || !role) throw Object.assign(new Error("Missing required fields: schoolId, name, email, role"), { statusCode: 400 });
      if (!["ADMIN", "TEACHER", "STUDENT"].includes(role)) throw Object.assign(new Error("Invalid role"), { statusCode: 400 });
      if (await db.collection("users").findOne({ email })) throw Object.assign(new Error("User with this email already exists"), { statusCode: 400 });

      const password = String(req.body?.password || "user123");
      const passwordHash = await bcrypt.hash(password, 10);
      const userInsert = await db.collection("users").insertOne({ email, name, role, passwordHash, schoolId, createdAt: new Date(), updatedAt: new Date() });

      if (role === "TEACHER") {
        const tVal = validateTeacherInput({
          name,
          schoolId: String(schoolId),
          subject: req.body?.subject,
          class: req.body?.className,
          section: req.body?.section,
        });
        if (!tVal.valid) throw Object.assign(new Error(tVal.error), { statusCode: 400 });
        await db.collection("teachers").updateOne(
          { userId: userInsert.insertedId },
          {
            $set: {
              userId: userInsert.insertedId,
              schoolId,
              name,
              subject: String(req.body?.subject || "").trim(),
              class: String(req.body?.className || "").trim(),
              section: String(req.body?.section || "").trim(),
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }
      if (role === "STUDENT") {
        const className = String(req.body?.className || "").trim();
        const section = String(req.body?.section || "").trim();
        const rollNo = String(req.body?.rollNo || "").trim();
        const sVal = validateStudentInput({
          name,
          admissionNumber: String(req.body?.admissionNumber || rollNo),
          schoolId: String(schoolId),
          class: className,
          section,
          rollNo,
          parentName: String(req.body?.parentName || "").trim(),
          parentPhone: String(req.body?.parentPhone || "").trim(),
        });
        if (!sVal.valid) throw Object.assign(new Error(sVal.error), { statusCode: 400 });
        await db.collection("students").insertOne({
          userId: userInsert.insertedId,
          schoolId,
          name,
          email,
          admissionNumber: String(req.body?.admissionNumber || rollNo),
          class: className,
          className,
          section,
          rollNo,
          parentName: String(req.body?.parentName || "").trim(),
          parentPhone: String(req.body?.parentPhone || "").trim(),
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return res.json({ success: true, user: { _id: String(userInsert.insertedId), email, role, password } });
    } catch (err) {
      return handleError(res, err, "Failed to create user");
    }
  });

  router.get("/users", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 25);
      const role = String(req.query?.role || "").trim().toUpperCase();
      const search = String(req.query?.search || "").trim();
      const schoolId = toObjectId(req.query?.schoolId);
      const query = {};
      if (role) query.role = role;
      if (schoolId) query.schoolId = schoolId;
      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query.$or = [{ email: regex }, { name: regex }];
      }

      const [users, totalCount] = await Promise.all([
        db.collection("users").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("users").countDocuments(query),
      ]);

      return res.json({
        success: true,
        data: users.map((u) => ({
          _id: String(u._id),
          name: u.name || "",
          email: u.email || "",
          role: u.role || "",
          schoolId: u.schoolId ? String(u.schoolId) : null,
          class: u.class || "",
          section: u.section || "",
          isDeleted: u.isDeleted === true,
          createdAt: u.createdAt || null,
        })),
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch users");
    }
  });

  router.patch("/users/:id", async (req, res) => {
    try {
      const userId = toObjectId(req.params.id);
      if (!userId) throw Object.assign(new Error("Invalid user ID"), { statusCode: 400 });
      const user = await db.collection("users").findOne({ _id: userId });
      if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

      const updates = {};
      const setOps = {};

      if (req.body?.name != null) setOps.name = String(req.body.name || "").trim();
      if (req.body?.email != null) setOps.email = String(req.body.email || "").trim().toLowerCase();
      if (req.body?.disable != null) setOps.isDeleted = Boolean(req.body.disable);
      if (req.body?.schoolId != null) {
        const nextSchoolId = toObjectId(req.body.schoolId);
        if (!nextSchoolId) throw Object.assign(new Error("Invalid target schoolId"), { statusCode: 400 });
        setOps.schoolId = nextSchoolId;
      }
      if (req.body?.class != null) setOps.class = String(req.body.class || "").trim();
      if (req.body?.section != null) setOps.section = String(req.body.section || "").trim();
      if (req.body?.phone != null) setOps.phone = String(req.body.phone || "").trim();

      if (req.body?.resetPassword) {
        const nextPassword = String(req.body.newPassword || req.body.password || "user123");
        setOps.passwordHash = await bcrypt.hash(nextPassword, 10);
        updates.resetPasswordApplied = true;
      }

      if (Object.keys(setOps).length === 0) {
        throw Object.assign(new Error("No valid update fields provided"), { statusCode: 400 });
      }
      setOps.updatedAt = new Date();

      await db.collection("users").updateOne({ _id: userId }, { $set: setOps });

      // Keep role profiles in sync when moving school/class/section.
      if (user.role === "TEACHER") {
        const teacherUpdate = {};
        if (setOps.schoolId) teacherUpdate.schoolId = setOps.schoolId;
        if (setOps.class != null) teacherUpdate.class = setOps.class;
        if (setOps.section != null) teacherUpdate.section = setOps.section;
        if (setOps.name != null) teacherUpdate.name = setOps.name;
        if (setOps.email != null) teacherUpdate.email = setOps.email;
        if (setOps.isDeleted != null) teacherUpdate.isDeleted = setOps.isDeleted;
        if (Object.keys(teacherUpdate).length > 0) {
          teacherUpdate.updatedAt = new Date();
          await db.collection("teachers").updateMany({ userId }, { $set: teacherUpdate });
        }
      }
      if (user.role === "STUDENT") {
        const studentUpdate = {};
        if (setOps.schoolId) studentUpdate.schoolId = setOps.schoolId;
        if (setOps.class != null) studentUpdate.class = setOps.class;
        if (setOps.section != null) studentUpdate.section = setOps.section;
        if (setOps.name != null) studentUpdate.name = setOps.name;
        if (setOps.email != null) studentUpdate.email = setOps.email;
        if (setOps.isDeleted != null) studentUpdate.isDeleted = setOps.isDeleted;
        if (Object.keys(studentUpdate).length > 0) {
          studentUpdate.updatedAt = new Date();
          await db.collection("students").updateMany({ userId }, { $set: studentUpdate });
        }
      }

      await audit(req, {
        action: "PATCH_USER",
        targetType: "user",
        targetId: String(userId),
        metadata: { fields: Object.keys(setOps), role: user.role },
      });
      return res.json({ success: true, message: "User updated", data: updates });
    } catch (err) {
      return handleError(res, err, "Failed to update user");
    }
  });

  router.delete("/users/:userId", async (req, res) => {
    try {
      requireConfirmation(req);
      const userId = toObjectId(req.params.userId);
      if (!userId) throw Object.assign(new Error("Invalid user ID"), { statusCode: 400 });
      const user = await db.collection("users").findOne({ _id: userId });
      if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
      await Promise.all([db.collection("teachers").deleteMany({ userId }), db.collection("students").deleteMany({ userId })]);
      await db.collection("users").deleteOne({ _id: userId });
      await audit(req, {
        action: "DELETE_USER",
        targetType: "user",
        targetId: String(userId),
        metadata: { email: user.email, role: user.role },
      });
      return res.json({ success: true, message: `User ${user.email} deleted` });
    } catch (err) {
      return handleError(res, err, "Delete failed");
    }
  });

  router.post("/users/delete", async (req, res) => {
    try {
      requireConfirmation(req);
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email) throw Object.assign(new Error("Email required"), { statusCode: 400 });
      const result = await db.collection("users").deleteOne({ email });
      if (!result.deletedCount) throw Object.assign(new Error("User not found"), { statusCode: 404 });
      await audit(req, {
        action: "DELETE_USER",
        targetType: "user",
        targetId: email,
        metadata: { email, endpoint: "/users/delete" },
      });
      return res.json({ success: true, message: `User ${email} deleted` });
    } catch (err) {
      return handleError(res, err, "Delete failed");
    }
  });

  router.delete("/schools/:schoolId/data", async (req, res) => {
    try {
      const schoolId = toObjectId(req.params.schoolId);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      await Promise.all([
        db.collection("users").deleteMany({ schoolId }),
        db.collection("teachers").deleteMany({ schoolId }),
        db.collection("students").deleteMany({ schoolId }),
        db.collection("attendance").deleteMany({ schoolId }),
        db.collection("marks").deleteMany({ schoolId }),
        db.collection("homework").deleteMany({ schoolId }),
        db.collection("announcements").deleteMany({ schoolId }),
        db.collection("notifications").deleteMany({ schoolId }),
      ]);
      return res.json({ success: true, message: "School data deleted" });
    } catch (err) {
      return handleError(res, err, "Delete failed");
    }
  });

  router.delete("/schools/:schoolId", async (req, res) => {
    try {
      requireConfirmation(req);
      const schoolId = toObjectId(req.params.schoolId);
      if (!schoolId) throw Object.assign(new Error("Invalid school ID"), { statusCode: 400 });
      const hardDelete = String(req.query.hardDelete || "").toLowerCase() === "true";

      if (!hardDelete) {
        const disabled = await db.collection("schools").updateOne(
          { _id: schoolId },
          { $set: { status: "disabled", isEnabled: false, enabled: false, updatedAt: new Date() } }
        );
        if (!disabled.matchedCount) throw Object.assign(new Error("School not found"), { statusCode: 404 });
        await audit(req, {
          action: "DELETE_SCHOOL",
          targetType: "school",
          targetId: String(schoolId),
          metadata: { hardDelete: false, behavior: "disabled" },
        });
        return res.json({ success: true, message: "School disabled" });
      }

      await Promise.all([
        db.collection("users").deleteMany({ schoolId }),
        db.collection("teachers").deleteMany({ schoolId }),
        db.collection("students").deleteMany({ schoolId }),
        db.collection("attendance").deleteMany({ schoolId }),
        db.collection("homework").deleteMany({ schoolId }),
        db.collection("exams").deleteMany({ schoolId }),
        db.collection("marks").deleteMany({ schoolId }),
        db.collection("notifications").deleteMany({ schoolId }),
        db.collection("voiceMessages").deleteMany({ schoolId }),
      ]);
      const deleted = await db.collection("schools").deleteOne({ _id: schoolId });
      if (!deleted.deletedCount) throw Object.assign(new Error("School not found"), { statusCode: 404 });
      await audit(req, {
        action: "DELETE_SCHOOL",
        targetType: "school",
        targetId: String(schoolId),
        metadata: { hardDelete: true },
      });
      return res.json({ success: true, message: "School hard deleted" });
    } catch (err) {
      return handleError(res, err, "Delete failed");
    }
  });

  router.get("/voice-messages", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const schoolId = toObjectId(req.query?.schoolId);
      const query = schoolId ? { schoolId } : {};
      const [modernRows, legacyRows] = await Promise.all([
        db.collection("voiceMessages").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("voice_messages").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      ]);
      const rows = [...modernRows, ...legacyRows]
        .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
        .slice(0, limit);
      return res.json({
        success: true,
        data: rows.map((row) => ({
          ...row,
          _id: String(row._id),
          schoolId: row.schoolId ? String(row.schoolId) : null,
        })),
        page,
        totalCount: rows.length,
      });
    } catch (err) {
      return handleError(res, err, "Failed to fetch voice messages");
    }
  });

  router.delete("/voice-messages/:id", async (req, res) => {
    try {
      requireConfirmation(req);
      const id = toObjectId(req.params.id);
      if (!id) throw Object.assign(new Error("Invalid voice message id"), { statusCode: 400 });
      const [modernDoc, legacyDoc] = await Promise.all([
        db.collection("voiceMessages").findOne({ _id: id }),
        db.collection("voice_messages").findOne({ _id: id }),
      ]);
      const snapshot = modernDoc || legacyDoc;
      if (!snapshot) {
        throw Object.assign(new Error("Voice message not found"), { statusCode: 404 });
      }
      await db.collection("devVoiceMessageUndo").insertOne({
        messageId: id,
        sourceCollection: modernDoc ? "voiceMessages" : "voice_messages",
        snapshot,
        deletedBy: req?.user?.userId ? String(req.user.userId) : "unknown",
        createdAt: new Date(),
        consumedAt: null,
      });
      const [modernRes, legacyRes] = await Promise.all([
        db.collection("voiceMessages").deleteOne({ _id: id }),
        db.collection("voice_messages").deleteOne({ _id: id }),
      ]);
      if (!modernRes.deletedCount && !legacyRes.deletedCount) {
        throw Object.assign(new Error("Voice message not found"), { statusCode: 404 });
      }
      await audit(req, {
        action: "DELETE_VOICE_MESSAGE",
        targetType: "voice-message",
        targetId: String(id),
      });
      return res.json({ success: true, message: "Voice message deleted" });
    } catch (err) {
      return handleError(res, err, "Failed to delete voice message");
    }
  });

  router.post("/voice-messages/:id/undo", async (req, res) => {
    try {
      const id = toObjectId(req.params.id);
      if (!id) throw Object.assign(new Error("Invalid voice message id"), { statusCode: 400 });
      const undoEntry = await db.collection("devVoiceMessageUndo").findOne(
        { messageId: id, consumedAt: null },
        { sort: { createdAt: -1 } }
      );
      if (!undoEntry?.snapshot) {
        throw Object.assign(new Error("Undo not available for this voice message"), { statusCode: 404 });
      }
      const sourceCollection = String(undoEntry.sourceCollection || "voiceMessages");
      const targetCollection = sourceCollection === "voice_messages" ? "voice_messages" : "voiceMessages";
      const snapshot = { ...undoEntry.snapshot, _id: id, restoredAt: new Date() };
      await db.collection(targetCollection).replaceOne({ _id: id }, snapshot, { upsert: true });
      await db.collection("devVoiceMessageUndo").updateOne({ _id: undoEntry._id }, { $set: { consumedAt: new Date() } });
      await audit(req, {
        action: "UNDO_DELETE_VOICE_MESSAGE",
        targetType: "voice-message",
        targetId: String(id),
      });
      return res.json({ success: true, data: { _id: String(id), restored: true } });
    } catch (err) {
      return handleError(res, err, "Failed to undo voice message delete");
    }
  });

  router.get("/data/students", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const schoolId = toObjectId(req.query?.schoolId);
      const query = schoolId ? { schoolId } : {};
      const [rows, totalCount] = await Promise.all([
        db.collection("students").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("students").countDocuments(query),
      ]);
      return res.json({ success: true, data: rows, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), totalCount });
    } catch (err) {
      return handleError(res, err, "Failed to fetch students explorer data");
    }
  });

  router.get("/data/teachers", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const schoolId = toObjectId(req.query?.schoolId);
      const query = schoolId ? { schoolId } : {};
      const [rows, totalCount] = await Promise.all([
        db.collection("teachers").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("teachers").countDocuments(query),
      ]);
      return res.json({ success: true, data: rows, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), totalCount });
    } catch (err) {
      return handleError(res, err, "Failed to fetch teachers explorer data");
    }
  });

  router.get("/data/attendance", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const schoolId = toObjectId(req.query?.schoolId);
      const query = schoolId ? { schoolId } : {};
      const [rows, totalCount] = await Promise.all([
        db.collection("attendance").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("attendance").countDocuments(query),
      ]);
      return res.json({ success: true, data: rows, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), totalCount });
    } catch (err) {
      return handleError(res, err, "Failed to fetch attendance explorer data");
    }
  });

  router.get("/data/homework", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const schoolId = toObjectId(req.query?.schoolId);
      const query = schoolId ? { schoolId } : {};
      const [rows, totalCount] = await Promise.all([
        db.collection("homework").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("homework").countDocuments(query),
      ]);
      return res.json({ success: true, data: rows, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), totalCount });
    } catch (err) {
      return handleError(res, err, "Failed to fetch homework explorer data");
    }
  });

  router.get("/data/exams", async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, 50);
      const schoolId = toObjectId(req.query?.schoolId);
      const query = schoolId ? { schoolId } : {};
      const [rows, totalCount] = await Promise.all([
        db.collection("exams").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection("exams").countDocuments(query),
      ]);
      return res.json({ success: true, data: rows, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), totalCount });
    } catch (err) {
      return handleError(res, err, "Failed to fetch exams explorer data");
    }
  });

  router.patch("/data/:entity/:id", async (req, res) => {
    try {
      const { entity, collectionName } = resolveDataCollection(req.params.entity);
      const id = toObjectId(req.params.id);
      if (!id) throw Object.assign(new Error("Invalid record id"), { statusCode: 400 });

      const editableFields = DATA_EDITABLE_FIELDS[entity] || [];
      const payload = req.body && typeof req.body === "object" ? req.body : {};
      const incoming = payload.updates && typeof payload.updates === "object" ? payload.updates : payload;
      const updates = {};

      for (const [key, value] of Object.entries(incoming || {})) {
        if (!editableFields.includes(key)) continue;
        if (["_id", "id", "createdAt", "passwordHash", "schoolId", "userId"].includes(key)) continue;
        updates[key] = value;
      }

      if (Object.keys(updates).length === 0) {
        throw Object.assign(new Error("No editable fields provided"), { statusCode: 400 });
      }

      updates.updatedAt = new Date();
      const result = await db.collection(collectionName).findOneAndUpdate(
        { _id: id },
        { $set: updates },
        { returnDocument: "after" }
      );
      const record = result?.value || result;
      if (!record) throw Object.assign(new Error("Record not found"), { statusCode: 404 });

      await audit(req, {
        action: "EDIT_DATA_RECORD",
        targetType: entity,
        targetId: String(id),
        metadata: { fields: Object.keys(updates) },
      });

      return res.json({ success: true, data: record });
    } catch (err) {
      return handleError(res, err, "Failed to edit data record");
    }
  });

  router.delete("/data/:entity/:id", async (req, res) => {
    try {
      requireConfirmation(req);
      const { entity, collectionName } = resolveDataCollection(req.params.entity);
      const id = toObjectId(req.params.id);
      if (!id) throw Object.assign(new Error("Invalid record id"), { statusCode: 400 });

      const collection = db.collection(collectionName);
      const existing = await collection.findOne({ _id: id });
      if (!existing) throw Object.assign(new Error("Record not found"), { statusCode: 404 });

      await db.collection("devDataExplorerUndo").insertOne({
        entity,
        documentId: id,
        snapshot: existing,
        deletedBy: req?.user?.userId ? String(req.user.userId) : "unknown",
        createdAt: new Date(),
        consumedAt: null,
      });

      const supportsSoftDelete = entity === "students" || entity === "teachers";
      if (supportsSoftDelete) {
        await collection.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } });
      } else {
        await collection.deleteOne({ _id: id });
      }

      await audit(req, {
        action: "DELETE_DATA_RECORD",
        targetType: entity,
        targetId: String(id),
        metadata: { mode: supportsSoftDelete ? "soft" : "hard" },
      });

      return res.json({
        success: true,
        data: {
          deletedId: String(id),
          mode: supportsSoftDelete ? "soft" : "hard",
          undoAvailable: true,
        },
      });
    } catch (err) {
      return handleError(res, err, "Failed to delete data record");
    }
  });

  router.post("/data/:entity/:id/undo", async (req, res) => {
    try {
      const { entity, collectionName } = resolveDataCollection(req.params.entity);
      const id = toObjectId(req.params.id);
      if (!id) throw Object.assign(new Error("Invalid record id"), { statusCode: 400 });

      const undoCollection = db.collection("devDataExplorerUndo");
      const undoEntry = await undoCollection.findOne(
        { entity, documentId: id, consumedAt: null },
        { sort: { createdAt: -1 } }
      );
      if (!undoEntry?.snapshot) {
        throw Object.assign(new Error("Undo not available for this record"), { statusCode: 404 });
      }

      const snapshot = {
        ...undoEntry.snapshot,
        _id: id,
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      };
      await db.collection(collectionName).replaceOne({ _id: id }, snapshot, { upsert: true });
      await undoCollection.updateOne({ _id: undoEntry._id }, { $set: { consumedAt: new Date() } });

      await audit(req, {
        action: "UNDO_DELETE_DATA_RECORD",
        targetType: entity,
        targetId: String(id),
      });

      return res.json({ success: true, data: snapshot });
    } catch (err) {
      return handleError(res, err, "Failed to undo delete");
    }
  });

  router.post("/system/maintenance", async (req, res) => {
    try {
      const maintenanceMode = ensureBoolean(req.body?.maintenanceMode, "maintenanceMode");
      const disableUploads = req.body?.disableUploads == null ? controlState.uploadsDisabled : Boolean(req.body.disableUploads);
      await platformControlService.setMaintenanceAndUploads({ maintenanceMode, uploadsDisabled: disableUploads });
      await audit(req, {
        action: "TOGGLE_MAINTENANCE_MODE",
        targetType: "system",
        targetId: "platformControl",
        metadata: { maintenanceMode, uploadsDisabled: disableUploads },
      });
      return res.json({ success: true, message: `Maintenance mode ${maintenanceMode ? "enabled" : "disabled"}`, data: controlState });
    } catch (err) {
      return handleError(res, err, "Failed to update maintenance mode");
    }
  });

  router.post("/system/logout-all", async (req, res) => {
    try {
      requireConfirmation(req);
      await platformControlService.forceLogoutAll();
      await audit(req, {
        action: "FORCE_LOGOUT_ALL",
        targetType: "system",
        targetId: "all-users",
      });
      return res.json({ success: true, message: "All user sessions invalidated" });
    } catch (err) {
      return handleError(res, err, "Failed to force logout all users");
    }
  });

  router.post("/system/cache-clear", async (req, res) => {
    try {
      await platformControlService.clearCache();
      await audit(req, {
        action: "CLEAR_CACHE",
        targetType: "system",
        targetId: "in-memory-cache",
      });
      return res.json({ success: true, message: "System cache cleared" });
    } catch (err) {
      return handleError(res, err, "Failed to clear cache");
    }
  });

  router.post("/system/uploads", async (req, res) => {
    try {
      const disabled = ensureBoolean(req.body?.disabled, "disabled");
      if (disabled) {
        await platformControlService.disableUploads();
      } else {
        await platformControlService.enableUploads();
      }
      await audit(req, {
        action: "TOGGLE_UPLOADS",
        targetType: "system",
        targetId: "platformControl",
        metadata: { uploadsDisabled: disabled },
      });
      return res.json({ success: true, message: `Uploads ${disabled ? "disabled" : "enabled"}`, data: controlState });
    } catch (err) {
      return handleError(res, err, "Failed to update uploads control");
    }
  });

  router.get("/analytics", async (req, res) => {
    try {
      const schoolId = toObjectId(req.query.schoolId);
      if (!schoolId) throw Object.assign(new Error("schoolId query param is required"), { statusCode: 400 });
      const [admins, teachers, students, attendance] = await Promise.all([
        db.collection("users").countDocuments({ schoolId, role: "ADMIN" }),
        db.collection("users").countDocuments({ schoolId, role: "TEACHER" }),
        db.collection("users").countDocuments({ schoolId, role: "STUDENT" }),
        db.collection("attendance").countDocuments({ schoolId }),
      ]);
      validateAttendanceInput({ schoolId: String(schoolId), status: "PRESENT" });
      validateExamInput({ name: "overview", maxMarks: 100 });
      validateAnalyticsInput({ metric: "attendance", value: attendance });
      return res.json({ success: true, schools: 1, admins, teachers, students, attendance, total: admins + teachers + students });
    } catch (err) {
      return handleError(res, err, "Failed to fetch analytics");
    }
  });

  router.get("/features", async (_req, res) => {
    try {
      const docs = await db.collection("featureFlags").find({}).toArray();
      const base = { voiceCalls: true, analytics: true, homework: true, notifications: true };
      for (const doc of docs) {
        const key = String(doc?.name || "").trim();
        if (key) base[key] = doc?.enabled !== false;
      }
      return res.json({ success: true, data: base });
    } catch (err) {
      return handleError(res, err, "Failed to fetch feature flags");
    }
  });

  router.patch("/features", async (req, res) => {
    try {
      const updates = req.body || {};
      const nextFlags = {
        voiceCalls: updates.voiceCalls !== false,
        analytics: updates.analytics !== false,
        homework: updates.homework !== false,
        notifications: updates.notifications !== false,
      };
      validateNotificationInput({ title: "Feature Flag Update", message: "Developer updated feature flags", targetRole: "admin" });
      await Promise.all(
        Object.entries(nextFlags).map(([name, enabled]) =>
          db.collection("featureFlags").updateOne(
            { name },
            { $set: { name, enabled: Boolean(enabled), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          )
        )
      );
      return res.json({ success: true, data: nextFlags });
    } catch (err) {
      return handleError(res, err, "Failed to update feature flags");
    }
  });

  router.post("/tools/health-check", async (_req, res) => {
    try {
      let dbStatus = isMongoConnected ? "connected" : "disconnected";
      try {
        await db.command({ ping: 1 });
      } catch {
        dbStatus = "degraded";
      }
      return res.json({ success: true, data: { status: dbStatus === "connected" ? "healthy" : "degraded", uptime: process.uptime(), dbStatus } });
    } catch (err) {
      return handleError(res, err, "Health check failed");
    }
  });

  router.post("/tools/test-db", async (_req, res) => {
    try {
      await db.command({ ping: 1 });
      return res.json({ success: true, data: { db: "connected", timestamp: Date.now() } });
    } catch (err) {
      return handleError(res, err, "Database test failed");
    }
  });

  router.post("/tools/memory-check", async (_req, res) => {
    try {
      return res.json({
        success: true,
        data: {
          processMemory: process.memoryUsage(),
          systemMemory: { total: os.totalmem(), free: os.freemem() },
          pid: process.pid,
        },
      });
    } catch (err) {
      return handleError(res, err, "Memory check failed");
    }
  });

  router.post("/tools/run-backup", async (_req, res) => {
    try {
      exec("npm run backup:db", { cwd: path.resolve(__dirname, "..") }, () => {});
      return res.json({ success: true, message: "Backup started" });
    } catch (err) {
      return handleError(res, err, "Backup failed to start");
    }
  });

  return router;
}
