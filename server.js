import express from "express";

const app = express();
app.use(express.json());

const PORT = 5000;

/* ================== HEALTH ================== */
app.get("/", (req, res) => {
  res.send("SERVER IS ALIVE");
});

app.get("/ping", (req, res) => {
  res.json({ status: "OK" });
});

/* ================== ATTENDANCE ROUTES ================== */

// teacher → fetch class students
app.get("/api/attendance/class", (req, res) => {
  res.json([
    {
      studentUserId: "111",
      name: "Student One",
      status: "PRESENT",
    },
    {
      studentUserId: "222",
      name: "Student Two",
      status: "ABSENT",
    },
  ]);
});

// student → fetch own attendance
app.get("/api/attendance/me", (req, res) => {
  res.json([
    { date: "2026-01-20", status: "PRESENT" },
    { date: "2026-01-21", status: "ABSENT" },
  ]);
});

// teacher → submit attendance
app.post("/api/attendance/mark", (req, res) => {
  res.json({
    message: "Attendance saved (mock)",
    bodyReceived: req.body,
  });
});

/* ================== START ================== */
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
