// Settings: what the person has chosen that is not about any one video. They
// are kept in the store under one key of their own, `settings`, beside the
// videos' records and in none of them.

import { changeKept } from './highlights.js';

const KEY = 'settings';

/**
 * The settings, as they are saved. One that was never chosen is left out, and reads as off.
 * @typedef {object} Settings
 * @property {boolean} [pauseWhileWriting]  "Pause the video while I write a Note".
 */

/**
 * The settings the store keeps: none, until one is chosen.
 * @param {import('./highlights.js').Store} store
 * @returns {Promise<Settings>}
 */
export async function settingsOf(store) {
  return (await store.get(KEY)) ?? {};
}

/**
 * Keeps one setting, and leaves the others as they are kept.
 * @param {import('./highlights.js').Store} store
 * @param {keyof Settings} name
 * @param {boolean} value
 * @returns {Promise<Settings>}  The settings as they are then kept.
 */
export function saveSetting(store, name, value) {
  return changeKept(store, KEY, (kept) => ({ ...kept, [name]: value }));
}
