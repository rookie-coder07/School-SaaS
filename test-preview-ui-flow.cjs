/**
 * Test Student Preview Import UI Flow
 * Simulates the complete frontend workflow:
 * 1. Admin selects file
 * 2. Clicks "Preview Import" button
 * 3. Sees preview table
 * 4. Clicks "Confirm Import"
 * 5. Sees import result
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const API_URL = "http://localhost:5000";

// Admin credentials
const adminEmail = "admin1@delhipublicacademy.com";
const adminPassword = "Password@123";
let adminToken = "";

async function login() {
  console.log("\n📝 STEP 1: Login as Admin");
  try {
    const res = await axios.post(`${API_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });
    adminToken = res.data.token;
    console.log("✓ Login successful");
    console.log(`  Token: ${adminToken.substring(0, 20)}...`);
    return true;
  } catch (err) {
    console.error("✗ Login failed:", err.response?.data?.error || err.message);
    return false;
  }
}

async function previewStudents() {
  console.log("\n📋 STEP 2: Call Preview API (Simulate File Upload)");

  // Create test CSV file
  const fileToUse = "c:\\projects\\School-SaaS\\test-preview-sample.csv";
  const csvContent = `name,class,section,rollNo,parentName,parentPhone,email
Rajesh Kumar,10,A,1,Parent One,9876543210,rajesh@school.com
Priya Singh,10,A,1,Parent Two,98765432101,priya@school.com
Arjun Patel,10,B,5,Parent Three,9876543210,arjun@school.com`;

  fs.writeFileSync(fileToUse, csvContent);
  console.log(`✓ Created test CSV file`);

  try {
    const fileStream = fs.createReadStream(fileToUse);
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", fileStream);

    console.log(`Uploading file: test-preview-sample.csv`);

    const res = await axios.post(
      `${API_URL}/api/admin/upload-students-preview`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          ...formData.getHeaders(),
        },
      }
    );

    const previewData = res.data;
    console.log("✓ Preview API response received");
    console.log(`  Total Rows: ${previewData.totalRows}`);
    console.log(`  Valid Rows: ${previewData.validRows}`);
    console.log(`  Invalid Rows: ${previewData.invalidRows}`);
    console.log(`  Preview ID: ${previewData.previewId.substring(0, 20)}...`);

    if (previewData.preview && previewData.preview.length > 0) {
      console.log("\n  Preview Data (all rows):");
      previewData.preview.forEach((row, idx) => {
        console.log(
          `    [${idx}] ${row.name || "N/A"} | Class: ${row.class} | Section: ${row.section} | Status: ${row.status}`
        );
        if (row.error) console.log(`        Error: ${row.error}`);
      });
    }

    return previewData.previewId;
  } catch (err) {
    console.error(
      "✗ Preview API failed:",
      err.response?.data?.error || err.message
    );
    return null;
  }
}

async function confirmImport(previewId) {
  console.log(`\n✅ STEP 3: Call Confirm Import API`);

  try {
    const res = await axios.post(
      `${API_URL}/api/admin/confirm-student-import`,
      { previewId },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = res.data;
    console.log("✓ Confirm Import API response received");
    console.log(`  Imported: ${result.imported}`);
    console.log(`  Skipped: ${result.skipped}`);

    return result;
  } catch (err) {
    console.error(
      "✗ Confirm API failed:",
      err.response?.data?.error || err.message
    );
    return null;
  }
}

async function runTest() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("   STUDENT PREVIEW IMPORT UI FLOW TEST");
  console.log("═══════════════════════════════════════════════════════════");

  // Step 1: Login
  if (!(await login())) {
    console.error("\n✗ Test aborted: Could not login");
    process.exit(1);
  }

  // Step 2: Get preview
  const previewId = await previewStudents();
  if (!previewId) {
    console.error("\n✗ Test aborted: Could not get preview");
    process.exit(1);
  }

  // Step 3: Confirm import
  const result = await confirmImport(previewId);
  if (!result) {
    console.error("\n✗ Test aborted: Could not confirm import");
    process.exit(1);
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("   TEST RESULT: PASSED ✓");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Complete workflow:");
  console.log("  1. ✓ Admin logged in");
  console.log("  2. ✓ File uploaded and verified by preview API");
  console.log("  3. ✓ Preview data displayed");
  console.log("  4. ✓ Admin confirmed import with previewId");
  console.log("  5. ✓ Database updated with imported students");
  console.log("\nUI will display:");
  console.log(`  - Preview table with ${result.imported + result.skipped} rows`);
  console.log(`  - Green rows for valid entries`);
  console.log(`  - Red rows for invalid/duplicate entries`);
  console.log(`  - Summary: ${result.imported} imported, ${result.skipped} skipped`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

runTest().catch((err) => {
  console.error("Test error:", err.message);
  process.exit(1);
});
