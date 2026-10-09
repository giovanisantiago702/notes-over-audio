// What a key does to a Note being written, when the key was pressed in the
// video's page and passed on: the text field it would have been typed into is
// in the panel, and the browser types nothing there by itself.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TYPING_KEYS, typeKey } from '../src/core/typing.js';

/** What is written, with the caret after it. */
const written = (text) => ({ text, start: text.length, end: text.length });

test('a character typed goes into what is written, where the caret is, and the caret moves past it', () => {
  assert.deepEqual(typeKey(written(''), 'k'), { text: 'k', caret: 1 });
  assert.deepEqual(typeKey(written('k'), ' '), { text: 'k ', caret: 2 });
  assert.deepEqual(typeKey(written('k '), 'M'), { text: 'k M', caret: 3 });
  assert.deepEqual(typeKey({ text: 'Hllo', start: 1, end: 1 }, 'e'), { text: 'Hello', caret: 2 });
});

test('Backspace takes off the last character: the one before the caret, and nothing when the caret is at the start', () => {
  assert.deepEqual(typeKey(written('k m f'), 'Backspace'), { text: 'k m ', caret: 4 });
  assert.deepEqual(typeKey({ text: 'Heello', start: 2, end: 2 }, 'Backspace'), { text: 'Hello', caret: 1 });
  assert.deepEqual(typeKey({ text: 'Hello', start: 0, end: 0 }, 'Backspace'), { text: 'Hello', caret: 0 });
  assert.deepEqual(typeKey(written(''), 'Backspace'), { text: '', caret: 0 });
});

test('with something selected, a character takes its place, and Backspace takes it off and no more', () => {
  const selected = { text: 'A real question.', start: 2, end: 6 }; // "real"
  assert.deepEqual(typeKey(selected, 'f'), { text: 'A f question.', caret: 3 });
  assert.deepEqual(typeKey(selected, 'Backspace'), { text: 'A  question.', caret: 2 });
});

test('Enter saves, Shift with Enter starts a new line, and Escape cancels, as they do typed in the box', () => {
  assert.equal(typeKey(written('Education, again.'), 'Enter'), 'save');
  assert.deepEqual(typeKey(written('One line.'), 'Enter', { shift: true }), { text: 'One line.\n', caret: 10 });
  assert.equal(typeKey(written('Never mind.'), 'Escape'), 'cancel');
  assert.equal(typeKey(written('Never mind.'), 'Escape', { shift: true }), 'cancel');
});

test('a key that types no character and is none of those three does nothing to what is written', () => {
  for (const key of ['ArrowLeft', 'Tab', 'Shift', 'Dead', 'Process', 'F5', 'Delete', 'Unidentified', '']) {
    assert.equal(typeKey(written('As it was.'), key), null, `"${key}"`);
  }
  assert.deepEqual(TYPING_KEYS, ['Backspace', 'Enter', 'Escape'], 'the three keys with a name that do something');
});

test('a character that takes two places in the text, as an emoji does, goes in whole and comes off whole', () => {
  assert.deepEqual(typeKey(written('Ha '), '😀'), { text: 'Ha 😀', caret: 5 });
  assert.deepEqual(typeKey(written('Ha 😀'), 'Backspace'), { text: 'Ha ', caret: 3 });
  // The caret after a plain character that follows one: only the plain one goes.
  assert.deepEqual(typeKey(written('😀!'), 'Backspace'), { text: '😀', caret: 2 });
});
