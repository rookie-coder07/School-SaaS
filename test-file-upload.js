#!/usr/bin/env node

/**
 * Test spreadsheet upload with actual file
 * Usage: node test-file-upload.js
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';
const TEST_FILE = 'C:\\Users\\ASUS\\OneDrive\\Desktop\\test_student.xlsx';

console.log('\n=== Spreadsheet Upload Test ===\n');

async function main() {
  try {
    // Step 1: Login as admin
    console.log('Step 1: Authenticating as admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin1@delhipublicacademy.com',
      password: 'Password@123',
    });

    if (!loginResponse.data.token) {
      throw new Error('No token received from login');
    }

    const token = loginResponse.data.token;
    console.log(`✓ Login successful. Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Check file
    console.log('Step 2: Verifying test file...');
    if (!fs.existsSync(TEST_FILE)) {
      throw new Error(`File not found: ${TEST_FILE}`);
    }

    const fileStats = fs.statSync(TEST_FILE);
    const fileSizeKB = (fileStats.size / 1024).toFixed(2);
    console.log(`✓ File found: ${path.basename(TEST_FILE)}`);
    console.log(`  Size: ${fileSizeKB} KB\n`);

    // Step 3: Upload file
    console.log('Step 3: Uploading file to /api/admin/upload-students...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE));

    const uploadResponse = await axios.post(`${API_BASE}/api/admin/upload-students`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
    });

    console.log('✓ Upload successful!\n');

    // Step 4: Display results
    console.log('📊 Upload Results:\n');
    console.log(`  SUCCESS: ${uploadResponse.data.successCount || 0} records`);
    console.log(`  ERRORS: ${uploadResponse.data.errorCount || 0} records`);
    console.log(`  MESSAGE: ${uploadResponse.data.message}\n`);

    if (uploadResponse.data.errors && uploadResponse.data.errors.length > 0) {
      console.log('⚠️  First few errors:\n');
      uploadResponse.data.errors.slice(0, 5).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Row: ${err.row}`);
        console.log(`     Error: ${err.error}\n`);
      });
    } else {
      console.log('✓ No errors - all records processed successfully!\n');
    }

    console.log('✓ Test completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.log('✗ Error:\n');
    
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Error: ${error.response.data?.error || error.message}`);
      if (error.response.data?.details) {
        console.log(`  Details: ${error.response.data.details}`);
      }
    } else {
      console.log(`  ${error.message}`);
    }
    
    console.log();
    process.exit(1);
  }
}

main();
