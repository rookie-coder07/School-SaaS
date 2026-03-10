import { ObjectId } from "mongodb";

const tryObjectId = (value) => {
  try {
    if (!value) return null;
    return new ObjectId(String(value));
  } catch {
    return null;
  }
};

const extractRequestedSchoolId = (req) => {
  const fromParams = req?.params?.schoolId;
  const fromQuery = req?.query?.schoolId;
  const fromBody = req?.body?.schoolId;
  const fromHeader = req?.headers?.["x-school-id"];
  return fromParams || fromQuery || fromBody || fromHeader || null;
};

export function applyTenantFilter(req, res, next, schoolIdObj) {
  if (!schoolIdObj) {
    return res.status(400).json({ error: "Tenant context missing" });
  }

  const requestedSchoolId = extractRequestedSchoolId(req);
  if (requestedSchoolId) {
    const requestedSchoolObj = tryObjectId(requestedSchoolId);
    if (!requestedSchoolObj || requestedSchoolObj.toString() !== schoolIdObj.toString()) {
      console.warn(
        `[SECURITY] Cross-tenant access blocked userId:${String(req?.user?.userId || "unknown")} requestedSchool:${String(
          requestedSchoolId
        )} tokenSchool:${schoolIdObj.toString()} path:${String(req?.originalUrl || "")}`
      );
      return res.status(403).json({ error: "Cross-tenant access blocked" });
    }
  }

  req.tenantFilter = { schoolId: schoolIdObj };
  return next();
}

export default function tenantFilter(req, res, next) {
  const schoolIdObj = req?.user?.schoolIdObj || tryObjectId(req?.user?.schoolId);
  return applyTenantFilter(req, res, next, schoolIdObj);
}
