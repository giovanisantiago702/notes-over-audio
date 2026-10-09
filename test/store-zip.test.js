// The zip for the Chrome Web Store: the build with its manifest at the top of
// the zip, no `key` in that manifest, and no README. These tests run the
// command into a throwaway folder and read its zip with the system's own
// `unzip`. What the store says about the zip is seen only by uploading it.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, 'src/manifest.json'), 'utf8'));
const named = `notes-over-audio-${version}-store.zip`;
let scratch;
let made;
let unzipped;
let built;

before(() => {
  scratch = mkdtempSync(join(tmpdir(), 'notes-over-audio-store-zip-'));
  made = join(scratch, 'made');
  execFileSync(process.execPath, ['scripts/store-zip.js', made], { cwd: root });
  unzipped = join(scratch, 'unzipped');
  execFileSync('unzip', ['-q', join(made, named), '-d', unzipped]);
  built = join(scratch, 'built');
  execFileSync(process.execPath, ['scripts/build.js', built], { cwd: root });
});

after(() => rmSync(scratch, { recursive: true, force: true }));

/** Every file under a folder, by its path from that folder, with what it holds. */
const filesIn = (folder) =>
  Object.fromEntries(
    readdirSync(folder, { recursive: true })
      .filter((file) => statSync(join(folder, file)).isFile())
      .sort()
      .map((file) => [file, readFileSync(join(folder, file), 'utf8')])
  );

test('the command makes one file, named for the extension, its version and the store', () => {
  assert.deepEqual(readdirSync(made), [named]);
});

test('the manifest is at the top of the zip, where the store looks for it, and no file is hidden', () => {
  // Read from the zip's own list of what it holds, since unzipping could hide a name.
  const held = execFileSync('unzip', ['-Z1', join(made, named)], { encoding: 'utf8' }).split('\n').filter((name) => name && !name.endsWith('/'));

  assert.ok(held.includes('manifest.json'));
  assert.deepEqual(held.filter((name) => /(^|\/)\./.test(name)), []);
});

test('the manifest has no key, since the store gives its item one, and is otherwise the manifest of the build', () => {
  const inZip = JSON.parse(readFileSync(join(unzipped, 'manifest.json'), 'utf8'));
  const { key, ...ofTheBuild } = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));

  assert.ok(key, 'the build has a key to leave out');
  assert.equal('key' in inZip, false);
  assert.deepEqual(inZip, ofTheBuild);
});

test('everything else is the build, file for file, with no README', () => {
  const { 'manifest.json': manifestInZip, ...inZip } = filesIn(unzipped);
  const { 'manifest.json': manifestOfBuild, ...ofTheBuild } = filesIn(built);

  assert.deepEqual(inZip, ofTheBuild);
  assert.equal(Object.keys(inZip).some((file) => /readme/i.test(file)), false);
});

test('the icon of 128 that the store asks for is in the zip, where the manifest says', () => {
  const { icons } = JSON.parse(readFileSync(join(unzipped, 'manifest.json'), 'utf8'));

  assert.ok(statSync(join(unzipped, icons['128'])).isFile());
});
