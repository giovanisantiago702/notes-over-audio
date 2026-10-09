// Notes on the panel's page: the Notes drawn between the lines of the
// Transcript, the box docked at the bottom that one is written in, the Note
// field of the box that opens for a Highlight, and the "Pause the video while
// I write a Note" checkbox. Which Note shows after which line, what is being
// written and whether the video pauses for it are decided in the core
// (../core/notes.js and ../core/panel.js); this file only puts that on the
// page and passes on what the person does. A key typed with the keyboard in
// the video's page while a Note is being written is typed into the open field
// here too (`typed`), since the browser types only where the keyboard is.
//
// A Note is drawn by `drawNote`, which knows nothing of the Transcript's
// lines. Between the lines, a Note is an element of its own after its line's
// element, never inside it: the inside of a line belongs to the Highlights
// (panel-highlights.js) and the line itself to the following (follow-playback.js).

import { COLOURS, colourOf } from '../core/highlights.js';
import { clockTime } from '../core/notes.js';
import { typeKey } from '../core/typing.js';

const make = (tag, className, text) => {
  const made = document.createElement(tag);
  made.className = className;
  if (text != null) made.textContent = text;
  return made;
};

/**
 * Draws one Note: its time, which a click jumps to, what it says, and a ×
 * that deletes it. A Note on a Highlight carries its Highlight's id as
 * `data-on-highlight`, and a Note at a Moment its own as `data-note`; the time
 * is on `.note-time`, in seconds, as `data-time`.
 * @param {import('../core/notes.js').ShownNote} note
 * @param {{ colour?: string }} [more]  The colour of the Highlight it is on, when that is not the default.
 * @returns {HTMLElement}
 */
export function drawNote(note, { colour } = {}) {
  const drawn = make('div', `note ${note.highlight ? 'on-highlight' : 'at-moment'}`);
  if (note.highlight) drawn.dataset.onHighlight = note.highlight;
  else drawn.dataset.note = note.note;
  if (colour) drawn.dataset.colour = colour;

  const time = make('button', 'note-time', clockTime(note.time));
  time.type = 'button';
  time.dataset.time = note.time;
  time.title = 'Jump to this time';
  const remove = make('button', 'note-delete', '×');
  remove.type = 'button';
  remove.title = 'Delete this Note';
  remove.setAttribute('aria-label', 'Delete this Note');
  drawn.append(time, make('span', 'note-text', note.text), remove);
  return drawn;
}

/**
 * @param {object} given
 * @param {HTMLElement} given.lines         Holds the Transcript's lines, the `.sentence` elements. The Notes are drawn between them.
 * @param {HTMLElement} given.box           The box docked at the bottom, in which a Note at a Moment is written.
 * @param {HTMLElement} given.highlightBox  The box that opens for a Highlight, which holds that Highlight's Note.
 * @param {HTMLInputElement} given.pauseOption  The "Pause the video while I write a Note" checkbox.
 * @param {(seconds: number) => void} given.jumpTo  Moves the video to a time.
 * @param {() => void} given.moved          Called when Notes were drawn or taken away between the lines, so the lines have moved.
 */
export function notesOnPage({ lines, box, highlightBox, pauseOption, jumpTo, moved }) {
  const composer = box.querySelector('#write-note');
  const editor = box.querySelector('#note-editor');
  const head = box.querySelector('#note-at');
  const atMoment = box.querySelector('#note-text');
  const onHighlight = highlightBox.querySelector('#highlight-note');

  let transcript = null; // the Transcript whose lines the Notes are drawn between
  let notesAfter = null; // the Notes drawn now, as the core gave them
  let writing = null; // the Note at a Moment whose box is open
  let openId = null; // the Highlight whose box is open
  let openText = ''; // and the Note it had when its field was last filled

  /** Puts keyboard focus in a field, after what is written in it. The page stays where it is. */
  const writeIn = (field) => {
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  };
  // A field gives the keyboard up as its box shuts. Chrome takes it from a hidden field only a
  // moment later, and a key pressed in that moment, an N straight after Escape say, would still
  // be the field's and not the panel's (panel-keys.js).
  const leave = (field) => field.blur();

  // Who is told what the person does (see `listenFor`), and the two things a field's keys can ask of it.
  let panel = null;
  const save = (field) => panel.saveNote(field.value).catch(console.error);
  const cancel = () => panel.cancelNote().catch(console.error);

  /** Draws the Notes between the lines: after its line each, and before the first line those that come before anything is said. */
  function showBetweenLines(shown, shownAfter, highlights) {
    if (shown === transcript && shownAfter === notesAfter) return;
    // On another Transcript side-panel.js has built the lines again, and the Notes went with the old ones.
    const taken = lines.querySelectorAll(':scope > .note');
    for (const drawn of taken) drawn.remove();
    [transcript, notesAfter] = [shown, shownAfter];
    const lineElements = lines.querySelectorAll('.sentence');
    // A Note on a Highlight is edged in its Highlight's colour, named only when that is not the default.
    const colourOn = (note) => {
      const highlight = note.highlight && highlights.find((each) => each.id === note.highlight);
      return highlight && colourOf(highlight) !== COLOURS[0] ? { colour: colourOf(highlight) } : {};
    };
    for (const [after, notes] of shownAfter) {
      const drawn = notes.map((note) => drawNote(note, colourOn(note)));
      if (after < 0) lines.prepend(...drawn);
      else lineElements[after]?.after(...drawn);
    }
    if (taken.length || shownAfter.size) moved();
  }

  /** The docked box: an offer to write a Note at this Moment, or the Note being written. A Highlight's own box takes its place. */
  function showBox(video, open, shownWriting) {
    box.hidden = !video || !!open;
    composer.hidden = !!shownWriting;
    editor.hidden = !shownWriting;
    if (shownWriting === writing) return;
    writing = shownWriting;
    if (!writing) return leave(atMoment);
    head.textContent = `Note at ${clockTime(writing.time)}`;
    atMoment.value = '';
    writeIn(atMoment);
  }

  /** The Note field of the box that opens for a Highlight: filled with the Note it has, and ready to be written in. */
  function showOnHighlight(open) {
    const id = open?.id ?? null;
    const text = open?.note?.text ?? '';
    if (id === openId && text === openText) return;
    const opened = id !== openId;
    [openId, openText] = [id, text];
    if (!open) return leave(onHighlight);
    onHighlight.value = text;
    if (opened) writeIn(onHighlight);
  }

  // "Back to now" sits above whichever box is docked, however tall that is.
  const dock = () => {
    const docked = [highlightBox, box].find((each) => !each.hidden);
    document.body.style.setProperty('--docked', `${docked ? docked.offsetHeight : 0}px`);
  };
  const resized = new ResizeObserver(dock);
  resized.observe(box);
  resized.observe(highlightBox);

  return {
    /** Puts what the core shows of Notes on the page. Call after the lines and their Highlights are on it. */
    show({ video, transcript: shown, highlights, notesAfter: shownAfter, open, writing: shownWriting, pauseWhileWriting }) {
      showBetweenLines(shown, shownAfter, highlights);
      showBox(video, open, shownWriting);
      showOnHighlight(open);
      pauseOption.checked = pauseWhileWriting;
      dock();
    },

    /**
     * A key typed with the keyboard in the video's page while a Note is being written (panel-typing.js).
     * It does in the open field what it would have done typed there, which the core says (../core/typing.js):
     * a character goes in at the caret, Backspace takes one off, Enter saves and Escape cancels. The
     * field does not have the keyboard, so the browser does none of that by itself. With no box open
     * the key is dropped: the Note it was for has just been saved or cancelled.
     * @param {{ key: string, shift: boolean }} typed  The key as a keyboard event names it, and whether Shift was held.
     */
    typed({ key, shift }) {
      const field = writing ? atMoment : openId ? onHighlight : null;
      if (!field || !panel) return;
      const does = typeKey({ text: field.value, start: field.selectionStart, end: field.selectionEnd }, key, { shift });
      if (does === 'save') return save(field);
      if (does === 'cancel') return cancel();
      if (!does) return;
      field.value = does.text;
      field.setSelectionRange(does.caret, does.caret);
      // A field scrolls to its caret only for typing of its own. This keeps the end of a long Note in view.
      if (does.caret === does.text.length) field.scrollTop = field.scrollHeight;
    },

    /**
     * Passes on what the person does to the panel (see createPanel in ../core/panel.js).
     * @param {{ keyPressed: Function, saveNote: Function, cancelNote: Function, removeNote: Function, removeNoteOn: Function, openHighlight: Function, setPauseWhileWriting: Function }} listener  The panel.
     */
    listenFor(listener) {
      panel = listener;
      // In either field, Enter saves what is written and Escape cancels. Shift with Enter starts a new line.
      for (const field of [atMoment, onHighlight]) {
        field.addEventListener('keydown', (event) => {
          if (event.isComposing) return; // a key that only picks a character, as some keyboards need
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            save(field);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        });
      }
      // A click on the offer is N.
      composer.addEventListener('click', () => panel.keyPressed('n').catch(console.error));

      lines.addEventListener('click', (event) => {
        const drawn = event.target.closest('.note');
        if (!drawn) return;
        const { onHighlight: highlightId, note: noteId } = drawn.dataset;
        if (event.target.closest('.note-time')) jumpTo(Number(event.target.closest('.note-time').dataset.time));
        else if (event.target.closest('.note-delete')) (highlightId ? panel.removeNoteOn(highlightId) : panel.removeNote(noteId)).catch(console.error);
        // A click on what a Highlight's Note says opens that Highlight, where the Note can be changed.
        else if (highlightId) panel.openHighlight(highlightId);
      });

      pauseOption.addEventListener('change', () => {
        panel.setPauseWhileWriting(pauseOption.checked).catch(console.error);
        // A checkbox is a field as far as the keys go (panel-keys.js), so focus does not stay on it.
        pauseOption.blur();
      });
    },
  };
}
