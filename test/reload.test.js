// A reload of the video's page, through the panel. When the fetch of a video's
// Transcript has failed, a load of the page is the one thing that tries it
// again while the panel stays open on that video.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dinner, morning, panelOn, settled, talk } from './open-panel.js';

/**
 * Where the panel's Transcripts come from in these tests. Each one asked for
 * waits in `asked` until the test lets it arrive, come back as none (null), or fail.
 */
function transcriptsToSettle() {
  const asked = [];
  return { asked, fetch: (video) => new Promise((arrive, fail) => asked.push({ video, arrive, fail })) };
}
const refused = () => new Error('YouTube answered with nothing (HTTP 200).');
const WAITING = { status: 'getting', line: 'Getting the transcript…' };
const text = (state) => state.transcript.sentences.map((sentence) => sentence.text);

test('after a failed fetch, a reload of the page fetches the Transcript again: the panel shows the waiting line, then the Transcript', async () => {
  const transcripts = transcriptsToSettle();
  const open = await panelOn(talk, transcripts.fetch);
  transcripts.asked[0].fail(refused());
  await settled();
  assert.equal(open.now().transcript.line, 'The transcript could not be fetched.');

  await open.panel.pageLoaded();

  assert.equal(transcripts.asked.length, 2);
  assert.deepEqual(open.now().transcript, WAITING);

  transcripts.asked[1].arrive(morning());
  await settled();

  assert.deepEqual(text(open.now()), ['Good morning.', 'How are you?', "It's been great.", "I've been blown away."]);
});

test('a reload with the Transcript already on show keeps it, and nothing is fetched again', async () => {
  const transcripts = transcriptsToSettle();
  const open = await panelOn(talk, transcripts.fetch);
  transcripts.asked[0].arrive(morning());
  await settled();
  const onShow = open.now().transcript;
  const shownBefore = open.shown.length;

  await open.panel.pageLoaded();
  await settled();

  assert.equal(transcripts.asked.length, 1);
  // The same object every time, so the page leaves its lines alone: the waiting line never came back.
  assert.ok(open.shown.slice(shownBefore).every((state) => state.transcript === onShow));
  assert.equal(open.now().transcript.status, 'ready');
});

test('a reload while a fetch is under way does not start a second one beside it', async () => {
  const transcripts = transcriptsToSettle();
  const open = await panelOn(talk, transcripts.fetch);

  // The first fetch has not settled: the page is loaded again while the panel still waits for it.
  await open.panel.pageLoaded();
  await settled();
  assert.equal(transcripts.asked.length, 1);
  assert.deepEqual(open.now().transcript, WAITING);

  // And so it is for the try a reload started: a second reload during it starts no other.
  transcripts.asked[0].fail(refused());
  await settled();
  await open.panel.pageLoaded();
  await open.panel.pageLoaded();
  await settled();
  assert.equal(transcripts.asked.length, 2);

  // The one under way is the one that brings the Transcript.
  transcripts.asked[1].arrive(morning());
  await settled();
  assert.equal(open.now().transcript.status, 'ready');
});

test('a video with no captions is not asked about again on a reload, and a page with no video is asked about nothing', async () => {
  const transcripts = transcriptsToSettle();
  const open = await panelOn(talk, transcripts.fetch);
  transcripts.asked[0].arrive(null);
  await settled();

  await open.panel.pageLoaded();
  await settled();
  assert.equal(transcripts.asked.length, 1);
  assert.equal(open.now().transcript.line, 'This video has no transcript.');

  open.player.goTo(null);
  await open.panel.pageLoaded();
  await settled();
  assert.equal(transcripts.asked.length, 1);
  assert.equal(open.now().transcript, null);
});

test('only a reload tries again, and one reload is one try: the page naming the same video for any other reason starts no fetch', async () => {
  const transcripts = transcriptsToSettle();
  // The page names a video before it knows the title, on a load as on a move to another video.
  const untitled = { id: talk.id, title: '', channel: '' };
  const open = await panelOn(untitled, transcripts.fetch);
  transcripts.asked[0].fail(refused());
  await settled();

  // The title arrives late, and the page names the video again, more than once.
  open.player.goTo(talk);
  await open.panel.refresh();
  await open.panel.refresh();
  await settled();
  assert.equal(transcripts.asked.length, 1);
  assert.equal(open.now().transcript.status, 'failed');

  // The page is loaded again: it names the video with no title, and says it was loaded.
  open.player.goTo(untitled);
  await open.panel.pageLoaded();
  assert.equal(transcripts.asked.length, 2);
  transcripts.asked[1].fail(refused());
  await settled();
  assert.equal(open.now().transcript.line, 'The transcript could not be fetched.');

  // The second try failed as the first did. The title arriving after this load starts no third.
  open.player.goTo(talk);
  await open.panel.refresh();
  await settled();
  assert.equal(transcripts.asked.length, 2);
  assert.equal(open.now().transcript.status, 'failed');

  // Another reload is another try, and no more than one.
  await open.panel.pageLoaded();
  await open.panel.refresh();
  await settled();
  assert.equal(transcripts.asked.length, 3);
});

test('a load of the page that puts the tab on another video fetches that video\'s Transcript once', async () => {
  const transcripts = transcriptsToSettle();
  const open = await panelOn(talk, transcripts.fetch);
  transcripts.asked[0].fail(refused());
  await settled();

  open.player.goTo(dinner);
  await open.panel.pageLoaded();
  await settled();

  assert.deepEqual(transcripts.asked.map((each) => each.video.id), [talk.id, dinner.id]);
  assert.deepEqual(open.now().transcript, WAITING);
});
