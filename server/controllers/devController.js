/**
 * Developer Controller
 * Handles school control operations for the Developer Console
 */

import { ObjectId } from "mongodb";

/**
 * Log developer action to audit log
 */
const logDeveloperAction = async (db, developerEmail, action, targetSchoolId, details = {}) => {
  try {
    await db.collection("developerAuditLog").insertOne({
      developerEmail,
      action,
      targetSchoolId: targetSchoolId ? String(targetSchoolId) : null,
      details,
      timestamp: new Date(),
      ip: null,
      userAgent: null,
    });
  } catch (err) {
    console.error("❌ Developer Audit Log Error:", err);
  }
};

/**
 * Format school response
 */
const formatSchoolResponse = (school) => {
  if (!school) return null;
  
  // Generate school code from name initials
  const generateSchoolCode = (name) => {
    if (!name) return "SCH";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  return {
    _id: school._id,
    name: school.name || "Unnamed School",
    code: generateSchoolCode(school.name),
    enabled: school.enabled !== false,
    uploadsAllowed: school.uploadsAllowed !== false,
    totalStudents: school.totalStudents || 0,
    totalTeachers: school.totalTeachers || 0,
    isEnabled: school.enabled !== false,
    createdAt: school.createdAt,
  };
};

export const devController = {
  /**
   * GET /api/dev/schools
   * Return all schools with their control settings
   */
  getSchools: async (db) => {
    try {
      const schools = await db.collection("schools").find({}).toArray();

      const formatted = schools.map((school) => formatSchoolResponse(school));

      return {
        success: true,
        data: formatted,
        count: formatted.length,
      };
    } catch (err) {
      console.error("❌ GET SCHOOLS ERROR:", err);
      throw new Error("Failed to fetch schools");
    }
  },

  /**
   * GET /api/dev/schools/:schoolId/controls
   * Return control settings for a specific school
   */
  getSchoolControls: async (db, schoolId) => {
    try {
      if (!ObjectId.isValid(schoolId)) {
        throw new Error("Invalid school ID");
      }

      const school = await db.collection("schools").findOne({
        _id: new ObjectId(schoolId),
      });

      if (!school) {
        throw new Error("School not found");
      }

      return {
        success: true,
        data: formatSchoolResponse(school),
      };
    } catch (err) {
      console.error("❌ GET CONTROLS ERROR:", err);
      throw err;
    }
  },

  /**
   * PUT /api/dev/schools/:schoolId/toggle-feature
   * Toggle a specific feature flag
   */
  /**
   * PUT /api/dev/schools/:schoolId/toggle-disabled
   * Toggle school enabled/disabled status
   */
  toggleSchoolStatus: async (db, schoolId, enabled, reason = "", developerEmail = "developer") => {
    try {
      if (!ObjectId.isValid(schoolId)) {
        throw new Error("Invalid school ID");
      }

      if (typeof enabled !== "boolean") {
        throw new Error("enabled must be a boolean");
      }

      const result = await db.collection("schools").findOneAndUpdate(
        { _id: new ObjectId(schoolId) },
        {
          $set: {
            enabled,
            disabledReason: !enabled ? reason : null,
            disabledAt: !enabled ? new Date() : null,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        throw new Error("School not found");
      }

      // Log action
      await logDeveloperAction(
        db,
        developerEmail,
        enabled ? "enable_school" : "disable_school",
        schoolId,
        { reason }
      );

      return {
        success: true,
        message: `School ${enabled ? "enabled" : "disabled"}`,
        data: formatSchoolResponse(result),
      };
    } catch (err) {
      console.error("❌ TOGGLE SCHOOL STATUS ERROR:", err);
      throw err;
    }
  },

  /**
   * PUT /api/dev/schools/:schoolId/uploads
   * Toggle uploads enabled/disabled for a school
   */
  toggleUploads: async (db, schoolId, uploadsAllowed, developerEmail = "developer") => {
    try {
      if (!ObjectId.isValid(schoolId)) {
        throw new Error("Invalid school ID");
      }

      if (typeof uploadsAllowed !== "boolean") {
        throw new Error("uploadsAllowed must be a boolean");
      }

      const result = await db.collection("schools").findOneAndUpdate(
        { _id: new ObjectId(schoolId) },
        {
          $set: {
            uploadsAllowed,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        throw new Error("School not found");
      }

      // Log action
      await logDeveloperAction(
        db,
        developerEmail,
        uploadsAllowed ? "enable_uploads" : "disable_uploads",
        schoolId,
        {}
      );

      return {
        success: true,
        message: `Uploads ${uploadsAllowed ? "enabled" : "disabled"}`,
        data: formatSchoolResponse(result),
      };
    } catch (err) {
      console.error("❌ TOGGLE UPLOADS ERROR:", err);
      throw err;
    }
  },

  /**
   * GET /api/dev/audit-log
   * Get developer audit log entries
   */
  getAuditLog: async (db, limit = 50) => {
    try {
      const parsedLimit = Math.min(100, Math.max(10, Number.parseInt(limit, 10) || 50));

      const logs = await db
        .collection("developerAuditLog")
        .find({})
        .sort({ timestamp: -1 })
        .limit(parsedLimit)
        .toArray();

      return {
        success: true,
        data: logs,
        count: logs.length,
      };
    } catch (err) {
      console.error("❌ AUDIT LOG ERROR:", err);
      throw new Error("Failed to fetch audit log");
    }
  },
};

export default devController;
