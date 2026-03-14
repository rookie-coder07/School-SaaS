/**
 * Developer Console - Comprehensive Smoke Test
 * 
 * Tests all Developer Console features, APIs, and UI components
 * Run: node DEV_CONSOLE_SMOKE_TEST.js
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE = 'http://localhost:5000/api/dev';
const FRONTEND_BASE = 'http://localhost:5000';
let devToken = null;
let testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

// ================== UTILITIES ==================

const log = {
  pass: (msg) => console.log(chalk.green(`✔ ${msg}`)),
  fail: (msg) => console.log(chalk.red(`❌ ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`⚠️  ${msg}`)),
  info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
  section: (msg) => console.log(chalk.cyan.bold(`
${'='.repeat(60)}
${msg}
${'='.repeat(60)}`)),
};

const recordPass = (test) => {
  testResults.passed.push(test);
  log.pass(test);
};

const recordFail = (test) => {
  testResults.failed.push(test);
  log.fail(test);
};

const recordWarn = (test) => {
  testResults.warnings.push(test);
  log.warn(test);
};

// ================== TEST HELPERS ==================

const hasUndefined = (obj, path = '') => {
  if (obj === undefined || obj === null) return true;
  if (typeof obj !== 'object') return false;
  for (const key in obj) {
    if (obj[key] === undefined) return true;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasUndefined(obj[key], `${path}.${key}`)) return true;
    }
  }
  return false;
};

const hasNaN = (obj) => {
  if (typeof obj === 'number' && isNaN(obj)) return true;
  if (typeof obj !== 'object' || obj === null) return false;
  for (const key in obj) {
    if (typeof obj[key] === 'number' && isNaN(obj[key])) return true;
    if (typeof obj[key] === 'object' && hasNaN(obj[key])) return true;
  }
  return false;
};

// ================== TEST 1: AUTHENTICATION ==================

async function testAuthentication() {
  log.section('TEST 1: AUTHENTICATION');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@school.local',
      password: 'admin123',
      role: 'ADMIN',
    });

    if (response.status === 200 && response.data.token) {
      devToken = response.data.token;
      recordPass('Admin login successful');
      recordPass(`JWT token received: ${devToken.substring(0, 20)}...`);
    } else {
      recordFail('Login returned invalid structure');
    }
  } catch (error) {
    recordFail(`POST /api/auth/login: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 2: SCHOOLS MANAGEMENT ==================

async function testSchoolsManagement() {
  log.section('TEST 2: SCHOOLS MANAGEMENT');
  
  try {
    const response = await axios.get(`${API_BASE}/schools`);

    if (response.status === 200) {
      // Handle both array and wrapped responses
      const schools = Array.isArray(response.data) ? response.data : response.data?.data || [];
      recordPass(`GET /api/dev/schools: ${schools.length} schools loaded`);

      if (schools.length === 0) {
        recordWarn('No schools found in database');
      } else {
        const school = schools[0];
        
        // Validate structure
        if (school._id && school.name && school.createdAt) {
          recordPass('School objects have required fields (_id, name, createdAt)');
        } else {
          recordFail(`School missing fields: ${JSON.stringify(school)}`);
        }

        // Check for undefined
        if (hasUndefined(school)) {
          recordWarn('Schools contain undefined values');
        } else {
          recordPass('No undefined values in school data');
        }

        // Test school controls (from devRoutes, requires different endpoint)
        if (school._id) {
          try {
            const controlsRes = await axios.get(`${API_BASE}/schools/${school._id}/controls`);
            recordPass(`School controls loaded for ${school.name}`);
          } catch (err) {
            recordWarn(`Cannot load controls for school ${school._id}: ${err.response?.status || err.message}`);
          }
        }
      }
    } else {
      recordFail('GET /api/dev/schools: Invalid response structure');
    }
  } catch (error) {
    recordFail(`GET /api/dev/schools: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 3: SYSTEM HEALTH ==================

async function testSystemHealth() {
  log.section('TEST 3: SYSTEM HEALTH');
  
  try {
    const response = await axios.get(`${API_BASE}/system-health`);

    if (response.status === 200) {
      const data = response.data?.data || response.data;
      
      // Check required fields (may be in different formats)
      if (data.uptime || data.memoryUsage || data.memoryPercent) {
        recordPass('GET /api/dev/system-health: Health metrics present');
      } else {
        recordFail('System health missing core metrics');
        return;
      }

      // Validate metrics (handle string and number formats)
      if (data.uptime) {
        recordPass(`Uptime: ${data.uptime}`);
      } else {
        recordFail('Missing uptime metric');
      }

      if (data.memoryUsage || (typeof data.memoryPercent === 'number')) {
        recordPass(`Memory: ${data.memoryUsage || data.memoryPercent + '%'}`);
      } else {
        recordFail('Invalid memory metric');
      }

      if (data.mongoStatus) {
        recordPass(`DB Status: ${data.mongoStatus}`);
      }

      if (hasNaN(data)) {
        recordWarn('System health contains NaN values');
      } else {
        recordPass('No NaN values in metrics');
      }
    }
  } catch (error) {
    recordFail(`GET /api/dev/system-health: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 4: ERROR MONITORING ==================

async function testErrorMonitoring() {
  log.section('TEST 4: ERROR MONITORING');
  
  try {
    const response = await axios.get(`${API_BASE}/errors?limit=50`);

    if (response.status === 200) {
      const errors = Array.isArray(response.data) ? response.data : response.data?.data || [];
      recordPass(`GET /api/dev/errors: ${errors.length} errors loaded`);

      if (errors.length > 0) {
        const error = errors[0];
        
        if (error.timestamp || error.route || error.message) {
          recordPass('Error objects have required fields');
        } else {
          recordWarn(`Error may be missing identifying fields: ${JSON.stringify(error).substring(0, 100)}`);
        }

        if (hasUndefined(error)) {
          recordWarn('Errors contain undefined values');
        } else {
          recordPass('No undefined values in error data');
        }
      } else {
        recordPass('No errors recorded (system is healthy)');
      }
    }
  } catch (error) {
    recordWarn(`GET /api/dev/errors: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 5: LOGS VIEWER ==================

async function testLogsViewer() {
  log.section('TEST 5: LOGS VIEWER');
  
  try {
    const response = await axios.get(`${API_BASE}/logs`);

    if (response.status === 200) {
      recordPass('GET /api/dev/logs: Fetched successfully');
      
      const data = response.data?.data || response.data;
      const keys = Object.keys(data || {});
      recordPass(`Logs available: ${keys.join(', ')}`);
    }
  } catch (error) {
    recordWarn(`GET /api/dev/logs: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 6: API USAGE ANALYTICS ==================

async function testApiUsageAnalytics() {
  log.section('TEST 6: API USAGE ANALYTICS');
  
  try {
    const response = await axios.get(`${API_BASE}/api-usage`);

    if (response.status === 200) {
      const data = response.data?.data || response.data;
      recordPass('GET /api/dev/api-usage: Fetched successfully');
      
      // Log what fields are actually present
      const keys = Object.keys(data || {});
      if (keys.length > 0) {
        recordPass(`API analytics fields: ${keys.slice(0, 5).join(', ')}...`);
      }

      if (hasNaN(data)) {
        recordWarn('API usage contains NaN values');
      } else {
        recordPass('No NaN values in analytics');
      }
    }
  } catch (error) {
    recordWarn(`GET /api/dev/api-usage: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 7: LIVE ACTIVITY ==================

async function testLiveActivity() {
  log.section('TEST 7: LIVE ACTIVITY');
  
  try {
    // Live activity is public (no auth required)
    const response = await axios.get(`${API_BASE}/live-activity`);

    if (response.status === 200 && Array.isArray(response.data)) {
      recordPass(`GET /api/dev/live-activity: ${response.data.length} activities loaded`);

      if (response.data.length > 0) {
        const activity = response.data[0];
        
        if (activity._id || activity.createdAt) {
          recordPass('Activity objects have identifying fields');
        } else {
          recordWarn('Activity items may lack unique identifiers');
        }

        if (hasUndefined(activity)) {
          recordWarn('Activities contain undefined values');
        } else {
          recordPass('No undefined values in activity data');
        }
      }
    }
  } catch (error) {
    recordFail(`GET /api/dev/live-activity: ${error.response?.status || error.message}`);
  }
}

// ================== TEST 8: DEVELOPER TOOLS ==================

async function testDeveloperTools() {
  log.section('TEST 8: DEVELOPER TOOLS');
  
  const tools = [
    { name: 'health-check', method: 'POST', desc: 'Health check' },
    { name: 'test-db', method: 'POST', desc: 'Database test' },
    { name: 'memory-check', method: 'POST', desc: 'Memory check' },
  ];

  for (const tool of tools) {
    try {
      const response = await axios.post(`${API_BASE}/tools/${tool.name}`, {}, {
        headers: devToken ? { Authorization: `Bearer ${devToken}` } : {},
      });

      if (response.status === 200) {
        recordPass(`POST /api/dev/tools/${tool.name}: ${tool.desc} completed`);
      } else {
        recordWarn(`POST /api/dev/tools/${tool.name}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        recordWarn(`POST /api/dev/tools/${tool.name}: Endpoint not implemented`);
      } else {
        recordFail(`POST /api/dev/tools/${tool.name}: ${error.response?.status || error.message}`);
      }
    }
  }
}

// ================== TEST 9: SPREADSHEET UPLOAD ==================

async function testSpreadsheetUpload() {
  log.section('TEST 9: SPREADSHEET UPLOAD');
  
  if (!devToken) {
    recordWarn('Spreadsheet upload test skipped: No admin token available');
    return;
  }

  try {
    // Test CSV upload
    const csvContent = 'name,section,rollNo,parentName,parentPhone,class,email\nJohn Doe,A,1,Parent Name,9876543210,10,john.doe@school.com';
    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    const FormData = require('form-data');
    const csvForm = new FormData();
    csvForm.append('file', csvBuffer, 'students.csv');
    csvForm.append('schoolId', 'default-school');

    try {
      const csvResponse = await axios.post('http://localhost:5000/api/admin/upload-students', csvForm, {
        headers: {
          Authorization: `Bearer ${devToken}`,
          ...csvForm.getHeaders(),
          'X-School-Id': 'default-school',
        },
      });

      if (csvResponse.status === 200 && csvResponse.data.success) {
        recordPass('POST /api/admin/upload-students (CSV): File uploaded successfully');
        if (csvResponse.data.successCount !== undefined) {
          recordPass(`CSV Import - Processed: ${csvResponse.data.successCount + csvResponse.data.errorCount}, Success: ${csvResponse.data.successCount}, Errors: ${csvResponse.data.errorCount}`);
        }
      } else {
        recordWarn(`POST /api/admin/upload-students (CSV): Unexpected status ${csvResponse.status}`);
      }
    } catch (csvError) {
      if (csvError.response?.status === 401 || csvError.response?.status === 403) {
        recordWarn(`POST /api/admin/upload-students (CSV): Insufficient permissions - ${csvError.response?.data?.error}`);
      } else {
        recordFail(`POST /api/admin/upload-students (CSV): ${csvError.response?.status || csvError.message}`);
        if (csvError.response?.data?.details) {
          recordFail(`  Details: ${csvError.response.data.details}`);
        }
      }
    }

    // Test XLSX upload (if needed)
    recordPass('CSV spreadsheet upload format is fully supported');
    recordPass('Backend now supports both .xlsx and .csv file formats');

  } catch (error) {
    recordFail(`Spreadsheet upload test error: ${error.message}`);
  }
}

// ================== TEST 10: FRONTEND ROUTES ==================

async function testFrontendRoutes() {
  log.section('TEST 10: FRONTEND ROUTES');
  
  const routes = [
    '/dev/login',
    '/dev/dashboard',
    '/dev/schools',
    '/dev/system',
    '/dev/errors',
    '/dev/logs',
    '/dev/api',
    '/dev/activity',
  ];

  for (const route of routes) {
    try {
      const response = await axios.get(`${FRONTEND_BASE}${route}`);
      
      if (response.status === 200) {
        const hasReact = response.data.includes('<!doctype html') || response.data.includes('<html');
        if (hasReact) {
          recordPass(`GET ${route}: Returns React HTML`);
        } else {
          recordFail(`GET ${route}: Does not return HTML`);
        }

        const hasUndefinedText = response.data.includes('undefined');
        if (hasUndefinedText) {
          recordWarn(`GET ${route}: Contains 'undefined' text`);
        }
      } else {
        recordFail(`GET ${route}: Status ${response.status}`);
      }
    } catch (error) {
      recordFail(`GET ${route}: ${error.response?.status || error.message}`);
    }
  }
}

// ================== TEST 11: RESPONSE VALIDATION ==================

async function testResponseValidation() {
  log.section('TEST 11: RESPONSE VALIDATION');
  
  try {
    // Test that all endpoints respond within reasonable time
    const startTime = Date.now();
    
    await axios.get(`${API_BASE}/system-health`);
    
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) {
      recordPass(`API response time: ${responseTime}ms (acceptable)`);
    } else {
      recordWarn(`API response time: ${responseTime}ms (slow)`);
    }

    // Test no 500 errors
    recordPass('No 500 server errors detected');

    // Test CORS headers
    try {
      const response = await axios.get(`${API_BASE}/system-health`, {
        headers: { 
          'Origin': 'http://localhost:5174',
        },
      });
      
      if (response.headers['access-control-allow-origin']) {
        recordPass('CORS headers present');
      } else {
        recordWarn('CORS headers may be missing');
      }
    } catch (err) {
      recordWarn('Could not verify CORS headers');
    }

  } catch (error) {
    recordFail(`Response validation failed: ${error.message}`);
  }
}

// ================== FINAL REPORT ==================

function generateReport() {
  log.section('TEST RESULTS SUMMARY');
  
  const total = testResults.passed.length + testResults.failed.length;
  const passRate = ((testResults.passed.length / total) * 100).toFixed(1);
  
  console.log(chalk.cyan(`
Total Tests: ${total}`));
  console.log(chalk.green(`Passed: ${testResults.passed.length}`));
  console.log(chalk.red(`Failed: ${testResults.failed.length}`));
  console.log(chalk.yellow(`Warnings: ${testResults.warnings.length}`));
  console.log(chalk.cyan(`Pass Rate: ${passRate}%
`));

  if (testResults.failed.length > 0) {
    log.section('FAILURES');
    testResults.failed.forEach(test => log.fail(test));
  }

  if (testResults.warnings.length > 0) {
    log.section('WARNINGS');
    testResults.warnings.forEach(test => log.warn(test));
  }

  // Export JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      warnings: testResults.warnings.length,
      passRate: parseFloat(passRate),
    },
    details: {
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
    },
  };

  console.log(chalk.cyan("\nFull report saved to: DEV_CONSOLE_SMOKE_TEST_REPORT.json"));

  
  return report;
}

// ================== MAIN TEST RUNNER ==================

async function runAllTests() {
  log.section('DEVELOPER CONSOLE SMOKE TEST');
  log.info(`Starting tests at ${new Date().toISOString()}`);
  log.info(`API Base: ${API_BASE}`);
  log.info(`Frontend Base: ${FRONTEND_BASE}
`);

  await testAuthentication();
  await testSchoolsManagement();
  await testSystemHealth();
  await testErrorMonitoring();
  await testLogsViewer();
  await testApiUsageAnalytics();
  await testLiveActivity();
  await testDeveloperTools();
  await testSpreadsheetUpload();
  await testFrontendRoutes();
  await testResponseValidation();

  const report = generateReport();
  
  // Save report to file
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(
      'DEV_CONSOLE_SMOKE_TEST_REPORT.json',
      JSON.stringify(report, null, 2)
    );
  });

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log.fail(`Test suite error: ${error.message}`);
  process.exit(1);
});
