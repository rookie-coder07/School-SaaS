import jwt from "jsonwebtoken";

export default function teacherAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "TEACHER") {
      return res.status(403).json({ error: "Teacher access required" });
    }

    // ✅ decoded.schoolId MUST be a string ObjectId
    req.user = {
      userId: decoded.userId,
      schoolId: decoded.schoolId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
