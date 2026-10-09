// The keys the panel takes, wherever they were pressed: with keyboard focus
// in the panel, or in the video's page, which passes them on.

/**
 * @param {Record<string, () => Promise<void>>} does  What each key does, by its letter in lower case.
 */
export function createKeys(does) {
  // One key at a time, in the order they were pressed: what a key does may
  // rest on what the key before it did, as H again rests on H.
  let last = Promise.resolve();
  return {
    /** The letters taken, in lower case. */
    taken: Object.keys(does),

    /**
     * A key was pressed. A letter counts whether or not it comes as a
     * capital, and a key that is not taken does nothing.
     * @param {string} key  As a keyboard event names it: "h", "H", "Enter".
     * @returns {Promise<void>}  Settles once what the key does is done, and fails if that failed.
     */
    pressed(key) {
      const act = Object.hasOwn(does, String(key).toLowerCase()) ? does[String(key).toLowerCase()] : null;
      if (!act) return Promise.resolve();
      const done = last.then(() => act());
      last = done.catch(() => {}); // a key that failed does not hold up the next
      return done;
    },
  };
}
