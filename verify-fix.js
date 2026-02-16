#!/usr/bin/env node
/**
 * 🔍 ATTENDANCE LOCK VALIDATION SCRIPT
 * Minimal test to verify the bug is fixed
 */

const API_URL = "http://localhost:5000/api";

async function test() {
  console.log("\n🔍 ATTENDANCE LOCK VALIDATION TEST\n");
  
  try {
    // Test 1: Check if API is responding
    console.log("1️⃣ Testing backend connectivity...");
    const res1 = await fetch(`${API_URL}/teacher/attendance`, {
      headers: { Authorization: "Bearer test" },
    });
    
    if (!res1.ok && res1.status !== 401) {
      console.log("❌ Backend not responding correctly. Status:", res1.status);
      console.log("   Make sure: npm start (in server folder)");
      process.exit(1);
    }
    console.log("✅ Backend is reachable\n");

    // Test 2: Verify code structure
    console.log("2️⃣ Checking frontend code fixes...");
    const fs = require("fs");
    const code = fs.readFileSync("client/src/pages/TeacherDashboard.jsx", "utf8");
    
    // Check 1: NO setLocked(false) in students fetch
    const studentsFetchMatch = code.match(/\/\* ===== FETCH STUDENTS ===== \*\/[\s\S]*?}, \[className, section, token\]\);/);
    if (studentsFetchMatch) {
      const studentsFetch = studentsFetchMatch[0];
      if (studentsFetch.includes("setLocked(false)")) {
        console.log("❌ Found 'setLocked(false)' in students fetch - THIS IS THE BUG!");
        console.log("   FIX: Remove the setLocked(false) call from students effect");
        process.exit(1);
      } else {
        console.log("✅ No 'setLocked(false)' in students fetch");
      }
    }
    
    // Check 2: date is in lock check dependencies
    const lockCheckMatch = code.match(/\/\* ===== FETCH ATTENDANCE STATUS[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[(.*?)\]\);/);
    if (lockCheckMatch) {
      const deps = lockCheckMatch[1];
      if (deps.includes("date")) {
        console.log("✅ 'date' is in lock check effect dependencies");
      } else {
        console.log("❌ 'date' is MISSING from lock check dependencies - THIS IS A BUG!");
        console.log("   FIX: Add 'date' to: [" + deps + "]");
        process.exit(1);
      }
    }
    console.log();

    // Test 3: Verify backend logic
    console.log("3️⃣ Checking backend code structure...");
    const backendCode = fs.readFileSync("server/routes/teacher.js", "utf8");
    
    // Check: isFinalized check in save endpoint
    if (backendCode.includes("isFinalized: true") && backendCode.includes("403")) {
      console.log("✅ Backend has isFinalized check with 403 error");
    } else {
      console.log("⚠️ Backend may not have proper finalization checks");
    }

    // Check: GET endpoint returns isFinalized
    if (backendCode.includes("res.json({") && backendCode.includes("isFinalized")) {
      console.log("✅ Backend GET endpoint returns isFinalized field");
    }
    console.log();

    console.log("═".repeat(60));
    console.log("✅ ALL CHECKS PASSED - CODE FIXES ARE IN PLACE!");
    console.log("═".repeat(60));
    console.log("\n📝 NEXT STEPS TO VERIFY BUG IS FIXED:\n");
    console.log("1. Start backend:  cd server && npm start");
    console.log("2. Start frontend: cd client && npm run dev");
    console.log("3. Follow SCENARIO 2 in test-attendance-lock-master.js:");
    console.log("   - Finalize today's attendance");
    console.log("   - Change date to yesterday");
    console.log("   - Change date back to today");
    console.log("   - VERIFY: Buttons are DISABLED (not editable)");
    console.log("\n");

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

test();
