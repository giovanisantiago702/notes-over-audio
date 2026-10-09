// Makes the folder Chrome loads unpacked: a copy of src/, which is already laid
// out as the extension. Nothing is compiled or bundled.
//
//   node scripts/build.js          writes dist/
//   node scripts/build.js <folder> writes that folder instead

import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const to = resolve(process.argv[2] ?? join(root, 'dist'));

// The folder is emptied first, so only ever empty one that is a previous build.
if (existsSync(to) && readdirSync(to).length > 0 && !existsSync(join(to, 'manifest.json'))) {
  console.error(`Not building into ${to}: it holds files and is not a previous build.`);
  process.exit(1);
}

rmSync(to, { recursive: true, force: true });
cpSync(join(root, 'src'), to, { recursive: true });
console.log(`Built ${to}`);
