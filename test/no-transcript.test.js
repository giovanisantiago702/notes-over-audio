// A video with no Transcript, through the panel: the video has no captions,
// the fetch failed, or the Transcript is still on its way. The panel says
// which in one line and lists what is saved for the video under it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dinner, listed, morning, panelOn, pressNAt, select, settled, talk, withNotes } from './open-panel.js';

/** Writes a Note at a Moment: N with the video there, then what is written, saved. More than 5 s after any Highlight. */
async function noteAtMoment(open, seconds, text) {
  open.clock.pass(60);
  await pressNAt(open, seconds);
  await open.panel.saveNote(text);
}
/** Makes a Highlight of `phrase` by selecting it, and writes a Note on it with N. */
async function noteOn(open, phrase, text) {
  open.clock.pass(60);
  await select(open, phrase);
  await open.panel.keyPressed('n');
  await open.panel.saveNote(text);
}

/**
 * The store of a panel that was open on the talk while it had a Transcript,
 * `morning()`, and in which two Highlights and two Notes at Moments were made:
 *   0:03  a Note, before anything is said
 *   0:12  "How are you?", with a Note on it
 *   0:16  a Note
 *   0:20  "I've been blown away.", in green, with no Note
 */
async function markedBefore() {
  const open = await panelOn(talk, morning());
  await noteAtMoment(open, 16.4, 'He means the audience.');
  await noteOn(open, 'How are you?', 'A real question.');
  await select(open, "I've been blown away.");
  await open.panel.colourHighlight(open.now().highlights[1].id, 'green');
  await noteAtMoment(open, 3, 'Before anything is said.');
  return open.store;
}
const SAVED = ['0:03 ↳ Before anything is said.', '0:12 «How are you?» ↳ A real question.', '0:16 ↳ He means the audience.', "0:20 «I've been blown away.» (green)"];

test('on a video with no captions the panel shows one line saying so, then everything saved for the video in time order', async () => {
  const open = await panelOn(talk, null, { store: await markedBefore() }); // this time the video has no captions

  assert.equal(open.now().transcript.line, 'This video has no transcript.');
  assert.deepEqual(listed(open.now()), SAVED);
});

test('when the fetch failed the panel shows the line that says that, and the same list under it', async () => {
  const failing = () => Promise.reject(new Error('YouTube answered with nothing (HTTP 200).'));
  const open = await panelOn(talk, failing, { store: await markedBefore() });

  assert.equal(open.now().transcript.line, 'The transcript could not be fetched.');
  assert.deepEqual(listed(open.now()), SAVED);
});

test('while the Transcript is still being fetched, what is saved is not hidden: it is listed under the waiting line', async () => {
  const neverArrives = () => new Promise(() => {});
  const open = await panelOn(talk, neverArrives, { store: await markedBefore() });

  assert.equal(open.now().transcript.line, 'Getting the transcript…');
  assert.deepEqual(listed(open.now()), SAVED);
});

test('with a Transcript on show there is no list, since each mark shows at its place in it; nor is there one on a tab with no video', async () => {
  const store = await markedBefore();
  const withTranscript = await panelOn(talk, morning(), { store });
  const noVideo = await panelOn(null, null, { store });

  assert.equal(listed(withTranscript.now()), null);
  assert.equal(listed(noVideo.now()), null);
});

test('N writes a Note at the Moment with no Transcript, and it joins the list where it comes in the video', async () => {
  const open = await panelOn(talk, null, { store: await markedBefore() });

  await noteAtMoment(open, 14.2, 'No captions, but worth a Note.');

  assert.deepEqual(listed(open.now()), [SAVED[0], SAVED[1], '0:14 ↳ No captions, but worth a Note.', SAVED[2], SAVED[3]]);
});

test('a Highlight in the list can be opened there, given a Note, and removed, and U brings it back; the list shows each change', async () => {
  const open = await panelOn(talk, null, { store: await markedBefore() });
  const blownAway = open.now().highlights[1];

  open.panel.openHighlight(blownAway.id);
  assert.equal(open.now().open.words, "I've been blown away.");
  await open.panel.saveNote('So was I.');
  assert.deepEqual(listed(open.now()), [SAVED[0], SAVED[1], SAVED[2], "0:20 «I've been blown away.» (green) ↳ So was I."]);

  await open.panel.removeHighlight(blownAway.id);
  assert.deepEqual(listed(open.now()), [SAVED[0], SAVED[1], SAVED[2]]);

  await open.panel.keyPressed('u');
  assert.deepEqual(listed(open.now()), [SAVED[0], SAVED[1], SAVED[2], "0:20 «I've been blown away.» (green) ↳ So was I."]);
});

test('H and selecting make nothing while there is no Transcript, whichever of the three it is, and H takes up none of the saved Highlights', async () => {
  const noCaptions = null;
  const failing = () => Promise.reject(new Error('YouTube answered with nothing (HTTP 200).'));
  const neverArrives = () => new Promise(() => {});

  for (const transcript of [noCaptions, failing, neverArrives]) {
    // The video stands where "How are you?" was being said 1.2 s earlier, which is one of the saved Highlights.
    const open = await panelOn(talk, transcript, { store: await markedBefore(), at: 13.5 });
    const kept = open.store.everything();

    await open.panel.keyPressed('h');
    await open.panel.highlight(0, 1);

    assert.deepEqual(listed(open.now()), SAVED);
    assert.deepEqual(open.store.everything(), kept);
    // A Highlight taken up by H would be the one N writes on. N writes at the Moment instead.
    await open.panel.keyPressed('n');
    assert.deepEqual([open.now().open, open.now().writing], [null, { time: 13.5 }]);
  }
});

// ------------------------------------------- when the Transcript does arrive
// `morning()` with everything in SAVED at its place, and a Note written at 14.2 s while there was no Transcript.
const IN_THE_TRANSCRIPT = [
  '    ↳ 3 s: Before anything is said.',
  'Good morning.',
  '«How are you?»',
  '    ↳ 12 s: A real question.',
  "It's been great.",
  '    ↳ 14.2 s: Written with no Transcript.',
  '    ↳ 16.4 s: He means the audience.',
  "«I've been blown away.»",
];

test('when the Transcript arrives while the list is on show, the list gives way to it and the same marks show in it, one written meanwhile among them', async () => {
  let arrive;
  const open = await panelOn(talk, () => new Promise((resolve) => (arrive = resolve)), { store: await markedBefore() });
  await noteAtMoment(open, 14.2, 'Written with no Transcript.');
  assert.equal(open.now().transcript.status, 'getting');
  assert.equal(listed(open.now()).length, 5);

  arrive(morning());
  await settled();

  assert.equal(listed(open.now()), null);
  assert.deepEqual(withNotes(open.now()), IN_THE_TRANSCRIPT);
  assert.equal(open.now().marks.get(3)[0].colour, 'green', 'in the colour it was given');
});

test('a failed fetch is not tried again by itself; when the tab has been to another video and come back, the Transcript is asked for again and the same marks show in it', async () => {
  const asked = [];
  // The talk's fetch fails the first time it is asked for, and after that its Transcript arrives.
  const failsOnce = (video) => {
    asked.push(video.id);
    if (video.id !== talk.id) return Promise.resolve(null);
    return asked.filter((id) => id === talk.id).length === 1 ? Promise.reject(new Error('YouTube answered with nothing (HTTP 200).')) : Promise.resolve(morning());
  };
  const open = await panelOn(talk, failsOnce, { store: await markedBefore() });
  await noteAtMoment(open, 14.2, 'Written with no Transcript.');
  // The page names the video again, as it does when its title arrives.
  await open.panel.refresh();
  await settled();
  assert.equal(open.now().transcript.status, 'failed');
  assert.deepEqual(asked, [talk.id]);

  open.player.goTo(dinner);
  await open.panel.refresh();
  await settled();
  assert.deepEqual(listed(open.now()), [], 'the other video has nothing saved, and no captions');
  open.player.goTo(talk);
  await open.panel.refresh();
  await settled();

  assert.deepEqual(asked, [talk.id, dinner.id, talk.id]);
  assert.equal(listed(open.now()), null);
  assert.deepEqual(withNotes(open.now()), IN_THE_TRANSCRIPT);
});

test('when the page is reloaded after a failed fetch, what is saved stays listed through the new try, under the waiting line, and shows in the Transcript when it arrives', async () => {
  const tries = [];
  const open = await panelOn(talk, () => new Promise((arrive, fail) => tries.push({ arrive, fail })), { store: await markedBefore() });
  tries[0].fail(new Error('YouTube answered with nothing (HTTP 200).'));
  await settled();
  await noteAtMoment(open, 14.2, 'Written with no Transcript.');
  const WITH_THAT_NOTE = [SAVED[0], SAVED[1], '0:14 ↳ Written with no Transcript.', SAVED[2], SAVED[3]];
  assert.deepEqual(listed(open.now()), WITH_THAT_NOTE);
  const shownBefore = open.shown.length;

  await open.panel.pageLoaded();
  await settled();

  assert.equal(open.now().transcript.line, 'Getting the transcript…');
  // Everything shown since the reload lists the same five, so the list was never off the panel.
  assert.ok(open.shown.length > shownBefore);
  for (const state of open.shown.slice(shownBefore)) assert.deepEqual(listed(state), WITH_THAT_NOTE);

  tries[1].arrive(morning());
  await settled();

  assert.equal(listed(open.now()), null);
  assert.deepEqual(withNotes(open.now()), IN_THE_TRANSCRIPT);
  assert.equal(open.now().marks.get(3)[0].colour, 'green', 'in the colour it was given');
});

test('and so it is when the panel is opened again on the video and its Transcript arrives this time', async () => {
  const withNone = await panelOn(talk, null, { store: await markedBefore() });
  await noteAtMoment(withNone, 14.2, 'Written with no Transcript.');

  const again = await panelOn(talk, morning(), { store: withNone.store });

  assert.equal(listed(again.now()), null);
  assert.deepEqual(withNotes(again.now()), IN_THE_TRANSCRIPT);
});

test('the list is the same object from one showing to the next, until something saved changes', async () => {
  const open = await panelOn(talk, null, { store: await markedBefore() });
  const { entries } = open.now();

  // The page says the video's title again; a Highlight is opened and closed; a Note is begun and dropped.
  await open.panel.refresh();
  open.panel.openHighlight(open.now().highlights[0].id);
  open.panel.closeHighlight();
  await pressNAt(open, 14.2);
  await open.panel.cancelNote();
  assert.equal(open.now().entries, entries, 'so the page can leave its list alone');

  await noteAtMoment(open, 14.2, 'No captions, but worth a Note.');
  assert.notEqual(open.now().entries, entries);
});
