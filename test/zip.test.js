// The zip command makes the one file that is sent to someone: the folder
// Chrome loads unpacked, with the README inside it. These tests run the command
// into a throwaway folder and read its zip with the system's own `unzip`, not
// with anything written here. What Chrome says about the unzipped folder is
// checked in a browser: `node scripts/check-in-browser.js <folder>`.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let scratch;
let made;
let unzipped;

before(() => {
  scratch = mkdtempSync(join(tmpdir(), 'notes-over-audio-zip-'));
  made = join(scratch, 'made');
  execFileSync(process.execPath, ['scripts/zip.js', made], { cwd: root });
  unzipped = join(scratch, 'somewhere new');
  execFileSync('unzip', ['-q', join(made, 'notes-over-audio-0.3.zip'), '-d', unzipped]);
});

after(() => rmSync(scratch, { recursive: true, force: true }));

/** A hidden file, such as the one the Finder leaves in a folder it has shown. The zip takes none. */
const hidden = (file) => /(^|\/)\./.test(file);

/** Every file under a folder that is not hidden, by its path from that folder, with what it holds. */
const filesIn = (folder) =>
  Object.fromEntries(
    readdirSync(folder, { recursive: true })
      .filter((file) => statSync(join(folder, file)).isFile() && !hidden(file))
      .sort()
      .map((file) => [file, readFileSync(join(folder, file), 'utf8')])
  );

test('the zip command makes one file, named for the extension and marked with its version, 0.3', () => {
  assert.deepEqual(readdirSync(made), ['notes-over-audio-0.3.zip']);
});

test('unzipped somewhere new, it is one folder, and that folder is the one to load: the manifest and the README are at its top', () => {
  // A folder inside the unzipped one was tried first. The first person to follow the README chose the outer one, and Chrome found no manifest.
  assert.deepEqual(readdirSync(unzipped), ['notes-over-audio-0.3']);
  assert.deepEqual(readdirSync(join(unzipped, 'notes-over-audio-0.3')).sort(), ['README.md', 'core', 'extension', 'icons', 'manifest.json']);
});

test('the folder to load is the folder the build command makes, file for file, with the README added', () => {
  const built = join(scratch, 'built');
  execFileSync(process.execPath, ['scripts/build.js', built], { cwd: root });
  const { 'README.md': readme, ...toLoad } = filesIn(join(unzipped, 'notes-over-audio-0.3'));

  assert.ok(readme, 'the README is at the top of the folder to load');
  assert.ok('manifest.json' in toLoad, 'the manifest is at the top of the folder to load');
  assert.deepEqual(toLoad, filesIn(built));
});

test('the unzipped extension carries the working name, version 0.3, and the id it has always had', () => {
  const manifest = JSON.parse(readFileSync(join(unzipped, 'notes-over-audio-0.3/manifest.json'), 'utf8'));
  // Chrome takes an unpacked extension's id from the key in its manifest: the first 32 hex digits of the key's SHA-256, written a to p.
  const digest = createHash('sha256').update(Buffer.from(manifest.key ?? '', 'base64')).digest('hex');
  const id = [...digest.slice(0, 32)].map((digit) => 'abcdefghijklmnop'[parseInt(digit, 16)]).join('');

  assert.equal(manifest.name, 'Notes Over Audio');
  assert.equal(manifest.version, '0.3');
  assert.equal(id, 'nekpkadhomgkgmkcnkljoejocdcjdmac');
});

test('the README in the zip is the one at the root of the repository, and its heading names the version it came with', () => {
  const inZip = readFileSync(join(unzipped, 'notes-over-audio-0.3/README.md'), 'utf8');
  const { version } = JSON.parse(readFileSync(join(root, 'src/manifest.json'), 'utf8'));

  assert.equal(inZip, readFileSync(join(root, 'README.md'), 'utf8'));
  assert.equal(inZip.split('\n')[0], `# Notes Over Audio ${version}`);
});

test('the zip holds nothing else: no licence file, no picture but the icon the manifest names, and none of the files a file manager leaves behind', () => {
  // Read from the zip's own list of what it holds, since unzipping could hide a name.
  const held = execFileSync('unzip', ['-Z1', join(made, 'notes-over-audio-0.3.zip')], { encoding: 'utf8' })
    .split('\n')
    .filter((name) => name && !name.endsWith('/'));
  const expected = ['README.md', ...readdirSync(join(root, 'src'), { recursive: true }).filter((file) => statSync(join(root, 'src', file)).isFile())]
    .filter((file) => !hidden(file))
    .map((file) => `notes-over-audio-0.3/${file}`);

  assert.deepEqual(held.sort(), expected.sort());
  assert.deepEqual(held.filter((name) => /licen[cs]e|copying|(^|\/)\./i.test(name)), [], 'a licence or a hidden file');

  // The icon is part of the extension, and the store takes no zip without the one of 128. Nothing made for a store listing is a part of it.
  const { icons } = JSON.parse(readFileSync(join(root, 'src/manifest.json'), 'utf8'));
  assert.ok('128' in icons, 'the manifest names an icon of 128');
  assert.deepEqual(held.filter((name) => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(name)).sort(), Object.values(icons).map((file) => `notes-over-audio-0.3/${file}`).sort());
});

test('made again where a zip of the same version already is, the new zip takes its place and holds nothing of the old one', () => {
  // `zip` adds to an archive it finds, so a file since deleted from the extension would otherwise stay in the zip for good.
  const again = join(scratch, 'made again');
  mkdirSync(join(again, 'notes-over-audio-0.3/extension'), { recursive: true });
  writeFileSync(join(again, 'notes-over-audio-0.3/extension/since-deleted.js'), '// no longer part of the extension\n');
  execFileSync('zip', ['-r', '-q', 'notes-over-audio-0.3.zip', 'notes-over-audio-0.3'], { cwd: again });
  rmSync(join(again, 'notes-over-audio-0.3'), { recursive: true });

  execFileSync(process.execPath, ['scripts/zip.js', again], { cwd: root });

  const list = (zip) => execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' });
  assert.equal(list(join(again, 'notes-over-audio-0.3.zip')), list(join(made, 'notes-over-audio-0.3.zip')));
});

test("what the README puts in quotes is what is on the screen: each phrase is in the extension beside it, or is Chrome's own, or is one of the README's headings", () => {
  // The README is followed by someone with nobody to ask, so a button it names has to be the button that is there.
  const readme = readFileSync(join(unzipped, 'notes-over-audio-0.3/README.md'), 'utf8');
  // The README sits in the same folder now, and would vouch for every phrase of its own.
  const { 'README.md': itself, ...files } = filesIn(join(unzipped, 'notes-over-audio-0.3'));
  const extension = Object.values(files).join('\n');
  const quoted = [...new Set([...readme.matchAll(/"([^"\n]+)"/g)].map((match) => match[1]))];
  // What Chrome's extensions page and Windows say, which nothing here can read.
  const notOurs = ['Developer mode', 'Load unpacked', 'Remove', 'Manifest file is missing or unreadable', 'Extract All'];
  const headings = [...readme.matchAll(/^#+ (.+)$/gm)].map((match) => match[1]);

  assert.ok(['Copy as Markdown', 'Remove highlight', 'Getting the transcript…'].every((phrase) => quoted.includes(phrase)), 'the README quotes the panel');
  assert.deepEqual(quoted.filter((phrase) => !notOurs.includes(phrase) && !headings.includes(phrase) && !extension.includes(phrase)), []);
});
