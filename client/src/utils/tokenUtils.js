/**
 * Utility functions for working with JWT tokens
 */

export function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (err) {
    console.error("Token decode error:", err);
    return null;
  }
}

export function getSchoolIdFromToken(token) {
  const decoded = decodeToken(token);
  return decoded?.schoolId || null;
}

export function extractSchoolInfo(token, role) {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  return {
    schoolId: decoded.schoolId || null,
    userId: decoded.userId || null,
    role: decoded.role || role,
  };
}
