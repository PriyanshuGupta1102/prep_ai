#!/usr/bin/env node
/**
 * Cross-platform start script for Render and local development.
 * Reads PORT from environment variable or defaults to 3000.
 * Works on Windows (PowerShell, CMD) and Unix (bash, sh).
 */

const { spawn } = require('child_process');

const port = process.env.PORT || 3000;

console.log(`Starting Next.js on port ${port}...`);

const child = spawn('next', ['start', '-p', String(port)], {
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
