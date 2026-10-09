// Notes, through the panel: N writes one, on the Highlight just made or at
// the Moment it was pressed; the store keeps it; it shows at its place in the
// Transcript, and again when the video is reopened.

import assert from 'node:assert/strict';

import { saveHighlight } from '../src/core/highlights.js';
import { clockTime, entriesOf, shownNote } from '../src/core/notes.js';
import { dinner, marked, morning, panelOn, pressHAt, pressNAt, saying, select, settled, talk, withNotes, wordsOf } from './open-panel.js';
import { fromTheUploader, test } from './real-captions.js';
import { standInStore } from './stand-in-store.js';

const KEPT_TALK = 'video:youtube:iG9CE55wbtY';

// `morning()` says "Good morning." from 10 s, "How are you?" from 12 s, "It's been great." from 14 s
// and "I've been blown away." from 20 s.
test('N opens a Note at the Moment it was pressed, and nothing is kept until it is saved', async () => {
  const open = await panelOn(talk, morning());

  await pressNAt(open, 16.4);

  assert.deepEqual(open.now().writing, { time: 16.4 });
  assert.equal(open.now().open, null);
  assert.deepEqual(open.store.everything(), {});
});

test('saving it keeps the Note in the video\'s record: its time, its text, when it was made, and an id of its own', async () => {
  const open = await panelOn(talk, morning());
  await pressNAt(open, 16.4);

  await open.panel.saveNote('He means the audience.');

  const [note] = open.now().notes;
  assert.ok(typeof note.id === 'string' && note.id.length > 0, 'it has an id of its own');
  // The stand-in clock stands at noon on 2026-10-07 until a test lets time pass.
  assert.deepEqual(open.store.everything(), {
    formatVersion: 1,
    [KEPT_TALK]: {
      title: 'Do schools kill creativity?',
      channel: 'TED',
      highlights: [],
      notes: [{ id: note.id, time: 16.4, text: 'He means the audience.', made: '2026-10-07T12:00:00.000Z' }],
    },
  });
  assert.equal(open.now().writing, null);
});

test('cancelling it shuts the box and keeps nothing', async () => {
  const open = await panelOn(talk, morning());
  await pressNAt(open, 16.4);

  await open.panel.cancelNote();

  assert.equal(open.now().writing, null);
  assert.deepEqual(open.now().notes, []);
  assert.deepEqual(open.store.everything(), {});
});

test('a Note at a Moment saved with nothing written in it is not kept', async () => {
  const open = await panelOn(talk, morning());
  await pressNAt(open, 16.4);

  await open.panel.saveNote('  \n ');

  assert.equal(open.now().writing, null);
  assert.deepEqual(open.now().notes, []);
  assert.deepEqual(open.store.everything(), {});
});

test('what is written is kept without the space around it', async () => {
  const open = await panelOn(talk, morning());
  await pressNAt(open, 16.4);

  await open.panel.saveNote('  Ask Leo about this.\n');

  assert.deepEqual(open.now().notes.map((note) => note.text), ['Ask Leo about this.']);
});

// ------------------------------------------------- on the Highlight just made
test('for 5 s after a Highlight is made, N opens a Note on it: the Highlight is opened and no Moment is taken', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  open.clock.pass(4.999);

  await pressNAt(open, 23);

  assert.equal(open.now().open?.words, "It's been great.");
  assert.equal(open.now().writing, null);
});

test('once the 5 s are over, N opens a Note at the Moment it was pressed instead', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  open.clock.pass(5);

  await pressNAt(open, 23);

  assert.equal(open.now().open, null);
  assert.deepEqual(open.now().writing, { time: 23 });
});

test('a Highlight made by selecting words is the one just made as well', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'blown away.');
  open.clock.pass(3);

  await pressNAt(open, 23);

  assert.equal(open.now().open?.words, 'blown away.');
  assert.equal(open.now().writing, null);
});

test('N goes by the Highlight just made however it was made, though H grows only one of its own: after a selection and then H, N opens the one H made', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'blown away.');
  open.clock.pass(3);
  await pressHAt(open, 16); // H does not grow the selected one: it takes "It's been great."
  open.clock.pass(3);

  await pressNAt(open, 23);

  assert.equal(open.now().open?.words, "It's been great.");
  assert.equal(open.now().writing, null);
});

test('and N within 5 s of H on a sentence that is already a Highlight opens that Highlight, which H took up', async () => {
  const open = await panelOn(talk, morning());
  await select(open, "It's been great."); // the whole sentence, selected by hand
  open.clock.pass(60);
  await pressHAt(open, 16); // it is already a Highlight: no second one
  open.clock.pass(4.999);

  await pressNAt(open, 23);

  assert.equal(open.now().highlights.length, 1);
  assert.equal(open.now().open?.words, "It's been great.");
  assert.equal(open.now().writing, null);
});

test('saving a Note on a Highlight keeps it with that Highlight, as its text and when it was made, and shuts the box', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  const [made] = structuredClone(open.now().highlights);
  open.clock.pass(2);
  await pressNAt(open, 18);

  await open.panel.saveNote('The whole talk turns on this.');

  const noted = { ...made, note: { text: 'The whole talk turns on this.', made: '2026-10-07T12:00:02.000Z' } };
  assert.deepEqual(open.store.everything()[KEPT_TALK], { title: 'Do schools kill creativity?', channel: 'TED', highlights: [noted] });
  assert.deepEqual(open.now().highlights, [noted]);
  assert.equal(open.now().open, null);
  assert.deepEqual(open.now().notes, []);
});

// ------------------------------------------------------ clicking a Highlight
test('a Highlight carries at most one Note: opened again, what is saved changes the Note it has, which keeps when it was made', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  await pressNAt(open, 18);
  await open.panel.saveNote('The whole talk turns on this.');
  const [{ id }] = open.now().highlights;
  open.clock.pass(600);

  open.panel.openHighlight(id); // a click on it
  assert.equal(open.now().open.note.text, 'The whole talk turns on this.');
  await open.panel.saveNote('Most of the talk turns on this.');

  assert.deepEqual(open.now().highlights.map((highlight) => highlight.note), [{ text: 'Most of the talk turns on this.', made: '2026-10-07T12:00:00.000Z' }]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, open.now().highlights);
});

test('saving it empty removes the Note, and the Highlight is kept exactly as it was before it had one', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  const before = structuredClone(open.store.everything());
  await pressNAt(open, 18);
  await open.panel.saveNote('The whole talk turns on this.');
  const [{ id }] = open.now().highlights;

  open.panel.openHighlight(id);
  await open.panel.saveNote('   ');

  assert.deepEqual(open.store.everything(), before);
  assert.equal('note' in open.now().highlights[0], false);
  assert.equal(open.now().open, null);
});

// ------------------------------------------------ at its place in the Transcript
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

test('a saved Note shows at its place in the Transcript, with its time: after its Highlight, or between the sentences around its Moment', async () => {
  const open = await panelOn(talk, morning());

  await noteAtMoment(open, 16.4, 'He means the audience.'); // while "It's been great." is being said
  await noteOn(open, 'How are you?', 'A real question.'); // the line from 12 s
  await noteAtMoment(open, 3, 'Before anything is said.');

  assert.deepEqual(withNotes(open.now()), [
    '    ↳ 3 s: Before anything is said.',
    'Good morning.',
    '«How are you?»',
    '    ↳ 12 s: A real question.',
    "It's been great.",
    '    ↳ 16.4 s: He means the audience.',
    "I've been blown away.",
  ]);
});

test('the Note on a Highlight that runs over several lines shows after the last of them, with the time the Highlight starts', async () => {
  const open = await panelOn(talk, morning());

  await noteOn(open, 'morning. How are you?', 'The greeting.'); // from "morning." at 10.5 s into the line after
  await noteAtMoment(open, 11, 'Still the first sentence.');

  assert.deepEqual(withNotes(open.now()), [
    'Good «morning.»',
    '    ↳ 11 s: Still the first sentence.',
    '«How are you?»',
    '    ↳ 10.5 s: The greeting.',
    "It's been great.",
    "I've been blown away.",
  ]);
});

test('on the real captions, timed per cue: a Note on a Highlight shows its cue\'s start, and a Note at a Moment falls between two sentences', async () => {
  const open = await panelOn(talk, fromTheUploader());

  await noteOn(open, 'blown away by the whole thing.', 'So was I.'); // one cue, from 33.408 s
  await noteAtMoment(open, 30, 'The audience answers.'); // "(Audience)" starts at 29.702 s and "Good." at 30.667 s

  assert.deepEqual(withNotes(open.now()).slice(0, 8), [
    'Good morning.',
    'How are you?',
    '(Audience)',
    '    ↳ 30 s: The audience answers.',
    'Good.',
    "It's been great, hasn't it?",
    "I've been «blown away by the whole thing.»",
    '    ↳ 33.408 s: So was I.',
  ]);
});

test('the Note on a Highlight that marks nothing on the Transcript on show is still drawn, by the time its Highlight starts', async () => {
  // Kept from another Transcript of the video. Here "great." is said at 15 s and "I've" at 20 s, and nothing from 16.5 s to 18 s.
  const store = standInStore();
  const elsewhere = { id: 'elsewhere', start: 16.5, end: 18, words: 'a pause', transcript: { language: 'en', source: 'uploader' }, made: '2026-10-01T09:00:00.000Z' };
  await saveHighlight(store, talk, { ...elsewhere, note: { text: 'Said in the other captions.', made: '2026-10-01T09:01:00.000Z' } });

  const open = await panelOn(talk, morning(), { store });

  assert.deepEqual(marked(open.now()), []);
  assert.deepEqual(withNotes(open.now()), ['Good morning.', 'How are you?', "It's been great.", '    ↳ 16.5 s: Said in the other captions.', "I've been blown away."]);
});

test('with no Transcript on show the Notes are still the video\'s, and none has a line to show after', async () => {
  const first = await panelOn(talk, morning());
  await noteAtMoment(first, 16.4, 'He means the audience.');
  await noteOn(first, 'How are you?', 'A real question.');

  const again = await panelOn(talk, null, { store: first.store }); // this time the video has no Transcript

  assert.equal(again.now().transcript.status, 'none');
  assert.deepEqual(again.now().notes.map((note) => [note.time, note.text]), [[16.4, 'He means the audience.']]);
  assert.deepEqual(again.now().highlights.map((highlight) => [highlight.words, highlight.note.text]), [['How are you?', 'A real question.']]);
  assert.equal(again.now().notesAfter.size, 0);
});

// ------------------------------------------------------------------ deleting
test('a Note at a Moment can be deleted: it is off the Transcript and out of the store, which keeps what it kept before the Note', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'How are you?');
  const before = structuredClone(open.store.everything());
  await noteAtMoment(open, 16.4, 'He means the audience.');
  await noteAtMoment(open, 21, 'And this one stays.');
  const [first, second] = open.now().notes;

  await open.panel.removeNote(first.id);

  assert.deepEqual(open.now().notes, [second]);
  assert.deepEqual(withNotes(open.now()), ['Good morning.', '«How are you?»', "It's been great.", "I've been blown away.", '    ↳ 21 s: And this one stays.']);
  assert.deepEqual(open.store.everything()[KEPT_TALK].notes, [second]);

  // With the last one deleted too, the video's record is exactly what it was before it had a Note.
  await open.panel.removeNote(second.id);

  assert.deepEqual(open.now().notes, []);
  assert.deepEqual(open.store.everything(), before);
});

test('the Note on a Highlight can be deleted, and its Highlight stays as it was before it had one', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'How are you?');
  const before = structuredClone(open.store.everything());
  await open.panel.keyPressed('n');
  await open.panel.saveNote('A real question.');
  const [{ id }] = open.now().highlights;

  await open.panel.removeNoteOn(id);

  assert.deepEqual(withNotes(open.now()), ['Good morning.', '«How are you?»', "It's been great.", "I've been blown away."]);
  assert.deepEqual(open.store.everything(), before);
});

test('removing a Highlight removes its Note: nothing of it is left on the Transcript or in the store', async () => {
  const open = await panelOn(talk, morning());
  await noteOn(open, 'How are you?', 'A real question.');
  await noteAtMoment(open, 16.4, 'He means the audience.');
  const [{ id }] = open.now().highlights;

  await open.panel.removeHighlight(id);

  assert.deepEqual(withNotes(open.now()), ['Good morning.', 'How are you?', "It's been great.", '    ↳ 16.4 s: He means the audience.', "I've been blown away."]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, []);
  assert.equal(JSON.stringify(open.store.everything()).includes('A real question.'), false);
});

// ------------------------------------------------------------------ reopening
test('Notes are there when the video is opened again, each at its place', async () => {
  const first = await panelOn(talk, morning());
  await noteAtMoment(first, 16.4, 'He means the audience.');
  await noteOn(first, 'How are you?', 'A real question.');
  const seen = withNotes(first.now());

  const again = await panelOn(talk, morning(), { store: first.store });

  assert.deepEqual(withNotes(again.now()), ['Good morning.', '«How are you?»', '    ↳ 12 s: A real question.', "It's been great.", '    ↳ 16.4 s: He means the audience.', "I've been blown away."]);
  assert.deepEqual(withNotes(again.now()), seen);
  assert.equal(again.now().writing, null);
  assert.equal(again.now().open, null);
});

test('they are that video\'s: another video in the same tab shows none of them, and going back shows them again', async () => {
  const open = await panelOn(talk, (video) => (video.id === talk.id ? morning() : saying([10, 'Thank you.'], [12, 'Please remain seated.'])));
  await noteAtMoment(open, 16.4, 'He means the audience.');

  open.player.goTo(dinner);
  await open.panel.refresh();
  await settled();
  assert.deepEqual([open.now().notes, withNotes(open.now())], [[], ['Thank you.', 'Please remain seated.']]);

  open.player.goTo(talk);
  await open.panel.refresh();
  await settled();
  assert.deepEqual(withNotes(open.now()), ['Good morning.', 'How are you?', "It's been great.", '    ↳ 16.4 s: He means the audience.', "I've been blown away."]);
});

test('a Note still being written when the tab moves to another video is dropped, and is not written on that one', async () => {
  const open = await panelOn(talk, (video) => (video.id === talk.id ? morning() : saying([10, 'Thank you.'])));
  await pressNAt(open, 16.4);

  open.player.goTo(dinner);
  await open.panel.refresh();
  await settled();

  assert.equal(open.now().writing, null);
  await open.panel.saveNote('Written for the talk.');
  assert.deepEqual(open.store.everything(), {});
});

// --------------------------------------- what was kept before there were Notes
test('a video marked before there were Notes reads as it did: its Highlights show, it has no Notes, and showing it changes nothing kept', async () => {
  // As the extension's storage held it after ticket 13: no `notes` in the record and no `note` on the Highlight.
  const store = standInStore();
  const kept = {
    formatVersion: 1,
    [KEPT_TALK]: {
      title: 'Do schools kill creativity?',
      channel: 'TED',
      highlights: [{ id: 'f83567bf-1cb6-4584-97c9-9b19c9cbfd86', start: 33.408, end: 35.729, words: 'blown away by the whole thing.', transcript: { language: 'en', source: 'uploader' }, made: '2026-10-07T21:19:09.117Z' }],
    },
  };
  await store.set(structuredClone(kept));

  const open = await panelOn(talk, fromTheUploader(), { store });

  assert.deepEqual(marked(open.now()), ["I've been «blown away by the whole thing.»"]);
  assert.deepEqual([open.now().notes, open.now().notesAfter.size], [[], 0]);
  assert.deepEqual(store.everything(), kept);

  // And with a Note of each kind written on it, the format is still number 1 and that Highlight has only gained its Note.
  await noteAtMoment(open, 30, 'The audience answers.');
  open.panel.openHighlight('f83567bf-1cb6-4584-97c9-9b19c9cbfd86');
  await open.panel.saveNote('So was I.');

  const [moment] = open.now().notes;
  assert.deepEqual(store.everything(), {
    formatVersion: 1,
    [KEPT_TALK]: {
      ...kept[KEPT_TALK],
      highlights: [{ ...kept[KEPT_TALK].highlights[0], note: { text: 'So was I.', made: '2026-10-07T12:01:00.000Z' } }],
      notes: [{ id: moment.id, time: 30, text: 'The audience answers.', made: '2026-10-07T12:01:00.000Z' }],
    },
  });
});

test('what a Highlight or a record holds that Notes know nothing of stays through every change a Note makes', async () => {
  // A colour, which of two it is, and two things no code here has heard of: one on the Highlight and one in the video's record.
  const store = standInStore();
  const highlight = { id: 'kept-before', start: 12, end: 13.5, words: 'How are you?', transcript: { language: 'en', source: 'auto-generated' }, made: '2026-10-01T09:00:00.000Z', occurrence: 1, colour: 'purple', starred: true };
  await store.set({ formatVersion: 1, [KEPT_TALK]: { title: 'Do schools kill creativity?', channel: 'TED', highlights: [highlight], tags: ['education'] } });
  const open = await panelOn(talk, morning(), { store });
  const keptNow = () => store.everything()[KEPT_TALK];

  open.panel.openHighlight('kept-before');
  await open.panel.saveNote('A real question.');
  assert.deepEqual(keptNow(), { title: 'Do schools kill creativity?', channel: 'TED', highlights: [{ ...highlight, note: { text: 'A real question.', made: '2026-10-07T12:00:00.000Z' } }], tags: ['education'] });

  open.panel.openHighlight('kept-before');
  await open.panel.saveNote('Was it?');
  assert.deepEqual(keptNow().highlights, [{ ...highlight, note: { text: 'Was it?', made: '2026-10-07T12:00:00.000Z' } }]);

  await noteAtMoment(open, 16.4, 'He means the audience.');
  assert.deepEqual([keptNow().tags, keptNow().highlights], [['education'], [{ ...highlight, note: { text: 'Was it?', made: '2026-10-07T12:00:00.000Z' } }]]);

  await open.panel.removeNote(open.now().notes[0].id);
  await open.panel.removeNoteOn('kept-before');
  assert.deepEqual(keptNow(), { title: 'Do schools kill creativity?', channel: 'TED', highlights: [highlight], tags: ['education'] });
});

// ------------------------------------- "Pause the video while I write a Note"
test('the option to pause is off until it is ticked: N leaves the video playing, and the Moment is where it was pressed', async () => {
  const open = await panelOn(talk, morning());
  assert.equal(open.now().pauseWhileWriting, false);

  await pressNAt(open, 16.4);

  assert.equal(await open.player.playing(), true);
  assert.deepEqual(open.now().writing, { time: 16.4 });
  await open.panel.saveNote('He means the audience.');
  assert.equal(await open.player.playing(), true);
});

test('with it on, N pauses the video, and saving the Note plays it again', async () => {
  const open = await panelOn(talk, morning());
  await open.panel.setPauseWhileWriting(true);
  assert.equal(open.now().pauseWhileWriting, true);

  await pressNAt(open, 16.4);
  assert.equal(await open.player.playing(), false);
  assert.deepEqual(open.now().writing, { time: 16.4 });

  await open.panel.saveNote('He means the audience.');
  assert.equal(await open.player.playing(), true);
  assert.deepEqual(open.now().notes.map((note) => [note.time, note.text]), [[16.4, 'He means the audience.']]);
});

test('and cancelling plays it again as well', async () => {
  const open = await panelOn(talk, morning());
  await open.panel.setPauseWhileWriting(true);
  await pressNAt(open, 16.4);
  assert.equal(await open.player.playing(), false);

  await open.panel.cancelNote();

  assert.equal(await open.player.playing(), true);
});

test('with it on, a Note at a Moment takes the time where the video stopped, not where it was when N was pressed', async () => {
  const open = await panelOn(talk, morning());
  await open.panel.setPauseWhileWriting(true);
  // A player that takes a moment to stop: the video runs on 0.3 s after it is told to pause.
  const stop = open.player.pause;
  open.player.pause = async () => {
    open.player.playTo(16.7);
    await stop();
  };

  await pressNAt(open, 16.4);

  assert.deepEqual(open.now().writing, { time: 16.7 });
});

test('with it on, a video that was not playing when N was pressed is not started when the Note is saved', async () => {
  const open = await panelOn(talk, morning());
  await open.panel.setPauseWhileWriting(true);
  await open.player.pause(); // paused in the player itself

  await pressNAt(open, 16.4);
  await open.panel.saveNote('He means the audience.');

  assert.equal(await open.player.playing(), false);
});

test('with it on, a Note on a Highlight pauses the video too, opened with N or with a click, and it plays again however the box shuts', async () => {
  const open = await panelOn(talk, morning());
  await open.panel.setPauseWhileWriting(true);
  await pressHAt(open, 16);
  const [{ id }] = open.now().highlights;
  const paused = async () => !(await open.player.playing());

  // N on the Highlight just made, and the Note saved.
  await open.panel.keyPressed('n');
  assert.equal(await paused(), true);
  await open.panel.saveNote('The whole talk turns on this.');
  assert.equal(await paused(), false);

  // A click on the Highlight, and "Close".
  open.panel.openHighlight(id);
  await settled();
  assert.equal(await paused(), true);
  open.panel.closeHighlight();
  await settled();
  assert.equal(await paused(), false);

  // A click on it, and the Highlight removed.
  open.panel.openHighlight(id);
  await settled();
  assert.equal(await paused(), true);
  await open.panel.removeHighlight(id);
  assert.equal(await paused(), false);
});

test('the option is remembered: it is kept as a setting, with no video\'s record, and a panel opened later has it on', async () => {
  const first = await panelOn(talk, morning());

  await first.panel.setPauseWhileWriting(true);

  assert.deepEqual(first.store.everything(), { formatVersion: 1, settings: { pauseWhileWriting: true } });

  const later = await panelOn(dinner, saying([10, 'Thank you.']), { store: first.store });
  assert.equal(later.now().pauseWhileWriting, true);
  await pressNAt(later, 11);
  assert.equal(await later.player.playing(), false);
  await later.panel.cancelNote();

  // Unticked again, it is kept as off, and the next panel leaves the video playing.
  await later.panel.setPauseWhileWriting(false);
  assert.deepEqual(first.store.everything(), { formatVersion: 1, settings: { pauseWhileWriting: false } });
  const last = await panelOn(talk, morning(), { store: first.store });
  assert.equal(last.now().pauseWhileWriting, false);
  await pressNAt(last, 16.4);
  assert.equal(await last.player.playing(), true);
});

// ------------------------------------------------------------------------ U
const pressU = ({ panel }) => panel.keyPressed('u');

test('U undoes a Note written at a Moment: it is off the Transcript and out of the store', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'How are you?');
  const before = structuredClone(open.store.everything());
  await noteAtMoment(open, 16.4, 'He means the audience.');

  await pressU(open);

  assert.deepEqual(open.now().notes, []);
  assert.deepEqual(withNotes(open.now()), ['Good morning.', '«How are you?»', "It's been great.", "I've been blown away."]);
  assert.deepEqual(open.store.everything(), before);
});

test('U undoes the deleting of a Note at a Moment: it is back as it was, with its id and when it was made', async () => {
  const open = await panelOn(talk, morning());
  await noteAtMoment(open, 16.4, 'He means the audience.');
  const kept = structuredClone(open.store.everything());
  const [note] = open.now().notes;
  open.clock.pass(600);
  await open.panel.removeNote(note.id);

  await pressU(open);

  assert.deepEqual(open.now().notes, [note]);
  assert.deepEqual(open.store.everything(), kept);
});

test('U undoes a Note written on a Highlight: the Note goes and the Highlight stays, kept as it was before', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  const before = structuredClone(open.store.everything());
  await open.panel.keyPressed('n');
  await open.panel.saveNote('The whole talk turns on this.');

  await pressU(open);

  assert.deepEqual(withNotes(open.now()), ['Good morning.', 'How are you?', "«It's been great.»", "I've been blown away."]);
  assert.deepEqual(open.store.everything(), before);
});

test('U undoes a change to the Note on a Highlight, and U after it was deleted brings it back, each time as it was', async () => {
  const open = await panelOn(talk, morning());
  await noteOn(open, "It's been great.", 'The whole talk turns on this.');
  const first = structuredClone(open.store.everything());
  const [{ id }] = open.now().highlights;
  open.clock.pass(600);

  // Changed, and taken back.
  open.panel.openHighlight(id);
  await open.panel.saveNote('Most of the talk turns on this.');
  assert.equal(open.now().highlights[0].note.text, 'Most of the talk turns on this.');
  await pressU(open);
  assert.deepEqual(open.store.everything(), first);
  assert.deepEqual(withNotes(open.now())[3], '    ↳ 14 s: The whole talk turns on this.');

  // Deleted with its ×, and taken back.
  await open.panel.removeNoteOn(id);
  assert.equal('note' in open.now().highlights[0], false);
  await pressU(open);
  assert.deepEqual(open.store.everything(), first);

  // Saved empty, which removes it, and taken back.
  open.panel.openHighlight(id);
  await open.panel.saveNote('');
  assert.equal('note' in open.now().highlights[0], false);
  await pressU(open);
  assert.deepEqual(open.store.everything(), first);
  assert.deepEqual(open.now().highlights, first[KEPT_TALK].highlights);
});

test('pressing U again goes further back through Notes and Highlights alike, one change at a time', async () => {
  const open = await panelOn(talk, morning());
  const seen = () => withNotes(open.now()).join(' | ');
  // Five changes: a Highlight made with H, a Note on it, a Note at a Moment, that Note deleted, and the Highlight removed with its Note.
  await pressHAt(open, 16);
  await open.panel.keyPressed('n');
  await open.panel.saveNote('On the Highlight.');
  await noteAtMoment(open, 21, 'At a Moment.');
  await open.panel.removeNote(open.now().notes[0].id);
  await open.panel.removeHighlight(open.now().highlights[0].id);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been blown away.");

  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | «It's been great.» |     ↳ 14 s: On the Highlight. | I've been blown away.");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | «It's been great.» |     ↳ 14 s: On the Highlight. | I've been blown away. |     ↳ 21 s: At a Moment.");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | «It's been great.» |     ↳ 14 s: On the Highlight. | I've been blown away.");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | «It's been great.» | I've been blown away.");
  await pressU(open);
  assert.equal(seen(), "Good morning. | How are you? | It's been great. | I've been blown away.");
  assert.deepEqual(open.store.everything()[KEPT_TALK], { title: 'Do schools kill creativity?', channel: 'TED', highlights: [] });

  const shownBefore = open.shown.length;
  await pressU(open);
  assert.equal(open.shown.length, shownBefore, 'with nothing left to undo, U does nothing');
});

test('a Note saved as it already was is no change: U after it undoes the change before', async () => {
  const open = await panelOn(talk, morning());
  await noteOn(open, "It's been great.", 'The whole talk turns on this.');
  const [{ id }] = open.now().highlights;
  const kept = structuredClone(open.store.everything());

  open.panel.openHighlight(id);
  await open.panel.saveNote('The whole talk turns on this.  ');
  assert.deepEqual(open.store.everything(), kept);

  await pressU(open); // takes back the Note itself, not a change that changed nothing
  assert.equal('note' in open.now().highlights[0], false);
});

test('what was done to a Note on one video cannot be undone from another video', async () => {
  const open = await panelOn(talk, (video) => (video.id === talk.id ? morning() : saying([10, 'Thank you.'])));
  await noteAtMoment(open, 16.4, 'He means the audience.');
  await noteOn(open, 'How are you?', 'A real question.');
  const kept = structuredClone(open.store.everything());

  open.player.goTo(dinner);
  await open.panel.refresh();
  await settled();
  await pressU(open);
  await pressU(open);
  await pressU(open);

  assert.deepEqual(open.store.everything(), kept);
});

// ---------------------------------------------------------------- H again
test('a Highlight grown with H keeps its Note, and U then takes back the sentence and leaves the Note', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  await open.panel.keyPressed('n');
  await open.panel.saveNote('The whole talk turns on this.');
  const noted = structuredClone(open.now().highlights);
  // H took the sentence 2 s ago by the clock: H again is still inside its 3 s.
  open.clock.pass(2);

  await open.panel.keyPressed('h');

  assert.deepEqual(wordsOf(open.now()), ["How are you? It's been great."]);
  assert.deepEqual(open.now().highlights[0].note, { text: 'The whole talk turns on this.', made: '2026-10-07T12:00:00.000Z' });
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights[0].note, { text: 'The whole talk turns on this.', made: '2026-10-07T12:00:00.000Z' });
  assert.deepEqual(withNotes(open.now()), ['Good morning.', '«How are you?»', "«It's been great.»", '    ↳ 12 s: The whole talk turns on this.', "I've been blown away."]);

  await pressU(open);

  assert.deepEqual(open.now().highlights, noted);
  assert.deepEqual(open.store.everything()[KEPT_TALK].highlights, noted);
});

test('U after a Note was written on a grown Highlight takes back the Note, and U again the sentence H again added', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  await pressHAt(open, 16);
  await open.panel.keyPressed('n');
  await open.panel.saveNote('The whole talk turns on this.');
  assert.deepEqual(withNotes(open.now()), ['Good morning.', '«How are you?»', "«It's been great.»", '    ↳ 12 s: The whole talk turns on this.', "I've been blown away."]);

  await pressU(open);
  assert.deepEqual(withNotes(open.now()), ['Good morning.', '«How are you?»', "«It's been great.»", "I've been blown away."]);

  await pressU(open);
  assert.deepEqual(withNotes(open.now()), ['Good morning.', 'How are you?', "«It's been great.»", "I've been blown away."]);
  assert.equal('note' in open.now().highlights[0], false);
});

// ---------------------------------------------- when there is no Moment to take
test('during an advert N at a Moment does nothing: the player cannot say the time, so there is no Moment to take', async () => {
  const open = await panelOn(talk, morning());
  await open.panel.setPauseWhileWriting(true);
  const shownBefore = open.shown.length;
  open.player.advert(true);

  await pressNAt(open, 16.4);

  assert.equal(open.now().writing, null);
  assert.equal(open.shown.length, shownBefore);
  open.player.advert(false);
  assert.equal(await open.player.playing(), true, 'and nothing was paused');
});

test('but N on the Highlight just made still opens its Note, which needs no time', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  open.player.advert(true);

  await open.panel.keyPressed('n');
  await open.panel.saveNote('Written while an advert played.');

  assert.equal(open.now().highlights[0].note.text, 'Written while an advert played.');
});

test('on a tab with no video N does nothing', async () => {
  const open = await panelOn(null, null);

  await open.panel.keyPressed('n');

  assert.equal(open.now().writing, null);
  assert.deepEqual(open.store.everything(), {});
});

test('N needs no Transcript: on a video with none, a Note at a Moment is written and kept all the same', async () => {
  const open = await panelOn(talk, null);
  assert.equal(open.now().transcript.status, 'none');

  await pressNAt(open, 16.4);
  await open.panel.saveNote('No captions, but worth a Note.');

  assert.deepEqual(open.now().notes.map((note) => [note.time, note.text]), [[16.4, 'No captions, but worth a Note.']]);
  assert.deepEqual(open.store.everything()[KEPT_TALK].notes, open.now().notes);
});

test('nor does the rest: with no Transcript, the option pauses for a Note, a Note of either kind is deleted, U brings it back, and all of it comes in time order', async () => {
  const store = standInStore();
  const before = { id: 'kept-before', start: 14, end: 16.5, words: "It's been great.", transcript: { language: 'en', source: 'auto-generated' }, made: '2026-10-01T09:00:00.000Z' };
  await saveHighlight(store, talk, { ...before, note: { text: 'From before.', made: '2026-10-01T09:01:00.000Z' } });
  const open = await panelOn(talk, null, { store });
  assert.equal(open.now().transcript.status, 'none');

  await open.panel.setPauseWhileWriting(true);
  await pressNAt(open, 30);
  assert.equal(await open.player.playing(), false);
  await open.panel.saveNote('With no captions.');
  assert.equal(await open.player.playing(), true);
  const said = () => entriesOf(open.now().highlights, open.now().notes).map((entry) => [entry.time, shownNote(entry)?.text ?? null]);
  assert.deepEqual(said(), [[14, 'From before.'], [30, 'With no captions.']]);

  await open.panel.removeNote(open.now().notes[0].id);
  await open.panel.removeNoteOn('kept-before');
  assert.deepEqual(said(), [[14, null]]);

  await open.panel.keyPressed('u');
  await open.panel.keyPressed('u');
  assert.deepEqual(said(), [[14, 'From before.'], [30, 'With no captions.']]);
});

// ------------------------------------------------------- one Note at a time
test('one Note is written at a time: N while one is being written starts afresh, at the Moment it is pressed now', async () => {
  const open = await panelOn(talk, morning());
  await pressNAt(open, 16.4);

  await pressNAt(open, 21);

  assert.deepEqual(open.now().writing, { time: 21 });
  await open.panel.saveNote('Only this one.');
  assert.deepEqual(open.now().notes.map((note) => [note.time, note.text]), [[21, 'Only this one.']]);
});

test('N while a Highlight is open, with none just made, shuts it and opens a Note at the Moment; a click on a Highlight shuts that', async () => {
  const open = await panelOn(talk, morning());
  await pressHAt(open, 16);
  const [{ id }] = open.now().highlights;
  open.clock.pass(60);
  open.panel.openHighlight(id);

  await pressNAt(open, 21);
  assert.deepEqual([open.now().open, open.now().writing], [null, { time: 21 }]);

  open.panel.openHighlight(id);
  assert.deepEqual([open.now().open?.id, open.now().writing], [id, null]);
  await open.panel.saveNote('On the Highlight, not at 21 s.');
  assert.deepEqual([open.now().notes, open.now().highlights[0].note.text], [[], 'On the Highlight, not at 21 s.']);
});

test('a Moment is kept to the millisecond', async () => {
  const open = await panelOn(talk, morning());

  await pressNAt(open, 16.412345);
  await open.panel.saveNote('He means the audience.');

  assert.equal(open.now().notes[0].time, 16.412);
});

// ----------------------------------------------- everything saved, in time order
test("a video's Notes and Highlights come as one list in the order they come in the video, a Highlight before a Note at the same time", () => {
  const highlight = (start, words, more) => ({ id: `h${start}`, start, end: start + 2, words, transcript: { language: 'en', source: 'uploader' }, made: '2026-10-07T12:00:00.000Z', ...more });
  const note = (time, text) => ({ id: `n${time}`, time, text, made: '2026-10-07T12:00:00.000Z' });
  const [early, noted, late] = [highlight(12, 'How are you?'), highlight(33.408, 'blown away', { note: { text: 'So was I.', made: '2026-10-07T12:05:00.000Z' } }), highlight(90, 'not asked')];
  const [before, between, same] = [note(3, 'Before anything is said.'), note(30, 'The audience answers.'), note(90, 'At the same time as a Highlight.')];

  const entries = entriesOf([early, noted, late], [before, between, same]);

  assert.deepEqual(entries, [
    { time: 3, note: before },
    { time: 12, highlight: early },
    { time: 30, note: between },
    { time: 33.408, highlight: noted },
    { time: 90, highlight: late },
    { time: 90, note: same },
  ]);
  // The Note each entry shows: its own when it is at a Moment, its Highlight's when that has one.
  assert.deepEqual(entries.map(shownNote), [
    { time: 3, text: 'Before anything is said.', note: 'n3' },
    null,
    { time: 30, text: 'The audience answers.', note: 'n30' },
    { time: 33.408, text: 'So was I.', highlight: 'h33.408' },
    null,
    { time: 90, text: 'At the same time as a Highlight.', note: 'n90' },
  ]);
});

test('a time reads as a clock shows it: minutes and seconds, with hours once there are any, and never rounded up', () => {
  const read = [0, 3, 59.9, 60, 83.4, 600, 3599.99, 3600, 3723.5, 36000].map(clockTime);

  assert.deepEqual(read, ['0:00', '0:03', '0:59', '1:00', '1:23', '10:00', '59:59', '1:00:00', '1:02:03', '10:00:00']);
});
