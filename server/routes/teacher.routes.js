import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default function teacherRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");

  // ===============================
  // TEACHER LOGIN
  // ===============================
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "TEACHER"
      });

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ message: "Wrong password" });
      }

      const token = jwt.sign(
        {
          userId: user._id,
          schoolId: user.schoolId,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId
        }
      });

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}