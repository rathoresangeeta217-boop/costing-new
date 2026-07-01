import fs from 'fs';
import path from 'path';

function walk(dir, indent = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log(`${indent}${file}/`);
      walk(filePath, indent + '  ');
    } else {
      console.log(`${indent}${file}`);
    }
  }
}

walk('.');
