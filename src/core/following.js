// Following playback: which sentence of the Transcript is being spoken, and
// whether the panel keeps it in view. Nothing here knows the page it is shown
// on; the player is the one in ./panel.js.

/**
 * Which sentence is being spoken at a time: the last one to have started.
 * It stays the one being spoken through any silence after it, until the next
 * starts. On a cue-timed Transcript a sentence's start is a place inside its
 * cue, which is as near as those captions say.
 * @param {import('./transcript.js').Sentence[]} sentences  In the order they are spoken.
 * @param {number} seconds  A time in the video.
 * @returns {number}  The sentence's place in `sentences`, or -1 when none has started yet.
 */
export function sentenceSpokenAt(sentences, seconds) {
  let spoken = -1;
  for (let low = 0, high = sentences.length - 1; low <= high; ) {
    const middle = (low + high) >> 1;
    if (sentences[middle].start <= seconds) {
      spoken = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return spoken;
}

/**
 * What the panel shows of the following.
 * @typedef {object} Followed
 * @property {number} spoken      The place, in the Transcript's `sentences`, of the one being spoken. -1 when none is.
 * @property {boolean} following  Whether the panel keeps that sentence in view.
 */

/**
 * @param {object} given
 * @param {import('./panel.js').Player} given.player
 * @param {(followed: Followed) => void} given.show  Called each time what it shows changes.
 */
export function createFollowing({ player, show }) {
  let sentences = null; // of the Transcript on show, when the panel has one that is ready
  let followed = { spoken: -1, following: true };
  /** Shows what has changed, if anything has. */
  const change = (changed) => {
    const next = { ...followed, ...changed };
    if (next.spoken === followed.spoken && next.following === followed.following) return;
    followed = next;
    show({ ...followed });
  };
  /**
   * Asks the player the time and shows the sentence being spoken then, with
   * anything else that changes at the same moment. While the player cannot say
   * the time, which is while an advert plays, nothing changes: the panel holds still.
   */
  const showSpokenNow = async (changed = {}) => {
    const asked = sentences;
    const seconds = await player.currentTime();
    // The answer is for the Transcript that was on show when the player was asked.
    if (seconds != null && asked === sentences) change({ ...changed, spoken: sentenceSpokenAt(sentences, seconds) });
  };

  // With no Transcript on show there is nothing to follow, and each of these does nothing,
  // but `jumpToTime`, which still moves the video.
  return {
    /**
     * Tell it what the panel has where the Transcript goes: the `transcript`
     * the panel is shown (./panel.js). Call it as often as the panel is shown
     * anything. On other sentences than before, the following starts again.
     */
    transcriptShown(transcript) {
      const now = transcript?.status === 'ready' ? transcript.sentences : null;
      if (now === sentences) return;
      sentences = now;
      change({ spoken: -1, following: true });
    },

    /** Ask the player the time, and show the sentence being spoken then. Call a few times a second. */
    async catchUp() {
      if (sentences) await showSpokenNow();
    },

    /** The user scrolled the panel. The following stops until "back to now". */
    scrolledByHand() {
      if (sentences) change({ following: false });
    },

    /** The user asked for the sentence being spoken to be kept in view again. */
    backToNow() {
      if (sentences) change({ following: true });
    },

    /**
     * Move the video to the start of a sentence, given by its place in
     * `sentences`. The following resumes: now is where the user asked to be.
     * The panel shows the jump only once the player says it is there, so a
     * jump the player ignores, as it does during an advert, changes nothing.
     */
    async jumpTo(place) {
      const asked = sentences;
      if (!asked?.[place]) return;
      await player.seekTo(asked[place].start);
      if (asked === sentences) await showSpokenNow({ following: true });
    },

    /**
     * Move the video to a time, in seconds, as a click on a Note's time
     * does. With a Transcript on show the following resumes, as after a jump
     * to a sentence. With none the video is moved all the same, which is the
     * one thing here that needs no Transcript.
     */
    async jumpToTime(seconds) {
      const asked = sentences;
      await player.seekTo(seconds);
      if (asked && asked === sentences) await showSpokenNow({ following: true });
    },
  };
}
