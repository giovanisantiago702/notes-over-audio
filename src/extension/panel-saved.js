// What is saved, on the panel's page, while there is no Transcript on show:
// one list where the lines would be, under the line that says why there are
// none. Whether there is a list, and which entries it holds in which order,
// are decided in the core (`entries` in ../core/panel.js, from `listEntries`
// in ../core/notes.js); this file only puts that on the page and passes on
// what the person does.
//
// The list is an element of its own, outside the Transcript's lines, so what
// belongs to the lines does not reach it: a selection in it is never one of
// the Transcript's words (panel-highlights.js), and nothing in it is followed
// (follow-playback.js). A Note in it is drawn by `drawNote`, as between the lines.

import { COLOURS, colourOf } from '../core/highlights.js';
import { clockTime, shownNote } from '../core/notes.js';
import { drawNote } from './panel-notes.js';

const make = (tag, className, text) => {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text != null) made.textContent = text;
  return made;
};

/**
 * Draws one entry of the list: its time, and beside it a Highlight's saved
 * words, as a mark in its colour with its Note under them if it has one, or a
 * Note at a Moment. The time, in seconds, is the entry's `data-time`; the mark
 * carries its Highlight's id as `data-highlight`, as a mark in a line does.
 * @param {import('../core/notes.js').Entry} entry
 * @returns {HTMLElement}
 */
function drawEntry(entry) {
  const drawn = make('div', 'entry');
  drawn.dataset.time = entry.time;
  const time = make('button', 'entry-time', clockTime(entry.time));
  time.type = 'button';
  time.title = 'Jump to this time';
  const body = make('div', 'entry-body');
  const note = shownNote(entry);
  if (entry.highlight) {
    // A mark names its colour only when that is not the default, here as in a line.
    const colour = colourOf(entry.highlight) === COLOURS[0] ? null : colourOf(entry.highlight);
    const words = make('mark', null, entry.highlight.words);
    words.dataset.highlight = entry.highlight.id;
    if (colour) words.dataset.colour = colour;
    const saved = make('p', 'entry-words');
    saved.append(words);
    body.append(saved);
    if (note) body.append(drawNote(note, colour ? { colour } : {}));
  } else {
    body.append(drawNote(note));
  }
  drawn.append(time, body);
  return drawn;
}

/**
 * @param {object} given
 * @param {HTMLElement} given.list  Where the list is drawn. It is hidden while there is nothing to list.
 * @param {(seconds: number) => void} given.jumpTo  Moves the video to a time.
 */
export function savedOnPage({ list, jumpTo }) {
  let entries = null; // the list drawn now, as the core gave it

  return {
    /** Puts the list on the page, or takes it off when the core gives none. The open Highlight's words are outlined. */
    show({ entries: shown, open }) {
      if (shown !== entries) {
        entries = shown;
        list.hidden = !shown?.length;
        list.replaceChildren(...(shown ?? []).map(drawEntry));
      }
      for (const mark of list.querySelectorAll('mark[data-highlight]')) mark.classList.toggle('open', mark.dataset.highlight === open?.id);
    },

    /**
     * Passes on what the person does to the panel (see createPanel in ../core/panel.js).
     * @param {{ openHighlight: Function, removeNote: Function, removeNoteOn: Function }} panel
     */
    listenFor(panel) {
      // A press that moves this far before it is let go was not a click. Nothing in the list can
      // be selected, and a drag across it, as if to select, does nothing at all.
      const DRAG_PX = 5;
      let pressedAt = null;
      list.addEventListener('mousedown', (event) => {
        if (event.button === 0) pressedAt = { x: event.pageX, y: event.pageY };
      });

      // A click on an entry jumps the video to its time. On a Highlight's words or on its Note it
      // also opens that Highlight, where its Note is written and it can be removed. A click on a
      // Note's × deletes that Note and jumps nowhere.
      list.addEventListener('click', (event) => {
        const entry = event.target.closest('.entry');
        // A click made with the keyboard, on an entry's time, has no press before it (`detail` is 0).
        const dragged = event.detail > 0 && !!pressedAt && Math.hypot(event.pageX - pressedAt.x, event.pageY - pressedAt.y) >= DRAG_PX;
        if (!entry || dragged) return;
        const note = event.target.closest('.note');
        if (event.target.closest('.note-delete')) {
          (note.dataset.onHighlight ? panel.removeNoteOn(note.dataset.onHighlight) : panel.removeNote(note.dataset.note)).catch(console.error);
          return;
        }
        jumpTo(Number(entry.dataset.time));
        const highlightId = event.target.closest('mark[data-highlight]')?.dataset.highlight ?? note?.dataset.onHighlight;
        if (highlightId) panel.openHighlight(highlightId);
      });
    },
  };
}
