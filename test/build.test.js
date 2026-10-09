// The build command makes the folder Chrome loads unpacked. These tests run
// the command into a throwaway folder and read what it made. What Chrome
// itself says about the folder is checked by `npm run check:browser`.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPanel } from '../src/core/panel.js';
import { standInPlayer } from './stand-in-player.js';
import { standInStore } from './stand-in-store.js';

const root = fileURLToPath(new URL('..', import.meta.url));
let built;
let manifest;

before(() => {
  built = mkdtempSync(join(tmpdir(), 'notes-over-audio-build-'));
  execFileSync(process.execPath, ['scripts/build.js', built], { cwd: root });
  manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
});

after(() => rmSync(built, { recursive: true, force: true }));

test('the built folder is a Manifest V3 extension holding every file its manifest names', () => {
  const named = [manifest.background.service_worker, ...manifest.content_scripts.flatMap((script) => script.js)];

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Notes Over Audio');
  assert.deepEqual(
    named.filter((file) => !existsSync(join(built, file))),
    [],
    'files the manifest names but the folder lacks'
  );
});

test("the script that reads YouTube's player runs in the page's own world, and the one that talks to the extension does not", () => {
  // The player's token is only on the page's own objects, and Chrome keeps
  // those from an extension's scripts unless a script asks for the page's world.
  const worldOf = (file) => manifest.content_scripts.find((script) => script.js.includes(file))?.world ?? 'ISOLATED';

  assert.equal(worldOf('extension/youtube-player.js'), 'MAIN');
  assert.equal(worldOf('extension/youtube-page.js'), 'ISOLATED');
});

test('the extension has the same id wherever its folder sits', () => {
  // With a key in the manifest Chrome takes the id from the key, not from the
  // folder's path: the first 32 hex digits of the key's SHA-256, written a to p.
  const digest = createHash('sha256').update(Buffer.from(manifest.key ?? '', 'base64')).digest('hex');
  const id = [...digest.slice(0, 32)].map((digit) => 'abcdefghijklmnop'[parseInt(digit, 16)]).join('');

  assert.equal(id, 'nekpkadhomgkgmkcnkljoejocdcjdmac');
});

test('the extension asks for nothing beyond the side panel, local storage and www.youtube.com pages', () => {
  // This set is what gives the one install warning, "Read and change your
  // data on www.youtube.com". Anything added here adds a warning or changes it.
  assert.deepEqual([...manifest.permissions].sort(), ['sidePanel', 'storage']);
  for (const script of manifest.content_scripts) assert.deepEqual(script.matches, ['https://www.youtube.com/*']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.optional_permissions, undefined);
  assert.equal(manifest.optional_host_permissions, undefined);
});

test('the page script passes on exactly the keys the panel takes', () => {
  // The page script cannot import the core, so it lists the keys again. This holds the two lists together.
  const pageScript = readFileSync(join(built, 'extension/youtube-page.js'), 'utf8');
  const listed = pageScript.match(/const KEYS = (\[[^\]]*\]);/)?.[1];
  const panel = createPanel({ player: standInPlayer(), fetchTranscript: async () => null, store: standInStore(), show: () => {} });

  assert.ok(listed, 'the page script lists the keys it passes on, as `const KEYS = [...]`');
  assert.deepEqual(JSON.parse(listed.replaceAll("'", '"')).sort(), [...panel.keys].sort());
  assert.deepEqual([...panel.keys].sort(), ['h', 'n', 'u']);
  // That it keeps none of them from YouTube, and what it does keep while a Note is being written,
  // is in youtube-page.test.js, which runs the script.
});

test('for typing a Note, the page script and the panel go by the same connection, and the page script hands over the keys the core types', async () => {
  // Written twice for the same reason: once in the page script, and once where the panel's side can import it.
  const pageScript = readFileSync(join(built, 'extension/youtube-page.js'), 'utf8');
  const { WRITING } = await import('../src/extension/panel-typing.js');
  const { TYPING_KEYS } = await import('../src/core/typing.js');
  const named = pageScript.match(/const WRITING = '([^']*)';/)?.[1];
  const listed = pageScript.match(/const TYPING_KEYS = (\[[^\]]*\]);/)?.[1];

  assert.equal(named, WRITING, 'the name of the connection, as `const WRITING = \'...\'`');
  assert.ok(listed, 'the page script lists the keys with a name that it hands over, as `const TYPING_KEYS = [...]`');
  assert.deepEqual(JSON.parse(listed.replaceAll("'", '"')).sort(), [...TYPING_KEYS].sort());
});

test("the two page scripts write alike what they share: the events they talk by, how each reads the watched video's id, and how a video's id starts", async () => {
  // Neither can import, the other or anything else, so each of these is written once in each. A change
  // to one copy alone would leave the two talking past each other, or naming a video two ways.
  const scripts = { 'youtube-page.js': readFileSync(join(built, 'extension/youtube-page.js'), 'utf8'), 'youtube-player.js': readFileSync(join(built, 'extension/youtube-player.js'), 'utf8') };
  const { YOUTUBE } = await import('../src/extension/youtube-links.js');
  /** What a script gives a name, as `const NAME = ...;` on a line of its own. */
  const given = (file, name) => scripts[file].match(new RegExp(`^ *const ${name} = (.*);$`, 'm'))?.[1];
  const timesWritten = (file, text) => scripts[file].split(text).length - 1;

  // One asks with an event on the document and the other answers with another.
  for (const name of ['ASKED', 'ANSWERED']) {
    assert.match(given('youtube-page.js', name) ?? '', /^'notes-over-audio:\w+'$/, `the page script names the event, as \`const ${name} = '...'\``);
    assert.equal(given('youtube-player.js', name), given('youtube-page.js', name), `${name}, in the two scripts`);
  }
  assert.notEqual(given('youtube-page.js', 'ASKED'), given('youtube-page.js', 'ANSWERED'));
  // Both read which video the page is on off its address, and must agree on it.
  assert.ok(given('youtube-page.js', 'watchedId'), 'the page script reads the watched id, as `const watchedId = ...`');
  assert.equal(given('youtube-player.js', 'watchedId'), given('youtube-page.js', 'watchedId'), 'how the watched id is read, in the two scripts');
  // A video's id starts the same way where the page names the video, where the player's captions are
  // asked for by it, and where a link is made from it (youtube-links.js, which can be imported).
  assert.equal(YOUTUBE, 'youtube:');
  for (const file of Object.keys(scripts)) {
    assert.equal(given(file, 'YOUTUBE'), `'${YOUTUBE}'`, `${file} names the start of a video's id, as \`const YOUTUBE = '...'\``);
    // And each writes none of them out a second time, where the copy that is held would not be the one used.
    assert.equal(timesWritten(file, YOUTUBE), 1, `${file} writes "${YOUTUBE}" once`);
    assert.equal(timesWritten(file, 'notes-over-audio:'), 2, `${file} writes each event's name once`);
  }
});

test("the panel's page offers each colour a Highlight can be, and has a look for each one that is not the default", async () => {
  // The names are the core's and the looks are the page's, so neither side can tell alone that the other has changed.
  const { COLOURS } = await import('../src/core/highlights.js');
  const page = readFileSync(join(built, 'extension/side-panel.html'), 'utf8');
  const offered = [...page.matchAll(/<button\b[^>]*\bdata-colour="([^"]*)"/g)].map((match) => match[1]);
  const styled = COLOURS.filter((colour) => page.includes(`mark[data-colour="${colour}"] {`));

  assert.deepEqual(offered, [...COLOURS]);
  // The default is the look of a mark that names no colour.
  assert.deepEqual(styled, COLOURS.slice(1));
});

test("the panel's page has every element its scripts look up by id", () => {
  // The scripts that put what the core shows on the page ask the page for its elements by id. One that
  // is missing is only found out in a browser, where the script stops at it and the panel stays empty.
  const page = readFileSync(join(built, 'extension/side-panel.html'), 'utf8');
  const inPage = new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const lookedUp = ['side-panel.js', 'panel-highlights.js', 'panel-notes.js', 'panel-saved.js'].flatMap((file) =>
    [...readFileSync(join(built, 'extension', file), 'utf8').matchAll(/(?:\belement\('|querySelector(?:All)?\('#)([\w-]+)/g)].map((match) => match[1])
  );

  for (const id of ['transcript', 'highlight-words', 'note-box', 'note-text', 'highlight-note', 'pause-while-writing', 'saved']) assert.ok(lookedUp.includes(id), `the scripts look up #${id}`);
  assert.deepEqual([...new Set(lookedUp)].filter((id) => !inPage.has(id)), [], 'ids the scripts look up and the page lacks');
});

test('the page offers "Pause the video while I write a Note" as a checkbox, not ticked until the person ticks it', () => {
  const page = readFileSync(join(built, 'extension/side-panel.html'), 'utf8');
  const offered = page.match(/<label\b[^>]*>\s*<input\b([^>]*)>([^<]*)<\/label>/);

  assert.ok(offered, 'the page has a labelled field');
  assert.match(offered[1], /type="checkbox"/);
  assert.match(offered[1], /id="pause-while-writing"/);
  assert.doesNotMatch(offered[1], /\bchecked\b/);
  assert.equal(offered[2].trim(), 'Pause the video while I write a Note');
});

test('the page offers the export: a button that copies, and beside it "Include the full transcript" as a checkbox, not ticked until the person ticks it', () => {
  const page = readFileSync(join(built, 'extension/side-panel.html'), 'utf8');
  const inPage = new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const lookedUp = [...readFileSync(join(built, 'extension/panel-export.js'), 'utf8').matchAll(/querySelector\('#([\w-]+)'\)/g)].map((match) => match[1]);
  const button = page.match(/<button\b([^>]*\bid="copy-markdown"[^>]*)>([^<]*)<\/button>/);
  const option = page.match(/<input\b([^>]*\bid="include-transcript"[^>]*)>\s*<label\b[^>]*\bfor="include-transcript"[^>]*>([^<]*)<\/label>/);

  assert.deepEqual(lookedUp.sort(), ['copy-markdown', 'include-transcript'], 'what the export looks up in its strip of the page');
  assert.deepEqual(lookedUp.filter((id) => !inPage.has(id)), [], 'ids the export looks up and the page lacks');
  assert.ok(inPage.has('export'), 'the strip that holds them');
  assert.equal(button?.[2].trim(), 'Copy as Markdown');
  assert.ok(option, 'the page has the checkbox, with its words beside it');
  assert.match(option[1], /type="checkbox"/);
  assert.doesNotMatch(option[1], /\bchecked\b/);
  assert.equal(option[2].trim(), 'Include the full transcript');
});

test("the clipboard is written in one place, on the panel's page, and never read", () => {
  // Writing to the clipboard on a click needs no permission. Reading it would, and would add an install warning.
  const scripts = readdirSync(built, { recursive: true }).filter((file) => file.endsWith('.js'));
  const naming = (way) => scripts.filter((file) => way.test(readFileSync(join(built, file), 'utf8'))).sort();

  assert.deepEqual(naming(/\bclipboard\s*\.\s*write/), ['extension/panel-export.js']);
  assert.deepEqual(naming(/\bclipboard\s*\.\s*read|execCommand\(/), []);
  assert.doesNotMatch(JSON.stringify(manifest), /clipboard/i);
});

test("what the extension keeps stays on the machine: its storage is the local one, and its one request is the page's own for captions", () => {
  // Read off the built scripts, not seen on the wire: none of them may name a
  // way to send anything, or a storage that leaves the machine, but the one
  // that asks YouTube for captions from inside YouTube's page.
  const scripts = readdirSync(built, { recursive: true }).filter((file) => file.endsWith('.js'));
  const naming = (way) => scripts.filter((file) => way.test(readFileSync(join(built, file), 'utf8'))).sort();

  assert.ok(scripts.includes('extension/side-panel.js') && scripts.includes('core/highlights.js'), 'the scripts were found');
  assert.deepEqual(naming(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\.src\s*=|\bimport\(\s*['"`]https?:/), ['extension/youtube-player.js']);
  assert.deepEqual(naming(/chrome\s*\.\s*storage\s*\.\s*(?!local\b)\w+/), []);
  assert.deepEqual(naming(/chrome\s*\.\s*storage\s*\.\s*local\b/), ['extension/local-store.js']);
});
