// The core: what the panel shows. Nothing of YouTube or Chrome belongs in this
// folder, so everything here runs and is tested in plain Node.

import { cutIntoSentences } from './transcript.js';
import { highlightOf, highlightsOf, markLines, removeHighlight, savedOf, saveHighlight, saveTitle } from './highlights.js';
import { colourHighlight } from './highlights.js';
import { createJustMade } from './just-made.js';
import { createKeepJustSpoken } from './just-spoken.js';
import { createKeys } from './keys.js';
import { noteAt, noteHighlight, placeNotes, removeNote, saveNote } from './notes.js';
import { listEntries } from './notes.js';
import { saveSetting, settingsOf } from './settings.js';
import { createUndo, withChangeTakenBack } from './undo.js';

/**
 * A video, as the player names it.
 * @typedef {object} Video
 * @property {string} id       The video's identity, such as "youtube:iG9CE55wbtY". The core never looks inside it.
 * @property {string} title    Empty while the page has not said yet.
 * @property {string} channel  Empty while the page has not said yet.
 */

/**
 * The player: the one thing the core knows about where the video plays. It
 * answers which video, the time and whether it is playing, and it seeks,
 * pauses and plays. Every answer is a promise, because the real player sits
 * in another process. While an advert plays it cannot say the time, the video
 * is not what is playing, and it ignores a seek, a pause and a play.
 * @typedef {object} Player
 * @property {() => Promise<Video | null>} video         Which video it is on, or null when it is on none.
 * @property {() => Promise<number | null>} currentTime  Seconds into the video, or null when it is on none or cannot say just now.
 * @property {(seconds: number) => Promise<void>} seekTo Move the video to a time, in seconds.
 * @property {() => Promise<boolean>} playing            Whether the video is playing now.
 * @property {() => Promise<void>} pause                 Pause the video where it is.
 * @property {() => Promise<void>} play                  Play it on from where it is.
 */

/**
 * Where a video's Transcript comes from. The promise gives the Transcript,
 * or null when the video has none, and fails when one could not be fetched.
 * It may take a long time: the core shows a waiting line until it settles.
 * @callback FetchTranscript
 * @param {Video} video
 * @returns {Promise<import('./transcript.js').Transcript | null>}
 */

/**
 * What the panel shows where the Transcript goes. While `status` is "ready"
 * this is the Transcript itself, cut into sentences. Otherwise it is one line.
 * @typedef {{ status: 'getting' | 'none', line: string }
 *   | { status: 'failed', line: string, reason: string }
 *   | (import('./transcript.js').Transcript & import('./transcript.js').Cut & { status: 'ready', line: null })} ShownTranscript
 */

const GETTING = Object.freeze({ status: 'getting', line: 'Getting the transcript…' });
const NONE = Object.freeze({ status: 'none', line: 'This video has no transcript.' });
const failed = (error) => ({ status: 'failed', line: 'The transcript could not be fetched.', reason: String(error?.message ?? error) });

/**
 * @param {object} given
 * @param {Player} given.player
 * @param {FetchTranscript} given.fetchTranscript
 * @param {import('./highlights.js').Store} given.store  Where the video's Highlights and Notes are kept, and the settings.
 * @param {(state: { video: Video | null, transcript: ShownTranscript | null }) => void} given.show
 *   Called with everything the panel shows, each time it changes. `transcript` is null when there is no video.
 *   Of Highlights it is also given `highlights`, the video's, as they are saved and in the order they come in
 *   the video; `marks`, the lines of the Transcript that hold a mark (see `markLines`), the same object until
 *   a Highlight or the Transcript changes; and `open`, the Highlight that is open, or null.
 *   Of Notes it is given `notes`, the video's Notes at Moments, as they are saved and in the order they come
 *   in the video (a Note on a Highlight is that Highlight's `note`); `notesAfter`, the Notes of both kinds by
 *   the line of the Transcript each is drawn after (see `placeNotes`), the same object until a Note, a
 *   Highlight or the Transcript changes; `writing`, the Note at a Moment being written, as `{ time }`, or
 *   null; and `pauseWhileWriting`, whether "Pause the video while I write a Note" is on. The Note on a
 *   Highlight is written in that Highlight's box, so while a Highlight is `open` nothing is `writing`.
 *   While the video has no Transcript on show, whether it has no captions, the fetch failed or the
 *   Transcript is still on its way, it is also given `entries`: everything saved for the video as one list
 *   in time order (see `listEntries`), the same object until something saved changes. With a Transcript on
 *   show, and with no video, `entries` is null.
 * @param {() => number} [given.now]  The time of day in milliseconds, as `Date.now` gives it. The 5 s after a
 *   Highlight is made are counted on it, and it is when a Note is made.
 */
export function createPanel({ player, fetchTranscript, store, show, now = Date.now }) {
  let video = null;
  let transcript = null;
  let highlights = [];
  let marks = markLines(transcript, highlights);
  let open = null;
  let notes = []; // the video's Notes at Moments
  let notesAfter = placeNotes(transcript, highlights, notes);
  let entries = listEntries(transcript, highlights, notes); // what is saved, as the list shown while there is no Transcript
  let writing = null; // the Note at a Moment being written, as { time }
  let pauseWhileWriting = false; // "Pause the video while I write a Note"
  let shownOnce = false;
  const showAll = () => {
    shownOnce = true;
    playAgainOnceShut();
    show({ video, transcript, highlights, marks, open, notes, notesAfter, writing, pauseWhileWriting, entries });
  };

  // "Pause the video while I write a Note" is a setting: off until the person ticks it, and
  // remembered from then on (./settings.js). A store that cannot be read leaves it off.
  const settingsRead = settingsOf(store).then((kept) => {
    pauseWhileWriting = kept.pauseWhileWriting === true;
    if (pauseWhileWriting && shownOnce) showAll();
  }, () => {});

  // With that setting on, the video is paused while a Note is written, and plays again when the
  // box the Note was written in shuts, however it shuts. A video that was not playing is left alone.
  let toPlayAgain = false; // whether the video was playing when it was paused for the Note being written
  async function pauseForNote() {
    await settingsRead;
    if (!pauseWhileWriting || toPlayAgain || !(await player.playing())) return;
    await player.pause();
    toPlayAgain = true;
  }
  function playAgainOnceShut() {
    if (!toPlayAgain || open || writing) return;
    toPlayAgain = false;
    player.play().catch(() => {});
  }

  /** Takes the video's Highlights as given, and works out afresh where they show in the Transcript, and the Notes with them. */
  function mark(saved = highlights) {
    highlights = saved;
    marks = markLines(transcript, highlights);
    open = highlights.find((each) => each.id === open?.id) ?? null;
    notesAfter = placeNotes(transcript, highlights, notes);
    entries = listEntries(transcript, highlights, notes);
  }
  /** Takes the video's Notes at Moments as given, and works out afresh where every Note shows. */
  function note(saved) {
    notes = saved;
    notesAfter = placeNotes(transcript, highlights, notes);
    entries = listEntries(transcript, highlights, notes);
  }

  /** Shows the video's Highlights as the store keeps them once `change` is made, unless the tab has moved on by then. */
  async function showSaved(change) {
    const asked = video.id;
    const saved = await change;
    if (video?.id !== asked) return;
    mark(saved);
    showAll();
  }
  /** The same for the video's Notes at Moments. */
  async function showNotes(change) {
    const asked = video.id;
    const saved = await change;
    if (video?.id !== asked) return;
    note(saved);
    showAll();
  }
  /** Shows everything the store keeps for the video, its Highlights and its Notes at Moments, once it is read. */
  async function showKept(reading) {
    const asked = video.id;
    const saved = await reading;
    if (video?.id !== asked) return;
    notes = saved?.notes ?? [];
    mark(saved?.highlights ?? []);
    showAll();
  }

  // The Highlight just made, for the 5 s that it is (./just-made.js), and what U can take back (./undo.js).
  const justMade = createJustMade({ now });
  const undo = createUndo();

  /**
   * Changes one Highlight of the video on show, and shows what is then kept:
   * `next` is kept in place of `was`. With no `was` it is made, and with no
   * `next` it is removed. One made or grown is then the Highlight just made,
   * and U takes the change back. `withH` says that H made or grew it, and
   * only such a one does H again grow (./just-made.js).
   */
  async function changeHighlight(was, next, { withH = false } = {}) {
    const on = video;
    const keep = (highlight) => showSaved(saveHighlight(store, on, highlight));
    const remove = (highlight) => showSaved(removeHighlight(store, on.id, highlight.id));
    await (next ? keep(next) : remove(was));
    if (video?.id !== on.id) return; // the tab moved on meanwhile: this is no change to the video now on show
    if (next) justMade.made(next.id, { withH });
    undo.did(async () => {
      if (!was) return remove(next);
      if (!next) return keep(was);
      // Grown. What growing it altered goes back, on the Highlight as it is kept now: that is the
      // record that was there, unless it has been given something since, a colour say, which stays.
      const kept = (await highlightsOf(store, on.id)).find((each) => each.id === was.id);
      if (kept) await keep(withChangeTakenBack(kept, was, next));
    });
  }

  /**
   * Changes one Note at a Moment of the video on show, and shows what is then
   * kept: `next` is kept, or with none `was` is deleted. U takes the change back.
   */
  async function changeNote(was, next) {
    const on = video;
    const keep = (each) => showNotes(saveNote(store, on, each));
    const remove = (each) => showNotes(removeNote(store, on.id, each.id));
    await (next ? keep(next) : remove(was));
    if (video?.id !== on.id) return; // the tab moved on meanwhile, as in `changeHighlight`
    undo.did(() => (next ? remove(next) : keep(was)));
  }

  /**
   * Changes the Note on a Highlight of the video on show, and shows what is
   * then kept: `next` is kept in place of the one it has, or with none that
   * one is deleted. U gives the Highlight the Note it had before, or none. It
   * does not make the Highlight the one just made again.
   */
  async function changeNoteOn(highlight, next) {
    const on = video;
    const keep = (each) => showSaved(noteHighlight(store, on.id, highlight.id, each));
    await keep(next);
    if (video?.id !== on.id) return;
    undo.did(() => keep(highlight.note ?? null));
  }

  // What each key does, by its letter (./keys.js). H keeps the sentence just spoken (./just-spoken.js).
  const keys = createKeys({
    h: createKeepJustSpoken({ player, justMade, onShow: () => ({ transcript, highlights }), change: (was, next) => changeHighlight(was, next, { withH: true }) }),
    // N writes a Note: on the Highlight just made, or else at the Moment it was pressed.
    async n() {
      const on = video;
      const made = highlights.find((each) => each.id === justMade.id());
      if (made) {
        // On a Highlight, the Note is written in the box that opens for that Highlight.
        open = made;
        writing = null;
        showAll();
        await pauseForNote();
        return playAgainOnceShut();
      }
      // The video is paused first, when that is asked for, so that the Moment is where it stopped.
      await pauseForNote();
      const seconds = await player.currentTime();
      // The player cannot say the time while an advert plays, and then there is no Moment to take.
      if (seconds == null || video?.id !== on?.id) return playAgainOnceShut();
      open = null;
      writing = { time: seconds };
      showAll();
    },
    // U undoes. After it no Highlight is the one just made: the next H takes a sentence afresh.
    u() {
      justMade.forget();
      return undo.undo();
    },
  });

  /** Fetches the video's Transcript and shows it when it comes, unless the tab has moved on by then. */
  function getTranscript() {
    const asked = video.id;
    const answer = (answered) => {
      if (video?.id !== asked) return;
      transcript = answered;
      mark();
      showAll();
    };
    fetchTranscript(video)
      .then((arrived) => {
        const cut = arrived && cutIntoSentences(arrived);
        // Captions with no words in them are no Transcript.
        return cut?.words.length ? { status: 'ready', line: null, ...arrived, ...cut } : NONE;
      })
      .then(answer, (error) => answer(failed(error)));
  }

  /** Asks the player which video it is on and shows it. A video's Transcript is fetched when the panel first finds the tab on that video. */
  async function refresh() {
    const answered = await player.video();
    const another = answered?.id !== video?.id;
    video = answered;
    if (another) transcript = video ? GETTING : null;
    if (another) notes = [];
    if (another) mark([]);
    // A Note being written was for the video that was on show.
    if (another) writing = null;
    if (another) toPlayAgain = false;
    // The Highlight just made and what U can take back were the video's that was on show.
    if (another) justMade.forget();
    if (another) undo.forget();
    showAll();
    if (another && video) getTranscript();
    if (another && video) showKept(savedOf(store, video.id));
    // A first mark can come before the page has said the video's title. It is kept once the page has.
    if (video?.title) saveTitle(store, video);
  }

  return {
    /**
     * Ask the player which video it is on and show it. Call on opening, and
     * whenever the video may have changed. A video's Transcript is fetched
     * once, when the panel first finds the tab on that video.
     */
    refresh,

    /**
     * The page the video is on was loaded afresh, as a reload of it does. Call
     * in place of `refresh` then, and only then: it does what `refresh` does,
     * and when the fetch of the video's Transcript had failed, it fetches once
     * more. That is the one thing that tries a failed fetch again while the
     * panel stays open on the video, since a page loaded afresh has a player
     * that starts afresh. A Transcript on show stays, a fetch under way is
     * left to finish, and a video with no captions is not asked about again.
     */
    async pageLoaded() {
      await refresh();
      if (transcript?.status !== 'failed') return;
      // What is saved stays listed under the waiting line, and `getTranscript` puts every mark at its place when the Transcript comes.
      transcript = GETTING;
      showAll();
      getTranscript();
    },

    /**
     * Makes a Highlight of the words from one place in the Transcript's
     * `words` to another, and keeps it. With no Transcript on show it makes nothing.
     */
    async highlight(first, last) {
      if (transcript?.status !== 'ready') return;
      await changeHighlight(null, highlightOf(transcript, first, last));
    },

    /** Removes a Highlight of the video, for good. */
    async removeHighlight(id) {
      const removed = highlights.find((each) => each.id === id);
      if (removed) await changeHighlight(removed, null);
    },

    /** Gives a Highlight of the video another of the colours it can be (see `COLOURS`), and keeps it so. */
    async colourHighlight(id, colour) {
      if (video) await showSaved(colourHighlight(store, video.id, id, colour));
    },

    /**
     * Opens a Highlight: the panel shows it as `open`, to offer what can be done to it, which
     * is also where its Note is written or changed. One is open at a time, and a Note at a
     * Moment that was being written is dropped.
     */
    openHighlight(id) {
      open = highlights.find((each) => each.id === id) ?? null;
      writing = null;
      showAll();
      if (open) pauseForNote().then(playAgainOnceShut, () => {});
    },
    closeHighlight() {
      open = null;
      showAll();
    },

    /**
     * Saves the Note being written, with this as its text, and shuts the box it was written
     * in: the Note on the Highlight that is open, or the Note at a Moment. The space around
     * the text is left off. With no text, a Highlight's Note is removed and a Moment gets none.
     */
    async saveNote(text) {
      const written = String(text ?? '').trim();
      const [onHighlight, atMoment] = [open, writing];
      open = null;
      writing = null;
      showAll();
      if (onHighlight) {
        // A Highlight carries one Note. What is written changes the one it has, which keeps when it
        // was made, and with nothing written the Note is taken away.
        const had = onHighlight.note ?? null;
        if (written === (had?.text ?? '')) return; // as it was: no change, and nothing for U to take back
        await changeNoteOn(onHighlight, written ? { text: written, made: had?.made ?? new Date(now()).toISOString() } : null);
      } else if (atMoment && written) {
        // With nothing written there is no Note to keep.
        await changeNote(null, noteAt(atMoment.time, written, { made: new Date(now()) }));
      }
    },

    /** Shuts the box a Note was being written in, a Highlight's or the Moment's, and keeps nothing of what was written. */
    async cancelNote() {
      open = null;
      writing = null;
      showAll();
    },

    /**
     * Sets "Pause the video while I write a Note" on or off, and keeps it so. With it on, the
     * video is paused when a Note is opened for writing, and plays again when its box shuts.
     */
    async setPauseWhileWriting(on) {
      await settingsRead;
      pauseWhileWriting = on === true;
      showAll();
      await saveSetting(store, 'pauseWhileWriting', pauseWhileWriting);
    },

    /** Deletes a Note at a Moment, by the Note's id. */
    async removeNote(id) {
      const removed = notes.find((each) => each.id === id);
      if (removed) await changeNote(removed, null);
    },
    /** Deletes the Note on a Highlight, by the Highlight's id. The Highlight stays. */
    async removeNoteOn(highlightId) {
      const noted = highlights.find((each) => each.id === highlightId);
      if (noted?.note) await changeNoteOn(noted, null);
    },

    /**
     * The Highlight just made, for the 5 s after it was: the one H again
     * grows, and the one a Note goes on. Null at any other time.
     */
    highlightJustMade: () => highlights.find((each) => each.id === justMade.id()) ?? null,

    /**
     * A key was pressed, in the panel or in the video's page: H, N or U, by
     * its letter. Any other key does nothing. Keys are taken one at a time,
     * in the order they were pressed. N is done once its box is open, not
     * when the Note is saved.
     */
    keyPressed: (key) => keys.pressed(key),
    /** The letters of the keys it takes, in lower case, for whoever has to pass them on. */
    keys: keys.taken,
  };
}
