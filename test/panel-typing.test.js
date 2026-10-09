// Typing a Note with the keyboard in the video's page, both halves joined: the
// panel's half (src/extension/panel-typing.js), which holds a connection open
// to the page for as long as a Note is being written, and the page script
// itself (src/extension/youtube-page.js), run in a stand-in for YouTube's
// page. The connection between them is the stand-in's, in place of Chrome's.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WRITING, typingFromPage } from '../src/extension/panel-typing.js';
import { standInPage, watchPage } from './stand-in-page.js';

/** A watch page with the panel's typing joined to it. `typed` is every key the panel was given to type, as one text. */
function pageAndPanel() {
  const page = standInPage();
  page.load(watchPage('iG9CE55wbtY'));
  const keys = [];
  let connected = 0;
  const typing = typingFromPage({
    connect: () => ((connected += 1), page.connect(WRITING)),
    typed: (key) => keys.push(key),
  });
  return { page, typing, typed: () => keys.map((each) => each.key).join(''), connected: () => connected };
}
// What the panel shows of Notes being written (see createPanel in src/core/panel.js).
const NO_NOTE = { writing: null, open: null };
const AT_A_MOMENT = { writing: { time: 88.5 }, open: null };
const ON_A_HIGHLIGHT = { writing: null, open: { id: 'a-highlight', words: 'How are you?' } };

test('for as long as the panel shows a Note at a Moment being written, what is typed in the page goes to the panel and not to YouTube; before and after, it is YouTube\'s', () => {
  const { page, typing, typed } = pageAndPanel();

  typing.show(NO_NOTE);
  page.type('k');
  typing.show(AT_A_MOMENT);
  page.type('m f');
  typing.show(NO_NOTE);
  page.type('k');

  assert.equal(typed(), 'm f');
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up', 'k down', 'k up']);
});

test('and so it is for the Note on a Highlight, which is written in the box that opens for that Highlight', () => {
  const { page, typing, typed } = pageAndPanel();

  typing.show(ON_A_HIGHLIGHT);
  page.type('A real question.');
  typing.show(NO_NOTE);
  page.type('f');

  assert.equal(typed(), 'A real question.');
  assert.deepEqual(page.youTubeHeard, ['f down', 'f up']);
});

test('when the page is loaded again in the middle of a Note, the panel connects to the new page the next time it shows, and typing there reaches the Note again', async () => {
  const { page, typing, typed, connected } = pageAndPanel();
  typing.show(AT_A_MOMENT);
  page.type('ab');

  // The page that held the connection is gone. The one loaded in its place knows of no Note.
  page.load();
  page.type('k');
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up']);

  // The new page names its video, and the panel shows again, the Note still being written.
  typing.show(AT_A_MOMENT);
  page.type('cd');

  assert.equal(typed(), 'abcd');
  assert.deepEqual(page.youTubeHeard, ['k down', 'k up']);
  assert.equal(connected(), 2);
});

test('one connection lasts from the box opening to the box shutting, however often the panel shows meanwhile, and whichever box it is', () => {
  const { page, typing, typed, connected } = pageAndPanel();

  // N at a Moment, and the panel shows again as the video plays on. Then a click on a Highlight,
  // which drops that Note and opens the Highlight's box: a Note is being written all the while.
  typing.show(AT_A_MOMENT);
  typing.show(AT_A_MOMENT);
  page.type('a');
  typing.show(ON_A_HIGHLIGHT);
  typing.show(ON_A_HIGHLIGHT);
  page.type('b');

  assert.equal(connected(), 1);
  assert.equal(typed(), 'ab');
  assert.deepEqual(page.youTubeHeard, []);

  // Shut, shown twice, and opened again: a second connection, and no third.
  typing.show(NO_NOTE);
  typing.show(NO_NOTE);
  typing.show(AT_A_MOMENT);
  assert.equal(connected(), 2);
});

test('in a tab with no page script to connect to, nothing is typed and nothing is thrown, and the panel tries again the next time it shows', async () => {
  const page = standInPage(); // never loaded: no page script has run in it
  let connected = 0;
  const typing = typingFromPage({ connect: () => ((connected += 1), page.connect(WRITING)), typed: () => assert.fail('nothing can be typed') });

  typing.show(AT_A_MOMENT);
  await new Promise((resolve) => setImmediate(resolve)); // Chrome closes such a connection at once
  typing.show(AT_A_MOMENT);
  await new Promise((resolve) => setImmediate(resolve));
  typing.show(NO_NOTE);

  assert.equal(connected, 2);
});
