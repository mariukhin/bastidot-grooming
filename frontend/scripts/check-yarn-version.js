/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');

const expected = '1.22.10';
const actual = execSync('yarn -v').toString().trim();

if (actual !== expected) {
  console.error(`Yarn version must be ${expected}, but found ${actual}`);
  process.exit(1);
}

console.log(`Yarn version OK: ${actual}`);
