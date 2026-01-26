import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/* ================= HEALTH ================= */
app.get("/", (req, res) => {
  res.send("Backend Alive ✅");
});

app.get("/ping", (req, res) => {
  res.json({ ok: true, time: new Date() });
});

/* ================= AUTH PLACEHOLDER ================= */
app.post("/api/auth/teacher/login", (req, res) => {
  res.json({ message: "Teacher route reachable ✅" });
});

app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});
