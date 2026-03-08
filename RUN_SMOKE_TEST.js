#!/usr/bin/env node

/**
 * Simple Powershell-compatible test runner
 * Usage: node RUN_SMOKE_TEST.js
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.cyan('📋 Developer Console Smoke Test Runner\n'));

// Check if server is running
import http from 'http';

const checkServer = (host, port) => {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/api/dev/system-health`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 401);
    });
    req.on('error', () => resolve(false));
  });
};

async function main() {
  console.log(chalk.blue('✓ Checking server connectivity...\n'));

  const serverRunning = await checkServer('localhost', 5000);
  
  if (!serverRunning) {
    console.log(chalk.red('❌ Backend server not running on port 5000'));
    console.log(chalk.yellow('Start the server with:\n  cd server && node server.js\n'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Backend server is reachable\n'));
  console.log(chalk.cyan('Running full smoke test suite...\n'));

  // Run the smoke test
  const child = spawn('node', ['DEV_CONSOLE_SMOKE_TEST.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green.bold('\n✔ All smoke tests completed successfully!\n'));
    } else {
      console.log(chalk.red.bold('\n❌ Some tests failed. Check the report above.\n'));
    }
    process.exit(code);
  });
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
