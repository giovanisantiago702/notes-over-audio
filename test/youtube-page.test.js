// The page script (src/extension/youtube-page.js), run as Chrome runs it, in
// a stand-in for YouTube's page: what it says to the extension, and when.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { standInPage, watchPage } from './stand-in-page.js';

const TALK = 'iG9CE55wbtY';
const DINNER = 'rddfPNBNAJs';
const untitled = (id) => ({ id: `youtube:${id}`, title: '', channel: '' });

test('a page loaded afresh says so with its first word, and with no other: not when the title arrives late, nor when it moves to another video', () => {
  const page = standInPage();

  page.load(watchPage(TALK));
  assert.deepEqual(page.said, [{ type: 'video-changed', video: untitled(TALK), loaded: true }]);

  // The title arrives, about two seconds after the load.
  page.later();
  page.describe({ id: TALK, title: 'Do schools kill creativity?', channel: 'TED' });
  page.later();
  page.later();
  // Then the tab moves to another video with no page load. For a moment the page still describes the one before.
  page.moveTo(watchPage(DINNER));
  page.later();
  page.describe({ id: DINNER, title: 'Remarks after dinner', channel: 'The Dinner' });
  page.later();
  assert.deepEqual(page.said.slice(1), [
    { type: 'video-changed', video: { id: `youtube:${TALK}`, title: 'Do schools kill creativity?', channel: 'TED' } },
    { type: 'video-changed', video: untitled(DINNER) },
    { type: 'video-changed', video: { id: `youtube:${DINNER}`, title: 'Remarks after dinner', channel: 'The Dinner' } },
  ]);

  // A reload is a load: the same video is named again, and this time the page says it was loaded.
  page.load();
  page.later();
  assert.deepEqual(page.said.slice(4), [{ type: 'video-changed', video: untitled(DINNER), loaded: true }]);
});

// ------------------------------------------------------------------- keys
// The connection the panel holds open to the page for as long as a Note is being written.
const WRITING = 'writing-a-note';
/** A watch page, loaded, with keyboard focus on YouTube's player. */
function watching() {
  const page = standInPage();
  page.load(watchPage(TALK));
  return page;
}
/** The keys the page script has said to the extension, as H, N and U are said. */
const keysSaid = (page) => page.said.filter((message) => message.type === 'key-pressed').map((message) => message.key);

test('while the panel holds a connection open for a Note being written, a key typed in the page is handed to the panel and kept from YouTube, on its way down and on its way up', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  page.type('k m');
  page.type('F', { shift: true });

  assert.deepEqual(panel.heard, [{ key: 'k', shift: false }, { key: ' ', shift: false }, { key: 'm', shift: false }, { key: 'F', shift: true }]);
  assert.deepEqual(page.youTubeHeard, []);
  // Nor does a key kept do what it does by itself in the page: the space bar would scroll it, or press the button that has focus.
  assert.deepEqual(page.tookEffect, []);
});

test('the moment that connection closes, the page keeps no key: when the Note is saved or cancelled, and when the panel closes or dies in the middle of a Note', () => {
  const page = watching();
  const panel = page.connect(WRITING);
  page.type('k');
  assert.deepEqual(page.youTubeHeard, []);

  // The panel closes the connection when the Note's box shuts. When the panel itself goes, however
  // it goes, Chrome closes it. The page script is told the same thing either way, and nothing else.
  panel.disconnect();
  page.type('k m');
  page.press('Enter');
  page.release('Enter');

  assert.deepEqual(panel.heard, [{ key: 'k', shift: false }], 'nothing more was handed over');
  assert.equal(panel.refused, 0, 'nor did the page try to: it knew, from the moment it was told');
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up', '  down', '  up', 'm down', 'm up', 'Enter down', 'Enter up'], "YouTube's own keys are YouTube's again, and none is cancelled");
});

test('a key is kept from YouTube only when the panel has it: one that finds the connection gone, before the page was told, is the page\'s own, and so is every key after it', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  panel.goUntold();
  page.type('km');

  assert.deepEqual(panel.heard, []);
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up', 'm down', 'm up']);
  assert.equal(panel.refused, 1, 'the first key found it gone, and the second did not try');
});

test('the key that ends a Note is kept from YouTube on its way up too, though the connection has closed by then', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  // Enter goes down and is handed over; the panel saves the Note and closes the connection; then the finger comes up.
  page.press('Enter');
  panel.disconnect();
  page.release('Enter');

  assert.deepEqual(panel.heard, [{ key: 'Enter', shift: false }]);
  assert.deepEqual(page.youTubeHeard, [], 'YouTube acts on a key coming up as well as on one going down');

  // That is the one key it applies to. The next is YouTube's, down and up.
  page.type('k');
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up']);
});

test('the N that opens the Note is YouTube\'s as before, on its way down and on its way up, and is not typed into the Note', () => {
  const page = watching();

  // N goes down with no Note being written: it is said to the extension as a key, and left alone.
  page.press('n');
  assert.deepEqual(keysSaid(page), ['n']);
  // The panel opens the box and its connection while the finger is still on the key.
  const panel = page.connect(WRITING);
  // Held long enough, the key repeats; then the finger comes up.
  page.press('n', { repeat: true });
  page.release('n');

  assert.deepEqual(panel.heard, [], 'not a letter of the Note');
  assert.deepEqual(page.youTubeHeard, ['n down', 'n down', 'n up'], 'nothing of that key was kept');
  assert.deepEqual(keysSaid(page), ['n'], 'and a key held down counts once');

  // A key pressed afresh from then on is typing, an N among them.
  page.type('n');
  assert.deepEqual(panel.heard, [{ key: 'n', shift: false }]);
  assert.deepEqual(keysSaid(page), ['n']);
});

test('while a Note is being written, a key pressed with Ctrl, Alt or Command is left alone', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  page.type('k', { ctrl: true });
  page.type('k', { alt: true });
  page.type('k', { meta: true });
  page.press('Enter', { meta: true });

  assert.deepEqual(panel.heard, []);
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up', 'k down', 'k up', 'k down', 'k up', 'Enter down']);
});

test("while a Note is being written, typing in a text field of the page is never taken: YouTube's search box, or a field edited in place as a comment is", () => {
  const page = watching();
  const panel = page.connect(WRITING);

  page.type('uk', { on: page.searchBox });
  page.type('n', { on: page.comment });
  page.press('Enter', { on: page.searchBox });

  assert.deepEqual(panel.heard, []);
  assert.deepEqual(page.youTubeHeard, ['u down', 'u up', 'k down', 'k up', 'n down', 'n up', 'Enter down']);
  assert.deepEqual(keysSaid(page), [], 'nor are the u and the n taken as U and N');
});

test('while a Note is being written, only a key that does something to it is taken: a character, Backspace, Enter and Escape. Every other key is left alone', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  // An arrow would move the caret, Tab the focus; "Dead" only starts an accent; a key that only picks a character is the keyboard's own.
  for (const key of ['ArrowLeft', 'ArrowUp', 'Tab', 'Delete', 'Shift', 'Dead', 'F5', 'MediaPlayPause']) page.strike(key);
  page.strike('e', { composing: true });
  assert.deepEqual(panel.heard, []);
  assert.equal(page.youTubeHeard.length, 18, 'each went to YouTube, down and up');

  page.strike('é');
  for (const key of ['Backspace', 'Escape']) page.strike(key);
  page.strike('Enter', { shift: true });
  assert.deepEqual(panel.heard, [{ key: 'é', shift: false }, { key: 'Backspace', shift: false }, { key: 'Escape', shift: false }, { key: 'Enter', shift: true }]);
  assert.equal(page.youTubeHeard.length, 18, 'and none of these did');
});

test('a connection opened for anything else than a Note being written makes the page keep no key', () => {
  const page = watching();
  const other = page.connect('something-else');

  page.type('k');

  assert.deepEqual(other.heard, []);
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up']);
});

test('with no Note being written, H, N and U are said to the extension and none is kept from YouTube or cancelled; no other key is said or kept', () => {
  const page = watching();

  page.type('hnuk');
  page.strike('H', { shift: true });
  page.strike('Enter');

  assert.deepEqual(keysSaid(page), ['h', 'n', 'u', 'h']);
  assert.deepEqual(page.youTubeHeard, ['h down', 'h up', 'n down', 'n up', 'u down', 'u up', 'k down', 'k up', 'H down', 'H up', 'Enter down', 'Enter up']);
  assert.deepEqual(page.tookEffect, page.youTubeHeard, 'and each did in the page what it does by itself there');
});

test('while a Note is being written, h, n and u are letters of it: they are handed over as typing, and not said as H, N and U', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  page.type('Huh, nun.');

  assert.deepEqual(panel.heard.map((each) => each.key).join(''), 'Huh, nun.');
  assert.deepEqual(keysSaid(page), []);
  assert.deepEqual(page.youTubeHeard, []);
});

test('a key handed over and held down types again for as long as it is held, and YouTube gets none of it', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  page.press('Backspace');
  page.press('Backspace', { repeat: true });
  page.press('Backspace', { repeat: true });
  page.release('Backspace');

  assert.equal(panel.heard.length, 3);
  assert.deepEqual(page.youTubeHeard, []);
});

test('a key handed over that comes up somewhere else, the keyboard having left the page meanwhile, does not cost YouTube that key the next time', () => {
  const page = watching();
  const panel = page.connect(WRITING);

  // Space goes down and is handed over. Before it comes up the person clicks in the Note's box:
  // the keyboard is the panel's from then on, and the page never sees the key come up.
  page.press(' ');
  page.loseKeyboard();
  panel.disconnect();

  // Later, with no Note being written, the same key is YouTube's on its way down and on its way up.
  page.strike(' ');
  assert.deepEqual(page.youTubeHeard, ['  down', '  up']);
});

test('on a page that is not a video\'s, H, N and U are not said', () => {
  const page = standInPage();
  page.load('https://www.youtube.com/results?search_query=hnu');

  page.type('hnu');

  assert.deepEqual(keysSaid(page), []);
  assert.deepEqual(page.youTubeHeard, ['h down', 'h up', 'n down', 'n up', 'u down', 'u up']);
});
