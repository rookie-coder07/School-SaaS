import request from "supertest";

/**
 * Jest + Supertest starter.
 * To run:
 * 1) export app from server entry in test mode OR point to a dedicated test app module
 * 2) set TEST_API_BASE_URL if using running server.
 */

const API_BASE = process.env.TEST_API_BASE_URL || "http://localhost:5000";

describe("Teacher Portal API Contract", () => {
  test("debug health route shape", async () => {
    const res = await request(API_BASE).get("/api/debug/health");
    expect([200, 429]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("uptime");
      expect(res.body).toHaveProperty("memoryUsage");
      expect(res.body).toHaveProperty("mongoStatus");
      expect(res.body).toHaveProperty("jwtWorking");
      expect(res.body).toHaveProperty("teacherCount");
      expect(res.body).toHaveProperty("studentCount");
    }
  });

  test("teacher cannot access admin users route", async () => {
    const token = process.env.TEST_TEACHER_TOKEN || "";
    const res = await request(API_BASE)
      .get("/api/admin/users")
      .set("Authorization", token ? `Bearer ${token}` : "");
    expect([401, 403]).toContain(res.statusCode);
  });

  test("attendance summary requires auth", async () => {
    const res = await request(API_BASE).get("/api/teacher/attendance/summary?className=1&section=A");
    expect(res.statusCode).toBe(401);
  });
});

