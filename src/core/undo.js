// Undo. Whoever changes something says how to take the change back, and U
// takes back the latest change, then the one before it. What can be undone
// is kept in memory and nowhere else: it is gone when the panel closes.

/**
 * A record with one change to it taken back. Every field the change altered
 * is as it was before the change, gone again if the change added it, and
 * every other field is as the record has it now. So when nothing else has
 * changed the record since, this is exactly the record that was there.
 * @param {object} now   The record as it is now.
 * @param {object} was   The record before the change.
 * @param {object} next  The record as the change left it.
 * @returns {object}
 */
export function withChangeTakenBack(now, was, next) {
  const back = { ...now };
  for (const field of new Set([...Object.keys(was), ...Object.keys(next)])) {
    if (JSON.stringify(was[field]) === JSON.stringify(next[field])) continue; // the change left this one alone
    if (field in was) back[field] = was[field];
    else delete back[field];
  }
  return back;
}

export function createUndo() {
  const takeBacks = []; // one for each change, the latest last
  return {
    /**
     * A change was made.
     * @param {() => Promise<unknown>} takeBack  Takes that change back, and that change only.
     */
    did(takeBack) {
      takeBacks.push(takeBack);
    },

    /** Takes back the latest change that has not been taken back. With none left it does nothing. */
    async undo() {
      await takeBacks.pop()?.();
    },

    /** Nothing done so far can be undone any more. */
    forget() {
      takeBacks.length = 0;
    },
  };
}
