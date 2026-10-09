// Makes the zip that is sent to someone: the folder Chrome loads unpacked, with
// the README inside it.
//
//   node scripts/zip.js          writes zip/notes-over-audio-<version>.zip
//   node scripts/zip.js <folder> writes it into that folder instead
//
// The version is the manifest's. Unzipped, it is one folder, and that folder is
// the one to choose at "Load unpacked":
//
//   notes-over-audio-<version>/
//     manifest.json, core/, extension/   what `node scripts/build.js` makes
//     README.md                          the one at the root of the repository
//
// The extension was once a folder inside this one, beside the README. The first
// person to follow the README chose the outer folder, and Chrome found no manifest.
//
// It is made with the system's own `zip`, which macOS has. Nothing is installed for it.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const to = resolve(process.argv[2] ?? join(root, 'zip'));

const { version } = JSON.parse(readFileSync(join(root, 'src/manifest.json'), 'utf8'));
const named = `notes-over-audio-${version}`;
const zip = join(to, `${named}.zip`);

// The zip is put together in a folder of its own, which is thrown away after.
const stage = mkdtempSync(join(tmpdir(), 'notes-over-audio-zip-'));
try {
  // The build empties the folder it builds into, so the README goes in after it.
  execFileSync(process.execPath, [join(root, 'scripts/build.js'), join(stage, named)], { stdio: ['ignore', 'ignore', 'inherit'] });
  cpSync(join(root, 'README.md'), join(stage, named, 'README.md'));

  mkdirSync(to, { recursive: true });
  // `zip` adds to an archive it finds, so one made before is taken away first.
  rmSync(zip, { force: true });
  // -X keeps this machine's user and group out of the zip. Hidden files are left
  // out: a file manager drops its own into any folder it has shown, src/ included.
  execFileSync('zip', ['-r', '-X', '-q', zip, named, '-x', '.*', '*/.*'], { cwd: stage, stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`Zipped ${zip} (${statSync(zip).size.toLocaleString('en')} bytes)`);
} catch (error) {
  console.error(error.code === 'ENOENT' && error.path === 'zip' ? 'Not zipped: this needs the `zip` command, and none was found.' : `Not zipped: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(stage, { recursive: true, force: true });
}
