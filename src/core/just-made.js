// The Highlight just made. For a while after one is made, the next key is
// taken to be about it. For 5 s, N writes a Note on it, however it was made.
// For 3 s, H again grows it back by a sentence, if H made it. The prototype gave both keys
// 8 s; they were shortened on the first day the build was used by hand.
//
// H grows only a Highlight that H made or last grew. One made by selecting is
// what the person chose by hand, word for word, and H never stretches it. How
// a Highlight was made is remembered here for those 5 s and nowhere else:
// nothing of it is saved.

/** How long a Highlight stays the one just made, in milliseconds: how long N has to write a Note on it. */
export const JUST_MADE_MS = 5000;

/** How long after H made or grew a Highlight H again still grows it, in milliseconds. */
export const GROW_AGAIN_MS = 3000;

/**
 * Remembers which Highlight was just made, how, and for how long.
 * @param {object} [given]
 * @param {() => number} [given.now]  The time of day in milliseconds, as `Date.now` gives it.
 */
export function createJustMade({ now = Date.now } = {}) {
  let last = null; // { id, at, withH }
  const current = () => (last && now() - last.at < JUST_MADE_MS ? last : null);
  return {
    /**
     * A Highlight was made just now, or made again: its 5 s start here.
     * @param {string} id
     * @param {{ withH?: boolean }} [how]  `withH` when H made it or grew it. Left out for one made by
     *   selecting, and for one that was there already and H took up.
     */
    made(id, { withH = false } = {}) {
      last = { id, at: now(), withH };
    },
    /** The id of the Highlight just made, or null once its 5 s are over. */
    id: () => current()?.id ?? null,
    /** The id of the Highlight H again grows: the one H made or last grew in the last 3 s. Otherwise null. */
    toGrow: () => (current()?.withH && now() - last.at < GROW_AGAIN_MS ? last.id : null),
    /** No Highlight is the one just made any more. */
    forget() {
      last = null;
    },
  };
}
