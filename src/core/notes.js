// Notes: what one saves, how the store keeps it, and where it shows. A Note
// is attached to a Highlight or to a Moment, and the two are kept in two
// places. The rules are the annotation model's.

import { sentenceSpokenAt } from './following.js';
import { changeSaved, named, placeHighlight, savedOf } from './highlights.js';

/**
 * A Note at a Moment, as it is saved: a point in the video's time and what
 * the person wrote there. It has no words of the Transcript and no end.
 * A video's are kept in its record, as `notes`, beside its `highlights`.
 * @typedef {object} Note
 * @property {string} id    Its own, and never another's.
 * @property {number} time  Seconds: the Moment it is at.
 * @property {string} text  What was written.
 * @property {string} made  When it was made: a date and time, as `Date.prototype.toISOString` writes it.
 */

/**
 * A Note on a Highlight, as it is saved: a field of its Highlight, `note`. So
 * a Highlight carries at most one, and the Note goes when its Highlight goes.
 * Its place in the video is its Highlight's.
 * @typedef {object} HighlightNote
 * @property {string} text  What was written.
 * @property {string} made  When it was made, as `Date.prototype.toISOString` writes it.
 */

/**
 * Keeps a Note on a Highlight of a video, in place of any it has, or with
 * none given takes the one it has away. It alters the Highlight where the
 * store keeps it and nothing else of it, so it cannot bring back a Highlight
 * removed in the meantime. One with no Note is kept exactly as it was before
 * it had one.
 * @param {import('./highlights.js').Store} store
 * @param {string} videoId
 * @param {string} id  The Highlight's.
 * @param {HighlightNote | null} [note]
 * @returns {Promise<import('./highlights.js').Highlight[]>}  The video's Highlights as they are then kept.
 */
export function noteHighlight(store, videoId, id, note) {
  const noted = ({ note: had, ...highlight }) => (note ? { ...highlight, note } : highlight);
  return changeSaved(store, videoId, (saved) => saved && { ...saved, highlights: saved.highlights.map((highlight) => (highlight.id === id ? noted(highlight) : highlight)) }).then(
    (saved) => saved?.highlights ?? []
  );
}

// The order a video's Notes at Moments are kept in: as they come in the video, and of two at one Moment the one made first.
const inTimeOrder = (a, b) => a.time - b.time || a.made.localeCompare(b.made);

/**
 * The Note that text written at a Moment makes.
 * @param {number} seconds  The Moment, in the video's time. It is kept to the millisecond.
 * @param {string} text
 * @param {{ id?: string, made?: Date }} [given]  Its id and when it was made, when they are not new and now.
 * @returns {Note}
 */
export function noteAt(seconds, text, { id = crypto.randomUUID(), made = new Date() } = {}) {
  return { id, time: Math.round(seconds * 1000) / 1000, text, made: made.toISOString() };
}

/**
 * The video's Notes at Moments, as the store keeps them.
 * @param {import('./highlights.js').Store} store
 * @param {string} videoId
 * @returns {Promise<Note[]>}
 */
export async function notesOf(store, videoId) {
  return (await savedOf(store, videoId))?.notes ?? [];
}

/**
 * Keeps a Note at a Moment of a video, in place of any kept under the same
 * id. The first thing kept for a video keeps the video's title and channel with it.
 * @param {import('./highlights.js').Store} store
 * @param {import('./panel.js').Video} video
 * @param {Note} note
 * @returns {Promise<Note[]>}  The video's Notes at Moments as they are then kept.
 */
export function saveNote(store, video, note) {
  return changeSaved(store, video.id, (saved) => {
    const kept = named(saved, video);
    return { ...kept, notes: [...(kept.notes ?? []).filter((each) => each.id !== note.id), note].sort(inTimeOrder) };
  }).then((saved) => saved?.notes ?? []);
}

/**
 * Takes a Note at a Moment of a video out of the store. With its last one
 * gone, the video's record keeps no `notes` at all, as before it had any.
 * @param {import('./highlights.js').Store} store
 * @param {string} videoId
 * @param {string} id  The Note's.
 * @returns {Promise<Note[]>}  The video's Notes at Moments as they are then kept.
 */
export function removeNote(store, videoId, id) {
  return changeSaved(store, videoId, (saved) => {
    if (!saved?.notes) return null;
    const { notes, ...rest } = saved;
    const left = notes.filter((note) => note.id !== id);
    return left.length ? { ...rest, notes: left } : rest;
  }).then((saved) => saved?.notes ?? []);
}

/**
 * One thing saved for a video, at its time: a Highlight, whose Note if it has
 * one is its `note`, or a Note at a Moment. A Highlight's time is its start.
 * @typedef {{ time: number, highlight: import('./highlights.js').Highlight } | { time: number, note: Note }} Entry
 */

/**
 * Everything saved for a video, its Highlights and its Notes at Moments, as
 * one list in the order they come in the video. At one time, a Highlight
 * comes before a Note at a Moment.
 * @param {import('./highlights.js').Highlight[]} highlights  The video's, as they are kept.
 * @param {Note[]} notes  The video's Notes at Moments, as they are kept.
 * @returns {Entry[]}
 */
export function entriesOf(highlights, notes) {
  const entries = [...highlights.map((highlight) => ({ time: highlight.start, highlight })), ...notes.map((note) => ({ time: note.time, note }))];
  return entries.sort((a, b) => a.time - b.time); // of two at one time, the one that came first in what was given stays first
}

/**
 * What the panel lists where the Transcript would be, while there is none on
 * show: everything saved for the video, in the order it comes in the video
 * (see `entriesOf`). There is none on show in three cases, and the list is
 * the same in each: the video has no captions, the fetch failed, or the
 * Transcript is still being fetched, which lasts as long as any adverts
 * before the video. With a Transcript on show each mark is at its place in
 * it, and there is no list.
 * @param {import('./panel.js').ShownTranscript | null} transcript  What the panel has where the Transcript goes; null with no video.
 * @param {import('./highlights.js').Highlight[]} highlights
 * @param {Note[]} notes
 * @returns {Entry[] | null}  Null when the panel shows no list.
 */
export function listEntries(transcript, highlights, notes) {
  return transcript && transcript.status !== 'ready' ? entriesOf(highlights, notes) : null;
}

/**
 * A time in the video as a clock shows it, which is how a Note or a Highlight
 * shows its time: "1:23", and "1:02:03" once there are hours. The seconds are
 * never rounded up, so the time shown has always been reached.
 * @param {number} seconds
 * @returns {string}
 */
export function clockTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const [hours, minutes, rest] = [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60];
  const two = (number) => String(number).padStart(2, '0');
  return hours ? `${hours}:${two(minutes)}:${two(rest)}` : `${minutes}:${two(rest)}`;
}

/**
 * A Note as it shows, of either kind: what it says, the time it shows and
 * jumps to, and what it is attached to. A Note on a Highlight names its
 * Highlight's id, as `highlight`, and its time is where its Highlight
 * starts. A Note at a Moment names its own id, as `note`.
 * @typedef {{ time: number, text: string, highlight: string } | { time: number, text: string, note: string }} ShownNote
 */

/**
 * The Note an entry shows, or null for a Highlight that has none.
 * @param {Entry} entry
 * @returns {ShownNote | null}
 */
export function shownNote(entry) {
  if (entry.note) return { time: entry.time, text: entry.note.text, note: entry.note.id };
  return entry.highlight.note ? { time: entry.time, text: entry.highlight.note.text, highlight: entry.highlight.id } : null;
}

/**
 * Where a video's Notes show on a Transcript: after which line each one is
 * drawn. A Note on a Highlight comes after the last line its Highlight marks.
 * A Note at a Moment comes after the line being spoken at its Moment, so
 * between the sentences around it, and before the first line when nothing has
 * been said yet.
 * @param {import('./panel.js').ShownTranscript | null} transcript
 * @param {import('./highlights.js').Highlight[]} highlights
 * @param {Note[]} notes
 * @returns {Map<number, ShownNote[]>}  By the line's place in `sentences`, with -1 for before the first line. Empty until the Transcript is ready.
 */
export function placeNotes(transcript, highlights, notes) {
  const after = new Map();
  if (transcript?.status !== 'ready') return after;
  const { sentences } = transcript;
  for (const entry of entriesOf(highlights, notes)) {
    const shown = shownNote(entry);
    if (!shown) continue;
    // A Highlight that marks nothing on this Transcript still has its time, and its Note shows by that.
    const marked = entry.highlight && placeHighlight(transcript, entry.highlight);
    const line = marked ? sentences.findLastIndex((sentence) => sentence.first <= marked.last) : sentenceSpokenAt(sentences, entry.time);
    after.set(line, [...(after.get(line) ?? []), shown]);
  }
  return after;
}
