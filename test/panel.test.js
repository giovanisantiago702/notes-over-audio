import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPanel } from '../src/core/panel.js';
import { standInPlayer } from './stand-in-player.js';
import { standInStore } from './stand-in-store.js';

const talk = { id: 'youtube:iG9CE55wbtY', title: 'How to read a transcript', channel: 'Leo Reads' };
const lecture = { id: 'youtube:rddfPNBNAJs', title: 'A lecture with no punctuation', channel: 'Night School' };

/** A Transcript saying `text`, a word every 0.3 s. */
const saying = (text) => ({
  language: 'en',
  source: 'auto-generated',
  timing: 'word',
  pieces: text.split(' ').map((word, i) => ({ text: word, start: 1 + i * 0.3 })),
});

/**
 * Where the panel's Transcripts come from in these tests. Each one asked for
 * waits in `asked` until the test lets it arrive, come back as none (null), or fail.
 */
function standInTranscripts() {
  const asked = [];
  return {
    asked,
    fetch: (video) => new Promise((arrive, fail) => asked.push({ video, arrive, fail })),
  };
}

/** A panel on a stand-in player, with everything it has shown, latest last. */
function panelOn(video) {
  const shown = [];
  const player = standInPlayer({ video });
  const transcripts = standInTranscripts();
  const panel = createPanel({ player, fetchTranscript: transcripts.fetch, store: standInStore(), show: (state) => shown.push(state) });
  return { panel, player, transcripts, shown };
}
/** What the panel shows of Highlights and Notes on a video that has none. They have their own tests, in highlights.test.js and notes.test.js. */
const noHighlights = { highlights: [], marks: new Map(), open: null, notes: [], notesAfter: new Map(), writing: null, pauseWhileWriting: false };
const lines = (state) => state.transcript.sentences.map((sentence) => sentence.text);
/** Lets everything already under way finish. */
const settled = () => new Promise((resolve) => setImmediate(resolve));

test('the panel names the video its player is on', async () => {
  const { panel, shown } = panelOn(talk);

  await panel.refresh();

  assert.deepEqual(shown.at(-1).video, { id: 'youtube:iG9CE55wbtY', title: 'How to read a transcript', channel: 'Leo Reads' });
});

test('moving to another video shows that one on the next refresh', async () => {
  const { panel, player, shown } = panelOn(talk);
  await panel.refresh();

  player.goTo(lecture);
  await panel.refresh();

  assert.deepEqual(shown.at(-1).video, { id: 'youtube:rddfPNBNAJs', title: 'A lecture with no punctuation', channel: 'Night School' });
});

test('while the Transcript is on its way the panel shows a waiting line, then its sentences with nothing more asked of the panel', async () => {
  const { panel, transcripts, shown } = panelOn(talk);

  await panel.refresh();
  assert.deepEqual(shown.at(-1).transcript, { status: 'getting', line: 'Getting the transcript…' });

  transcripts.asked[0].arrive(saying('Good morning. How are you?'));
  await settled();

  assert.equal(shown.at(-1).transcript.status, 'ready');
  assert.deepEqual(lines(shown.at(-1)), ['Good morning.', 'How are you?']);
  assert.deepEqual(shown.at(-1).video, talk);
});

test('when the video has no captions, a line says it has no transcript', async () => {
  const { panel, transcripts, shown } = panelOn(talk);
  await panel.refresh();

  transcripts.asked[0].arrive(null);
  await settled();

  assert.deepEqual(shown.at(-1).transcript, { status: 'none', line: 'This video has no transcript.' });
});

test('when the fetch fails, a line says the transcript could not be fetched', async () => {
  const { panel, transcripts, shown } = panelOn(talk);
  await panel.refresh();

  transcripts.asked[0].fail(new Error('The player gave no token in 90 s.'));
  await settled();

  // The reason is kept for whoever looks into it; the line is what the panel says.
  assert.deepEqual(shown.at(-1).transcript, {
    status: 'failed',
    line: 'The transcript could not be fetched.',
    reason: 'The player gave no token in 90 s.',
  });
});

test('captions with no words in them count as no transcript', async () => {
  const { panel, transcripts, shown } = panelOn(talk);
  await panel.refresh();

  transcripts.asked[0].arrive({ language: 'en', source: 'auto-generated', timing: 'word', pieces: [] });
  await settled();

  assert.deepEqual(shown.at(-1).transcript, { status: 'none', line: 'This video has no transcript.' });
});

test('a Transcript the panel cannot cut into sentences shows as a failed fetch, not as a wait without end', async () => {
  const { panel, transcripts, shown } = panelOn(talk);
  await panel.refresh();

  transcripts.asked[0].arrive({ language: 'en', source: 'auto-generated', timing: 'word' });
  await settled();

  assert.equal(shown.at(-1).transcript.status, 'failed');
  assert.equal(shown.at(-1).transcript.line, 'The transcript could not be fetched.');
});

test("moving to another video replaces the Transcript with that video's", async () => {
  const { panel, player, transcripts, shown } = panelOn(talk);
  await panel.refresh();
  transcripts.asked[0].arrive(saying('This is the talk.'));
  await settled();

  player.goTo(lecture);
  await panel.refresh();

  // The talk's sentences are gone at once, before the lecture's have come.
  // While it waits the panel lists what is saved for the video (no-transcript.test.js), which here is nothing.
  assert.deepEqual(shown.at(-1), { video: lecture, transcript: { status: 'getting', line: 'Getting the transcript…' }, ...noHighlights, entries: [] });
  assert.deepEqual(transcripts.asked.map((each) => each.video.id), ['youtube:iG9CE55wbtY', 'youtube:rddfPNBNAJs']);

  transcripts.asked[1].arrive(saying('This is the lecture.'));
  await settled();

  assert.deepEqual(lines(shown.at(-1)), ['This is the lecture.']);
});

test('a Transcript that arrives after the tab has moved to another video is not shown', async () => {
  const { panel, player, transcripts, shown } = panelOn(talk);
  await panel.refresh();
  player.goTo(lecture);
  await panel.refresh();

  transcripts.asked[1].arrive(saying('This is the lecture.'));
  await settled();
  transcripts.asked[0].arrive(saying('This is the talk, late.'));
  await settled();

  assert.deepEqual(shown.at(-1).video, lecture);
  assert.deepEqual(lines(shown.at(-1)), ['This is the lecture.']);
});

test("a video's Transcript is fetched once, however often the panel is refreshed on that video", async () => {
  // The page names a video about a second before it knows the title, so the
  // panel is refreshed twice for every video.
  const { panel, player, transcripts, shown } = panelOn({ id: talk.id, title: '', channel: '' });
  await panel.refresh();
  player.goTo(talk);
  await panel.refresh();

  assert.equal(transcripts.asked.length, 1);
  assert.equal(shown.at(-1).transcript.status, 'getting');

  transcripts.asked[0].arrive(saying('Good morning.'));
  await settled();
  await panel.refresh();

  assert.equal(transcripts.asked.length, 1);
  assert.deepEqual(shown.at(-1).video, talk);
  assert.deepEqual(lines(shown.at(-1)), ['Good morning.']);
});

test('two refreshes at the same moment still fetch the Transcript once', async () => {
  const { panel, transcripts } = panelOn(talk);

  await Promise.all([panel.refresh(), panel.refresh()]);

  assert.equal(transcripts.asked.length, 1);
});

test('on a tab with no video the panel shows nothing of a Transcript and fetches none', async () => {
  const { panel, player, transcripts, shown } = panelOn(talk);
  await panel.refresh();

  player.goTo(null);
  await panel.refresh();
  transcripts.asked[0].arrive(saying('This is the talk, late.'));
  await settled();

  assert.deepEqual(shown.at(-1), { video: null, transcript: null, ...noHighlights, entries: null });
  assert.equal(transcripts.asked.length, 1);
});
