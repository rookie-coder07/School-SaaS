import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { applyTenantFilter } from "./tenantFilter.js";

// Safe ObjectId conversion helper
export function safeObjectId(id) {
  try {
    if (!id) return null;
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("AUTH FAILED: No bearer token in header");
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      schoolId: decoded.schoolId,
      role: decoded.role,
      teacherId: decoded.teacherId,
      studentId: decoded.studentId,
    };

    console.log(`AUTH PASSED: role=${decoded.role}, userId=${decoded.userId}, schoolId=${decoded.schoolId}`);
    next();
  } catch (err) {
    console.warn("AUTH FAILED:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      console.warn(`ROLE CHECK FAILED: Expected ${role}, got ${req.user?.role || "none"}`);
      return res.status(403).json({ error: "Access denied" });
    }
    console.log(`ROLE CHECK PASSED: ${role}`);
    next();
  };
}

// Require any of the specified roles (useful for routes available to multiple roles)
export function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

// Developer-only middleware (no schoolId required or allowed)
export function requireDeveloper(req, res, next) {
  if (!req.user || req.user.role !== "DEVELOPER") {
    return res.status(403).json({ error: "Developer access required" });
  }
  if (req.user.schoolId) {
    return res.status(400).json({ error: "Developer cannot have schoolId" });
  }
  next();
}

// Tenant validation: requires schoolId and converts to ObjectId
export function requireTenantId(req, res, next) {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    console.error("TENANT CHECK FAILED: Missing schoolId in token for role:", req.user?.role);
    return res.status(400).json({ error: "Missing schoolId in authentication token" });
  }
  try {
    const schoolIdObj = new ObjectId(String(schoolId));
    req.user.schoolIdObj = schoolIdObj;
    console.log(`TENANT CHECK PASSED: schoolId=${schoolId}`);
    return applyTenantFilter(req, res, next, schoolIdObj);
  } catch (e) {
    console.error("TENANT CHECK FAILED: Invalid schoolId format:", schoolId, "error:", e.message);
    return res.status(400).json({ error: "Invalid schoolId format" });
  }
}
