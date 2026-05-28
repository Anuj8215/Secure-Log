#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;

try {
  const pids = execSync(`lsof -ti :${PORT}`, { encoding: 'utf8' }).trim();
  if (pids) {
    pids.split('\n').forEach((pid) => {
      try {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`Killed process ${pid} on port ${PORT}`);
      } catch {
        // already gone
      }
    });
  }
} catch {
  // lsof exits non-zero when nothing is listening — port is free
}

console.log(`Port ${PORT} is clear`);
