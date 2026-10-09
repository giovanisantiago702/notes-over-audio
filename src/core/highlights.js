// Highlights: what one saves, where it shows on a Transcript, and how the
// store keeps it. The rules are the annotation model's.

/**
 * The store: where what is saved is kept, by key. Like the player, it is a
 * boundary: the core decides what is kept and under which key, and the real
 * store is the extension's own local storage. Both answers are promises.
 * @typedef {object} Store
 * @property {(key: string) => Promise<any>} get                     What is kept under a key, or undefined.
 * @property {(entries: Record<string, any>) => Promise<void>} set   Keeps each value under its key, all of them at once.
 */

/**
 * A Highlight, as it is saved. It belongs to the video, not to the Transcript
 * it was made on, and nothing in it is shaped by where the video plays.
 * @typedef {object} Highlight
 * @property {string} id      Its own, and never another's.
 * @property {number} start   Seconds: where it shows. With `end`, its address in the video.
 * @property {number} end     Seconds.
 * @property {string} words   A copy of its words as they read when it was made, one space between them.
 * @property {{ language: string, source: 'uploader' | 'auto-generated' }} transcript  Which of the video's Transcripts the words came from.
 * @property {string} made    When it was made: a date and time, as `Date.prototype.toISOString` writes it.
 * @property {number} [occurrence]  Which of them it is, counted from 0, when its time range holds its words more than once. Left out for the first.
 * @property {string} [colour]  Which of `COLOURS` it is. Left out for the default.
 * @property {import('./notes.js').HighlightNote} [note]  The Note on it, if it has one (./notes.js).
 */

/**
 * What the store keeps for one video, under "video:" and the video's id:
 * "video:youtube:iG9CE55wbtY". The title and channel are the video's as they
 * were at its first mark.
 * @typedef {{ title: string, channel: string, highlights: Highlight[], notes?: import('./notes.js').Note[] }} SavedVideo
 * `notes` are its Notes at Moments, left out while it has none (./notes.js).
 */

/** The number of the format everything here is saved in, kept in the store as `formatVersion`. */
export const FORMAT_VERSION = 1;
const keyOf = (videoId) => `video:${videoId}`;
// The order a video's Highlights are kept in: as they come in the video, and of two that start together the shorter first.
const inTimeOrder = (a, b) => a.start - b.start || a.end - b.end || a.made.localeCompare(b.made);

/**
 * The colours a Highlight can be, by name. The first is the default: every
 * Highlight is made in it, and it is saved as no colour at all.
 */
export const COLOURS = Object.freeze(['yellow', 'green', 'purple']);

/**
 * The colour a Highlight is: the one it saves, or the default when it saves
 * none, as every Highlight made before there were colours does.
 * @param {Highlight} highlight
 * @returns {string}  One of `COLOURS`.
 */
export const colourOf = (highlight) => (COLOURS.includes(highlight.colour) ? highlight.colour : COLOURS[0]);

// A word-timed Transcript says when a word starts and not when it ends. It
// ends when the next word starts, and no later than this long after its own
// start, so that a Highlight does not run on through a silence. The last word
// of all has no next word, and is given this long. Both are the prototype's.
const LONGEST_WORD_MS = 1500;
const LAST_WORD_MS = 800;

/** When a word of a word-timed Transcript ends, in seconds. Times are compared in whole milliseconds. */
function endOfWord(words, place) {
  const ms = (word) => Math.round(word.start * 1000);
  const start = ms(words[place]);
  // Captions give some pairs of words one time. The next word said is the next one with a later time.
  let next = place + 1;
  while (words[next] && ms(words[next]) <= start) next += 1;
  return (words[next] ? Math.min(ms(words[next]), start + LONGEST_WORD_MS) : start + LAST_WORD_MS) / 1000;
}

/**
 * The time range of the cue a word of a cue-timed Transcript is in. A cue the
 * captions give no length counts as a millisecond long, so that a Highlight
 * made in it has a time range to show in.
 */
function cueOf(pieces, word) {
  const { start, end } = pieces[word.piece];
  return { start, end: Math.max(end ?? start, (Math.round(start * 1000) + 1) / 1000) };
}

/**
 * The Highlight that a run of a Transcript's words makes.
 * @param {import('./panel.js').ShownTranscript} transcript  A Transcript that is ready.
 * @param {number} first  The first word's place in `words`.
 * @param {number} last   The last word's place.
 * @param {{ id?: string, made?: Date }} [given]  Its id and when it was made, when they are not new and now.
 * @returns {Highlight}
 */
export function highlightOf(transcript, first, last, { id = crypto.randomUUID(), made = new Date() } = {}) {
  const { words, pieces } = transcript;
  // A word in a cue has no time of its own, so there the range widens to the whole cue or cues.
  const cueTimed = transcript.timing === 'cue';
  const highlight = {
    id,
    start: cueTimed ? cueOf(pieces, words[first]).start : words[first].start,
    end: cueTimed ? cueOf(pieces, words[last]).end : endOfWord(words, last),
    words: words.slice(first, last + 1).map((word) => word.text).join(' '),
    transcript: { language: transcript.language, source: transcript.source },
    made: made.toISOString(),
  };
  // A widened range can hold the same words more than once, written alike.
  // The time range and the words then fit each of them, so it says which it is.
  const said = saidIn(transcript, highlight);
  const occurrence = said ? runsOf(words, said.first, said.last, highlight.words, asWritten).findIndex((run) => run.first === first) : -1;
  return occurrence > 0 ? { ...highlight, occurrence } : highlight;
}

/**
 * The video's Highlights, as the store keeps them.
 * @param {Store} store
 * @param {string} videoId
 * @returns {Promise<Highlight[]>}
 */
export async function highlightsOf(store, videoId) {
  return (await store.get(keyOf(videoId)))?.highlights ?? [];
}

/**
 * Keeps a Highlight of a video, in place of any kept under the same id. The
 * first one kept for a video keeps the video's title and channel with it.
 * @param {Store} store
 * @param {import('./panel.js').Video} video
 * @param {Highlight} highlight
 * @returns {Promise<Highlight[]>}  The video's Highlights as they are then kept.
 */
export function saveHighlight(store, video, highlight) {
  return change(store, video.id, (saved) => {
    const kept = named(saved, video);
    return { ...kept, highlights: [...kept.highlights.filter((each) => each.id !== highlight.id), highlight].sort(inTimeOrder) };
  });
}

/**
 * Takes a Highlight of a video out of the store.
 * @param {Store} store
 * @param {string} videoId
 * @param {string} id  The Highlight's.
 * @returns {Promise<Highlight[]>}  The video's Highlights as they are then kept.
 */
export function removeHighlight(store, videoId, id) {
  return change(store, videoId, (saved) => saved && { ...saved, highlights: saved.highlights.filter((highlight) => highlight.id !== id) });
}

/**
 * Keeps a Highlight of a video in another colour. The default is kept as no
 * colour at all, so a Highlight in it is kept as one was before there were colours.
 * @param {Store} store
 * @param {string} videoId
 * @param {string} id      The Highlight's.
 * @param {string} colour  One of `COLOURS`.
 * @returns {Promise<Highlight[]>}  The video's Highlights as they are then kept.
 */
export function colourHighlight(store, videoId, id, colour) {
  const inColour = ({ colour: was, ...highlight }) => (colour === COLOURS[0] ? highlight : { ...highlight, colour });
  const recoloured = (saved) => ({ ...saved, highlights: saved.highlights.map((highlight) => (highlight.id === id ? inColour(highlight) : highlight)) });
  // Any other colour is not taken, and what is kept is left as it is.
  return change(store, videoId, (saved) => (saved && COLOURS.includes(colour) ? recoloured(saved) : null));
}

/**
 * Keeps the title and channel of a video that has something kept and no
 * title or channel with it, because its first mark was made before the page
 * had said them. For any other video it keeps nothing.
 * @param {Store} store
 * @param {import('./panel.js').Video} video
 * @returns {Promise<Highlight[]>}  The video's Highlights as they are kept.
 */
export function saveTitle(store, video) {
  const missing = (saved) => (!saved.title && video.title) || (!saved.channel && video.channel);
  return change(store, video.id, (saved) => (saved && missing(saved) ? named(saved, video) : null));
}

/**
 * What is kept for a video, with the video's title and channel wherever none
 * is kept yet: what to keep when a mark is made on it, the first one included.
 * @param {SavedVideo | undefined} saved
 * @param {import('./panel.js').Video} video
 * @returns {SavedVideo}
 */
export const named = (saved, video) => ({
  ...saved,
  title: saved?.title || video.title,
  channel: saved?.channel || video.channel,
  highlights: saved?.highlights ?? [],
});

// A change reads what the store keeps under a key, alters it and writes it
// back. Two at once would each write over the other's, so the changes to a
// store are made one at a time, in the order they were asked for.
const lastChange = new WeakMap();

/**
 * Changes what the store keeps under one key. `alter` is given what is kept,
 * if anything is, and gives what to keep in its place, or nothing to leave it be.
 * @param {Store} store
 * @param {string} key
 * @param {(kept: any) => any} alter
 * @returns {Promise<any>}  What is then kept under the key.
 */
export function changeKept(store, key, alter) {
  const made = (lastChange.get(store) ?? Promise.resolve()).then(async () => {
    const kept = await store.get(key);
    const altered = alter(kept);
    if (altered) await store.set({ formatVersion: FORMAT_VERSION, [key]: altered });
    return altered ?? kept;
  });
  lastChange.set(store, made.catch(() => {})); // a change that failed does not hold up the next
  return made;
}

/**
 * Changes what the store keeps for a video, its Highlights and anything else
 * kept with them (./notes.js). `alter` is as in `changeKept`.
 * @returns {Promise<SavedVideo | undefined>}  What is then kept for the video.
 */
export const changeSaved = (store, videoId, alter) => changeKept(store, keyOf(videoId), alter);

/**
 * What the store keeps for a video, or undefined for one never marked.
 * @returns {Promise<SavedVideo | undefined>}
 */
export const savedOf = (store, videoId) => store.get(keyOf(videoId));

/**
 * Changes what the store keeps for a video, as `changeSaved` does.
 * @returns {Promise<Highlight[]>}  The video's Highlights as they are then kept.
 */
const change = (store, videoId, alter) => changeSaved(store, videoId, alter).then((saved) => saved?.highlights ?? []);

/**
 * Where a Highlight shows on a Transcript, which need not be the one it was
 * made on. Time decides where: the words said inside its time range. The
 * saved words then find the exact mark among those.
 * @param {import('./panel.js').ShownTranscript} transcript  A Transcript that is ready.
 * @param {Highlight} highlight
 * @returns {{ first: number, last: number } | null}  Places in `words`, or null when nothing is said in its time range.
 */
export function placeHighlight(transcript, highlight) {
  const said = saidIn(transcript, highlight);
  if (!said) return null;

  // The saved words find the exact mark among those: as they are written, or
  // failing that by their letters alone, since another Transcript of the video
  // writes the same words with other capitals and punctuation. Where they are
  // there more than once, the Highlight says which of them it is; if this
  // Transcript has fewer, the first. If they are not there either way, the
  // whole range is marked.
  const written = runsOf(transcript.words, said.first, said.last, highlight.words, asWritten);
  const byLetters = runsOf(transcript.words, said.first, said.last, highlight.words, lettersOf);
  const which = highlight.occurrence ?? 0;
  return written[which] ?? byLetters[which] ?? written[0] ?? byLetters[0] ?? said;
}

/**
 * The words of a Transcript said inside a Highlight's time range.
 * @returns {{ first: number, last: number } | null}  Places in `words`, or null when nothing is said in it.
 */
function saidIn(transcript, highlight) {
  const { words, pieces } = transcript;
  // A word with a time of its own is in the range when it starts there. A word
  // in a cue is in it when any of its cue is.
  const inRange =
    transcript.timing === 'cue'
      ? (word) => cueOf(pieces, word).start < highlight.end && cueOf(pieces, word).end > highlight.start
      : (word) => word.start >= highlight.start && word.start < highlight.end;
  const first = words.findIndex(inRange);
  return first < 0 ? null : { first, last: words.findLastIndex(inRange) };
}

const asWritten = (text) => text;
const lettersOf = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Looks for a Highlight's saved words among a Transcript's words from `first`
 * to `last`, reading both with `read`.
 *
 * What is saved is words with a space between them, and a bracketed phrase
 * such as "(more or less)" is one word of a Transcript with spaces of its own,
 * or a line break where its cue breaks. So nothing in what is saved tells that
 * phrase from three words, and the two sides are read alike: each in the
 * parts its white space divides it into. A part that reads as nothing, as a
 * dash does by its letters, is passed over on both sides. What is found is
 * whole words of the Transcript: a run starts where a word starts and ends
 * where one ends, so a word inside a bracketed phrase is not found by itself.
 * That keeps `occurrence` counting what it counted before bracketed phrases
 * were found at all.
 * @param {string} saved  A Highlight's `words`.
 * @returns {{ first: number, last: number }[]}  Everywhere the run is, in the order it comes.
 */
function runsOf(words, first, last, saved, read) {
  const partsOfText = (text) => text.split(/\s+/).map(read).filter(Boolean);
  const wanted = partsOfText(saved);
  if (!wanted.length) return [];
  const among = []; // each part with the place of the word it is part of
  for (let place = first; place <= last; place += 1) {
    for (const text of partsOfText(words[place].text)) among.push({ place, text });
  }
  const runs = [];
  for (let at = 0, end = wanted.length - 1; end < among.length; at += 1, end += 1) {
    const wholeWords = among[at - 1]?.place !== among[at].place && among[end + 1]?.place !== among[end].place;
    if (wholeWords && wanted.every((text, i) => among[at + i].text === text)) runs.push({ first: among[at].place, last: among[end].place });
  }
  return runs;
}

/**
 * One part of a line: a word, as its place in `words`; the space between two
 * words; or a Highlight's mark around parts of its own.
 * @typedef {number | ' ' | { highlight: string, colour?: string, parts: LinePart[] }} LinePart
 * A mark names its Highlight's `colour` only when that is not the default.
 */

/**
 * The lines of a Transcript that hold a mark, each as its parts. Where two
 * Highlights share words, the one that starts later is marked inside the other.
 * @param {import('./panel.js').ShownTranscript | null} transcript
 * @param {Highlight[]} highlights
 * @returns {Map<number, LinePart[]>}  By the line's place in `sentences`. Empty until the Transcript is ready.
 */
export function markLines(transcript, highlights) {
  const lines = new Map();
  if (transcript?.status !== 'ready') return lines;
  const placed = highlights
    .map((highlight) => ({ id: highlight.id, colour: colourOf(highlight), ...placeHighlight(transcript, highlight) }))
    .filter((mark) => mark.first != null)
    // Outermost first: the one that starts first, and of two that start together the one that runs further.
    .sort((a, b) => a.first - b.first || b.last - a.last);
  transcript.sentences.forEach((sentence, at) => {
    const inLine = placed.filter((mark) => mark.first <= sentence.last && mark.last >= sentence.first);
    if (inLine.length) lines.set(at, partsOf(sentence, inLine));
  });
  return lines;
}

/** One line as its parts, given the marks that reach into it, outermost first. */
function partsOf(sentence, marks) {
  const line = [];
  let open = []; // the marks around the word before, outermost first
  const innermost = () => open.at(-1)?.parts ?? line;
  const openMark = (mark) => {
    const parts = [];
    // A mark names its colour only when that is not the default.
    innermost().push({ highlight: mark.id, ...(mark.colour !== COLOURS[0] && { colour: mark.colour }), parts });
    open.push({ id: mark.id, parts });
  };
  for (let place = sentence.first; place <= sentence.last; place += 1) {
    const around = marks.filter((mark) => mark.first <= place && mark.last >= place);
    // The marks around the word before stay open as far as they are around this word too, in the same order.
    let kept = 0;
    while (kept < open.length && open[kept].id === around[kept]?.id) kept += 1;
    open = open.slice(0, kept);
    // A mark that goes on from the word before opens again ahead of the space
    // between the two, so the space is marked like the words on either side of it.
    around.slice(kept).filter((mark) => mark.first < place).forEach(openMark);
    if (place > sentence.first) innermost().push(' ');
    around.slice(open.length).forEach(openMark);
    innermost().push(place);
  }
  return line;
}
