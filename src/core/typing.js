// Typing a Note with the keyboard in the video's page. The Note is written
// in a text field of the panel, and a browser types only into a field that
// has the keyboard. So a key pressed in the video's page while a Note is being
// written is passed on, and this file says what it does to what is written:
// what the browser itself would have done, had the key been typed in the field.

/**
 * What is being written, as a text field holds it.
 * @typedef {object} Written
 * @property {string} text   What is written so far.
 * @property {number} start  Where what is selected starts, as a place in `text`.
 * @property {number} end    Where it ends. The same as `start` when nothing is selected: that is the caret.
 */

/**
 * The keys that type no character and still do something to a Note being
 * written, as a keyboard event names them. Every other key that does
 * something is a character: its name is the one character it types.
 */
export const TYPING_KEYS = ['Backspace', 'Enter', 'Escape'];

/**
 * What a key does to what is being written.
 * @param {Written} written
 * @param {string} key  The key as a keyboard event names it: the character it types, or a name such as "Backspace".
 * @param {{ shift?: boolean }} [held]  Whether Shift was held with it.
 * @returns {{ text: string, caret: number } | 'save' | 'cancel' | null}
 *   What is written after the key, and where the caret then is. Or "save", when the key saves what is
 *   written as it stands, or "cancel", when it drops it. Null for a key that does nothing here: one
 *   that is neither a character nor one of TYPING_KEYS.
 */
export function typeKey({ text, start, end }, key, { shift = false } = {}) {
  /** What is written once `put` stands where `from` up to `end` stood, with the caret after it. */
  const putting = (put, from = start) => ({ text: text.slice(0, from) + put + text.slice(end), caret: from + put.length });
  if (key === 'Escape') return 'cancel';
  // Enter saves, and with Shift it starts a new line.
  if (key === 'Enter') return shift ? putting('\n') : 'save';
  // Backspace takes off what is selected, or with nothing selected the character before the caret:
  // the whole of it, when it is one that takes two places in the text, as an emoji does.
  const before = /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(text.slice(0, start)) ? 2 : 1;
  if (key === 'Backspace') return putting('', start === end ? Math.max(0, start - before) : start);
  // Any other key with a name of more than one character types nothing: an arrow, Tab, a key that only starts an accent.
  return [...String(key)].length === 1 ? putting(key) : null;
}
