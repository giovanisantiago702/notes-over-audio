// U undoes: the last Highlight made, grown or removed, and again for the
// change before that. What can be undone is kept by the panel in memory, for
// the video it is on.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { saveHighlight } from '../src/core/highlights.js';
import { dinner, lines, morning, panelOn, pressHAt, saying, select, settled, talk, wordsOf } from './open-panel.js';
import { standInStore } from './stand-in-store.js';

const KEPT_TALK = 'video:youtube:iG9CE55wbtY';
const pressU = ({ panel }) => panel.keyPressed('u');

// `morning()` says "Good morning." from 10 s, "How are you?" from 12 s, "It's been great." from 14 s
// and "I've been blown away." from 20 s.
test('U undoes the Highlight that H just made: it is off the panel and out of the store', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  assert.deepEqual(wordsOf(open.now()), ["It's been great."]);

  await pressU(open);

  assert.deepEqual(open.now().highlights, []);
  assert.deepEqual(lines(open.now()), ['Good morning.', 'How are you?', "It's been great.", "I've been blown away."]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, []);
});

test('U after H again takes back the sentence that was added, and leaves the Highlight as it was first made', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  const made = open.now().highlights;
  await pressHAt(open, 16);
  assert.deepEqual(wordsOf(open.now()), ["How are you? It's been great."]);

  await pressU(open);

  assert.deepEqual(open.now().highlights, made);
  assert.deepEqual(lines(open.now()), ['Good morning.', 'How are you?', "«It's been great.»", "I've been blown away."]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, made);
});

test('U undoes the removal of a Highlight: it is back as it was, with the id and the time it was made', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'blown away.');
  const made = open.now().highlights;
  open.clock.pass(60);
  await open.panel.removeHighlight(made[0].id);
  assert.deepEqual(open.now().highlights, []);

  await pressU(open);

  assert.deepEqual(open.now().highlights, made);
  assert.deepEqual(lines(open.now()), ['Good morning.', 'How are you?', "It's been great.", "I've been «blown away.»"]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, made);
});

// ------------------------------------ exactly the record that was there
test('U puts back exactly the record that was there, its colour included: after H again, and after a removal', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  await open.panel.colourHighlight(open.now().highlights[0].id, 'green');
  const green = structuredClone(open.now().highlights);
  assert.equal(green[0].colour, 'green');

  // Grown, and taken back.
  await open.panel.keyPressed('h');
  assert.deepEqual(wordsOf(open.now()), ["How are you? It's been great."]);
  await pressU(open);
  assert.deepEqual(open.now().highlights, green);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, green);

  // Removed, and taken back.
  await open.panel.removeHighlight(green[0].id);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, []);
  await pressU(open);
  assert.deepEqual(open.now().highlights, green);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, green);
  assert.equal(open.now().marks.get(2)[0].colour, 'green');
});

test('and which of them it was, where its time range holds its words twice', async () => {
  // One cue says "Good." twice, as two sentences. H takes the second, and says so in what it saves.
  const twice = { language: 'en', source: 'uploader', timing: 'cue', pieces: [{ start: 10, end: 12, text: 'Good. Good.' }, { start: 12, end: 14, text: 'Fine.' }] };
  const open = await panelOn(talk, twice);
  await pressHAt(open, 12.5);
  const made = structuredClone(open.now().highlights);
  assert.equal(made[0].occurrence, 1);
  await open.panel.keyPressed('h');
  assert.deepEqual(lines(open.now()), ['«Good.»', '«Good.»', 'Fine.']);

  await pressU(open);

  assert.deepEqual(open.now().highlights, made);
  assert.deepEqual(lines(open.now()), ['Good.', '«Good.»', 'Fine.']);
});

test('and it says nothing of which again, where H again made it say so', async () => {
  // "No." is in the second cue once. With the sentence before it, it is "Yes. No.", which the two cues hold twice.
  const twice = { language: 'en', source: 'uploader', timing: 'cue', pieces: [{ start: 10, end: 12, text: 'Yes. No. Yes.' }, { start: 12, end: 14, text: 'No.' }] };
  const open = await panelOn(talk, twice);
  await pressHAt(open, 13.5);
  const made = structuredClone(open.now().highlights);
  assert.deepEqual([made[0].words, 'occurrence' in made[0]], ['No.', false]);
  await open.panel.keyPressed('h');
  assert.deepEqual(lines(open.now()), ['Yes.', 'No.', '«Yes.»', '«No.»']);
  assert.equal(open.now().highlights[0].occurrence, 1);

  await pressU(open);

  assert.deepEqual(open.now().highlights, made);
  assert.deepEqual(lines(open.now()), ['Yes.', 'No.', 'Yes.', '«No.»']);
});

test('U after H again takes back what H again did and no more: a colour the Highlight was given since stays', async () => {
  // Giving a colour is not something U undoes, so the U after it undoes the change before it.
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  const [made] = open.now().highlights;
  await pressHAt(open, 16);
  await open.panel.colourHighlight(made.id, 'green');

  await pressU(open);

  assert.deepEqual(open.now().highlights, [{ ...made, colour: 'green' }]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, [{ ...made, colour: 'green' }]);
});

test('pressing U again goes further back, one change at a time, and with nothing left it does nothing', async () => {
  const open = await panelOn(talk, morning());
  const seen = () => lines(open.now()).join(' | ');
  // Four changes: one Highlight made by selecting, one made with H, that one grown, and the first removed.
  await select(open, 'blown away.');
  const selected = open.now().highlights[0].id;
  open.clock.pass(60);
  await pressHAt(open, 16);
  await pressHAt(open, 16);
  await open.panel.removeHighlight(selected);
  assert.equal(seen(), "Good morning. | «How are you?» | «It's been great.» | I've been blown away.");

  await pressU(open);
  assert.equal(seen(), "Good morning. | «How are you?» | «It's been great.» | I've been «blown away.»");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | «It's been great.» | I've been «blown away.»");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been «blown away.»");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been blown away.");
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, []);

  const shownBefore = open.shown.length;
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been blown away.");
  assert.equal(open.shown.length, shownBefore);
});

test('U undoes what H does just after a selection, one change at a time: the sentence H again added, the Highlight H made, then the selected one', async () => {
  const open = await panelOn(talk, morning());
  const seen = () => lines(open.now()).join(' | ');
  await select(open, 'blown away.');
  // H makes a Highlight of its own of the sentence just spoken, and H again grows that one.
  open.clock.pass(2);
  await pressHAt(open, 16);
  open.clock.pass(2);
  await open.panel.keyPressed('h');
  assert.equal(seen(), "Good morning. | «How are you?» | «It's been great.» | I've been «blown away.»");

  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | «It's been great.» | I've been «blown away.»");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been «blown away.»");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been blown away.");
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, []);
});

test('after U no Highlight is the one just made, so H takes a sentence afresh, as in the prototype', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  await pressHAt(open, 16);

  await pressU(open);
  assert.equal(open.panel.highlightJustMade(), null);
  open.clock.pass(1);
  await pressHAt(open, 22);

  assert.deepEqual(lines(open.now()), ['Good morning.', 'How are you?', "«It's been great.»", "«I've been blown away.»"]);
  assert.deepEqual(wordsOf(open.now()), ["It's been great.", "I've been blown away."]);
});

// ------------------------------------------------ how long it can be undone
test('what can be undone is the video on show: after the tab moves to another video, U changes neither', async () => {
  const open = await panelOn(talk, (video) => (video.id === talk.id ? morning() : saying([10, 'Thank you.'], [12, 'Please remain seated.'])));
  // On the talk: one Highlight made and left, and one made and removed.
  await pressHAt(open, 16);
  open.clock.pass(60);
  await select(open, 'blown away.');
  await open.panel.removeHighlight(open.now().highlights.find((highlight) => highlight.words === 'blown away.').id);
  const kept = open.store.everything();
  assert.deepEqual(kept[KEPT_TALK].highlights.map((highlight) => highlight.words), ["It's been great."]);

  open.player.goTo(dinner);
  await open.panel.refresh();
  await settled();
  await pressU(open);
  await pressU(open);
  assert.deepEqual(open.store.everything(), kept);
  assert.deepEqual(open.now().highlights, []);

  // Back on the talk, it is as it was left, and U does not change it any more.
  open.player.goTo(talk);
  await open.panel.refresh();
  await settled();
  await pressU(open);
  assert.deepEqual(wordsOf(open.now()), ["It's been great."]);
  assert.deepEqual(open.store.everything(), kept);
});

test('a change still being kept when the tab moves to another video cannot be undone into that video', async () => {
  // A store that is slow to write: each write waits in `writes` until the test lets it through.
  const inner = standInStore();
  const writes = [];
  const slow = { get: inner.get, set: (entries) => new Promise((written) => writes.push(() => inner.set(entries).then(written))) };
  const letThrough = async () => (writes.shift()(), settled());

  const open = await panelOn(talk, (video) => (video.id === talk.id ? morning() : saying([10, 'Thank you.'])), { store: slow });
  const selecting = select(open, 'blown away.');
  await settled();
  await letThrough();
  await selecting;
  const [made] = open.now().highlights;

  // The removal is on its way to the store when the tab moves on.
  const removing = open.panel.removeHighlight(made.id);
  await settled();
  open.player.goTo(dinner);
  await open.panel.refresh();
  await letThrough();
  await removing;
  await settled();

  const pressed = pressU(open);
  await settled();
  while (writes.length) await letThrough();
  await pressed;

  assert.deepEqual(inner.everything()['video:youtube:rddfPNBNAJs'], undefined);
  assert.deepEqual(inner.everything()[KEPT_TALK].highlights, []);
});

test('U needs no Transcript: a Highlight removed from a video with none on show comes back', async () => {
  const store = standInStore();
  const kept = { id: 'kept-before', start: 14, end: 16.5, words: "It's been great.", transcript: { language: 'en', source: 'auto-generated' }, made: '2026-10-01T09:00:00.000Z' };
  await saveHighlight(store, talk, kept);
  const open = await panelOn(talk, null, { store }); // this time the video has no Transcript
  await open.panel.removeHighlight('kept-before');
  assert.deepEqual(open.now().highlights, []);

  await pressU(open);

  assert.equal(open.now().transcript.status, 'none');
  assert.deepEqual(open.now().highlights, [kept]);
});

test('nor is it kept when the panel closes: in a panel opened again on the same video, U does nothing', async () => {
  const first = await panelOn(talk, morning());
  await pressHAt(first, 16);
  const kept = first.store.everything();

  const again = await panelOn(talk, morning(), { store: first.store });
  await pressU(again);

  assert.deepEqual(wordsOf(again.now()), ["It's been great."]);
  assert.deepEqual(again.store.everything(), kept);
});
