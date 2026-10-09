// The real store: the extension's own local storage, on this machine. What is
// kept in it, and under which keys, is decided in the core
// (../core/highlights.js). Nothing kept here is sent anywhere.

/** @type {import('../core/highlights.js').Store} */
export const localStore = {
  get: async (key) => (await chrome.storage.local.get(key))[key],
  set: (entries) => chrome.storage.local.set(entries),
};
