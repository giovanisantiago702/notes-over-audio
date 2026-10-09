// A store for the core's tests: it keeps what the real one keeps, in memory.
// See the Store typedef in src/core/highlights.js. Like the extension's own
// local storage, it keeps a copy of what it is given, written out as JSON, so
// nothing a test holds can change what is kept.

export function standInStore() {
  const kept = new Map();
  return {
    get: async (key) => (kept.has(key) ? JSON.parse(kept.get(key)) : undefined),
    set: async (entries) => {
      for (const [key, value] of Object.entries(entries)) kept.set(key, JSON.stringify(value));
    },

    // What a test asks of it.
    /** Everything kept, by key. */
    everything: () => Object.fromEntries([...kept].map(([key, value]) => [key, JSON.parse(value)])),
  };
}
