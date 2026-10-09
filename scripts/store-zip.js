// Makes the zip that is uploaded to the Chrome Web Store.
//
//   node scripts/store-zip.js          writes zip/notes-over-audio-<version>-store.zip
//   node scripts/store-zip.js <folder> writes it into that folder instead
//
// It is not the zip that is sent to someone (scripts/zip.js), in three ways:
//
//   - The manifest is at the top of the zip, not in a folder. The store looks
//     for it there and nowhere else.
//   - The manifest has no `key`. The key gives a copy loaded by hand the same
//     id from whatever folder it is loaded. The store gives its item a key and
//     an id of its own, so the store's copy does not see what a copy loaded by
//     hand has kept.
//   - There is no README in it. The README tells how to load a zip by hand.
//
// It is made with the system's own `zip`, which macOS has. Nothing is installed for it.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const to = resolve(process.argv[2] ?? join(root, 'zip'));

const { version } = JSON.parse(readFileSync(join(root, 'src/manifest.json'), 'utf8'));
const zip = join(to, `notes-over-audio-${version}-store.zip`);

// The zip is put together in a folder of its own, which is thrown away after.
const stage = mkdtempSync(join(tmpdir(), 'notes-over-audio-store-zip-'));
try {
  execFileSync(process.execPath, [join(root, 'scripts/build.js'), stage], { stdio: ['ignore', 'ignore', 'inherit'] });

  const { key, ...manifest } = JSON.parse(readFileSync(join(stage, 'manifest.json'), 'utf8'));
  writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  mkdirSync(to, { recursive: true });
  // `zip` adds to an archive it finds, so one made before is taken away first.
  rmSync(zip, { force: true });
  // What is at the top of the build is named one by one, so that it is at the
  // top of the zip. -X keeps this machine's user and group out. Hidden files
  // are left out: a file manager drops its own into any folder it has shown.
  const atTheTop = readdirSync(stage).filter((name) => !name.startsWith('.'));
  execFileSync('zip', ['-r', '-X', '-q', zip, ...atTheTop, '-x', '.*', '*/.*'], { cwd: stage, stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`Zipped ${zip} (${statSync(zip).size.toLocaleString('en')} bytes)`);
} catch (error) {
  console.error(error.code === 'ENOENT' && error.path === 'zip' ? 'Not zipped: this needs the `zip` command, and none was found.' : `Not zipped: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(stage, { recursive: true, force: true });
}
