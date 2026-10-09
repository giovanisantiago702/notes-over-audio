// A panel open on a video, for the tests of what the keys do in it: the
// stand-in player, the stand-in store and the stand-in clock, a Transcript
// that has arrived, and ways to read what the panel shows.

import assert from 'node:assert/strict';

import { clockTime } from '../src/core/notes.js';
import { createPanel } from '../src/core/panel.js';
import { standInClock } from './stand-in-clock.js';
import { standInPlayer } from './stand-in-player.js';
import { standInStore } from './stand-in-store.js';

// The two videos the real captions are of. Two of the three sets are the talk's.
export const talk = { id: 'youtube:iG9CE55wbtY', title: 'Do schools kill creativity?', channel: 'TED' };
export const dinner = { id: 'youtube:rddfPNBNAJs', title: 'Remarks after dinner', channel: 'The Dinner' };

/** A word-timed Transcript saying each of `said`, a pair of a time in seconds and the words that start then, half a second apart. */
export const saying = (...said) => ({
  language: 'en',
  source: 'auto-generated',
  timing: 'word',
  pieces: said.flatMap(([start, text]) => text.split(' ').map((word, i) => ({ text: word, start: start + i * 0.5 }))),
});
/** Four sentences, from 10, 12, 14 and 20 s. */
export const morning = () => saying([10, 'Good morning.'], [12, 'How are you?'], [14, "It's been great."], [20, "I've been blown away."]);

/** Lets everything already under way finish. */
export const settled = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A panel open on a video whose Transcript has arrived, with the video at
 * `at` seconds. `now()` is what it shows, and `clock` the time of day it goes
 * by. Give it the store of an earlier panel to open the video again.
 * `transcript` is the Transcript of every video, or a function that gives each video's.
 */
export async function panelOn(video, transcript, { at = 0, store = standInStore() } = {}) {
  const shown = [];
  const player = standInPlayer({ video, currentTime: at });
  const clock = standInClock();
  const fetchTranscript = async (asked) => (typeof transcript === 'function' ? transcript(asked) : transcript);
  const panel = createPanel({ player, fetchTranscript, store, now: clock.now, show: (state) => shown.push(state) });
  await panel.refresh();
  await settled();
  return { panel, player, store, clock, shown, now: () => shown.at(-1) };
}

/** The video plays on to a time, or is moved there, and H is pressed. */
export async function pressHAt({ panel, player }, seconds) {
  player.playTo(seconds);
  await panel.keyPressed('h');
}

/** The video plays on to a time, or is moved there, and N is pressed. */
export async function pressNAt({ panel, player }, seconds) {
  player.playTo(seconds);
  await panel.keyPressed('n');
}

/** Where `phrase` stands among the words on show: its first word's place and its last word's. */
function placesOf({ transcript }, phrase) {
  const wanted = phrase.split(' ');
  const first = transcript.words.findIndex((_, at) => wanted.every((text, i) => transcript.words[at + i]?.text === text));
  assert.ok(first >= 0, `"${phrase}" is in the Transcript`);
  return [first, first + wanted.length - 1];
}
/** Selects `phrase` in the Transcript on show and lets go. */
export const select = ({ panel, now }, phrase) => panel.highlight(...placesOf(now(), phrase));

/** The lines on show, each as its text, with every mark between « and ». */
export function lines({ transcript, marks }) {
  const written = (parts) => parts.map((part) => (part === ' ' ? ' ' : typeof part === 'number' ? transcript.words[part].text : `«${written(part.parts)}»`)).join('');
  return transcript.sentences.map((sentence, at) => (marks.has(at) ? written(marks.get(at)) : sentence.text));
}
/**
 * The Transcript as it reads with its Notes: the lines on show, and each Note
 * on a line of its own where it is drawn, as "    ↳ 16.4 s: what it says".
 */
export function withNotes(state) {
  const drawn = (after) => (state.notesAfter.get(after) ?? []).map((note) => `    ↳ ${note.time} s: ${note.text}`);
  return [...drawn(-1), ...lines(state).flatMap((line, at) => [line, ...drawn(at)])];
}
/** Only the lines that hold a mark. */
export const marked = (state) => lines(state).filter((line) => line.includes('«'));
/** The words of each Highlight on show, in the order they come in the video. */
export const wordsOf = (state) => state.highlights.map((highlight) => highlight.words);
/**
 * The list the panel shows where the Transcript would be, as it reads: each
 * entry its time as a clock shows it, then a Highlight's saved words between
 * « and », with its colour when that is not the default and its Note if it
 * has one, or a Note at a Moment. Null when the panel shows no list.
 */
export const listed = ({ entries }) =>
  entries &&
  entries.map(({ time, highlight, note }) => {
    const colour = highlight?.colour ? ` (${highlight.colour})` : '';
    return `${clockTime(time)} ${highlight ? `«${highlight.words}»${colour}${highlight.note ? ` ↳ ${highlight.note.text}` : ''}` : `↳ ${note.text}`}`;
  });
