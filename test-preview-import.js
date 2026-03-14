#!/usr/bin/env node

/**
 * Test import preview and confirm workflow
 * Usage: node test-preview-import.js
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';
const TEST_FILE = 'C:\\Users\\ASUS\\OneDrive\\Desktop\\test_student.xlsx';

console.log('\n=== Import Preview and Confirm Workflow Test ===\n');

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
    console.log(`✓ Login successful\n`);

    // Step 2: Upload file for preview
    console.log('Step 2: Uploading file for preview...');
    
    const previewForm = new FormData();
    previewForm.append('file', fs.createReadStream(TEST_FILE));

    const previewResponse = await axios.post(`${API_BASE}/api/admin/upload-students-preview`, previewForm, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...previewForm.getHeaders(),
      },
    });

    if (!previewResponse.data.success) {
      throw new Error('Preview generation failed');
    }

    const { previewId, totalRows, validRows, invalidRows, preview } = previewResponse.data;
    
    console.log(`✓ Preview generated successfully\n`);
    console.log('Preview Summary:');
    console.log(`  Total rows: ${totalRows}`);
    console.log(`  Valid rows: ${validRows}`);
    console.log(`  Invalid rows: ${invalidRows}\n`);

    console.log('Preview Data (first 5 rows):');
    preview.slice(0, 5).forEach((row, idx) => {
      console.log(`  ${idx + 1}. Name: ${row.name}, Class: ${row.class}, RollNo: ${row.rollNo}, Status: ${row.status}`);
      if (row.error) {
        console.log(`     Error: ${row.error}`);
      }
    });
    console.log();

    // Step 3: Confirm import
    console.log('Step 3: Confirming import...');
    
    const confirmResponse = await axios.post(`${API_BASE}/api/admin/confirm-student-import`, 
      { previewId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!confirmResponse.data.success) {
      throw new Error('Import confirmation failed');
    }

    const { imported, skipped, errors } = confirmResponse.data;
    
    console.log(`✓ Import completed\n`);
    console.log('Import Results:');
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped: ${skipped}`);
    
    if (errors && errors.length > 0) {
      console.log(`  Errors:${errors
        .slice(0, 3)
        .map(e => `\n    - ${e.row}: ${e.message}`)
        .join('')}`);
    }
    console.log();

    console.log('✓ Workflow completed successfully!\n');
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
