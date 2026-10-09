// A clock for the core's tests: the time of day as the panel is given it, in
// milliseconds, which passes only when a test says so. See `now` in
// createPanel (src/core/panel.js).

export function standInClock(startingAt = Date.parse('2026-10-07T12:00:00Z')) {
  let time = startingAt;
  return {
    now: () => time,

    // What a test does to it.
    /** Lets seconds go by. */
    pass(seconds) {
      time += Math.round(seconds * 1000);
    },
  };
}
