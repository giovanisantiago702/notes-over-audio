// Highlights on the panel's page: the marks inside the lines, the selection
// that makes one, and the box that opens when one is clicked. Which words are
// marked and which Highlight is open are decided in the core
// (../core/highlights.js and ../core/panel.js); this file only puts that on
// the page and passes on what the person does.
//
// It owns the inside of a line and nothing of the line itself. When a line's
// marks change, the line's own element stays, with its classes, and so do its
// word elements: they are moved into the marks, not made again.

import { colourOf } from '../core/highlights.js';

/**
 * @param {object} given
 * @param {HTMLElement} given.lines  Holds the Transcript's lines: `.sentence` elements of `.word` elements.
 * @param {HTMLElement} given.box    The box that opens for a Highlight.
 */
export function highlightsOnPage({ lines, box }) {
  let transcript = null; // the Transcript whose lines are on the page
  let marks = new Map(); // the marks those lines hold now, as the core gave them
  let wordElements = []; // every word's element, by the word's place in the Transcript's `words`
  let openId = null;

  /** Fills one line's element with its parts: words, the spaces between them, and marks around some of them. */
  function fill(line, parts) {
    const put = (into, parts) => {
      for (const part of parts) {
        if (part === ' ') into.append(' ');
        else if (typeof part === 'number') into.append(wordElements[part]);
        else {
          const mark = document.createElement('mark');
          mark.dataset.highlight = part.highlight;
          if (part.colour) mark.dataset.colour = part.colour; // a mark that names none is in the default
          put(mark, part.parts);
          into.append(mark);
        }
      }
    };
    const inside = document.createDocumentFragment();
    put(inside, parts);
    line.replaceChildren(inside);
  }
  /** A line with no mark in it: its words with a space between them. */
  const unmarked = (sentence) => Array.from({ length: sentence.last - sentence.first + 1 }, (_, i) => (i ? [' ', sentence.first + i] : [sentence.first])).flat();

  /** Puts the marks on the lines. Only a line whose marks have changed is touched. */
  function showMarks(shown, shownMarks) {
    if (shown !== transcript) {
      // side-panel.js has built the lines again for another Transcript, with no marks.
      transcript = shown;
      marks = new Map();
      wordElements = [...lines.querySelectorAll('.word')];
    }
    if (shownMarks === marks) return false;
    const lineElements = lines.querySelectorAll('.sentence');
    for (const at of new Set([...marks.keys(), ...shownMarks.keys()])) {
      fill(lineElements[at], shownMarks.get(at) ?? unmarked(transcript.sentences[at]));
    }
    marks = shownMarks;
    return true;
  }

  /** Opens the box for a Highlight, or shuts it. The open Highlight's marks are outlined. */
  function showOpen(open, marksChanged) {
    box.hidden = !open;
    box.querySelector('#highlight-words').textContent = open?.words ?? '';
    // Of the colours the box offers, the one the open Highlight is in is the one pressed.
    for (const choice of box.querySelectorAll('#highlight-colours button')) choice.setAttribute('aria-pressed', String(!!open && choice.dataset.colour === colourOf(open)));
    if (!marksChanged && (open?.id ?? null) === openId) return;
    openId = open?.id ?? null;
    for (const mark of lines.querySelectorAll('mark[data-highlight]')) mark.classList.toggle('open', mark.dataset.highlight === openId);
  }

  /**
   * The words the selection takes in: the places of the first and the last
   * in the Transcript's `words`, or null. A word counts when any of its
   * characters is selected. The selection must start and end in the lines: a
   * drag that ends on the box below them would otherwise take in every line
   * between, down to the last.
   */
  function selectedWords() {
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    if (!lines.contains(selection.anchorNode) || !lines.contains(selection.focusNode)) return null;
    const selected = selection.getRangeAt(0);
    const ofWord = document.createRange();
    let first = -1;
    let last = -1;
    for (let place = 0; place < wordElements.length; place += 1) {
      ofWord.selectNodeContents(wordElements[place].firstChild); // its text, so that touching the word's edge is not selecting it
      if (selected.compareBoundaryPoints(Range.END_TO_START, ofWord) >= 0) continue; // the selection starts after this word
      if (selected.compareBoundaryPoints(Range.START_TO_END, ofWord) <= 0) break; // and ends before this one
      if (first < 0) first = place;
      last = place;
    }
    return first < 0 ? null : [first, last];
  }

  return {
    /** Puts what the core shows of Highlights on the page. Call after the lines themselves are on it. */
    show({ transcript: shown, marks: shownMarks, open }) {
      showOpen(open, showMarks(shown, shownMarks));
    },

    /**
     * Passes on what the person does to the panel (see createPanel in ../core/panel.js).
     * @param {{ highlight: Function, openHighlight: Function, closeHighlight: Function, removeHighlight: Function, colourHighlight: Function }} panel
     */
    listenFor(panel) {
      // A click often slips a pixel or two between the press and the release,
      // and that much selects a letter. So a press that moves less than this
      // far is a click and not a selection. Twice in a row it is a
      // double-click, which selects a word and means to.
      const DRAG_PX = 5;
      let pressedAt = null;
      let selecting = false; // whether the last mouse-up made a Highlight, so that the click it ends with is not a click on anything
      document.addEventListener('mousedown', (event) => {
        if (event.button === 0) pressedAt = { x: event.pageX, y: event.pageY };
      });

      // Selecting words and letting go makes a Highlight of them, with no further step.
      document.addEventListener('mouseup', (event) => {
        if (event.button !== 0) return;
        const slipped = event.detail < 2 && !event.shiftKey && !!pressedAt && Math.hypot(event.pageX - pressedAt.x, event.pageY - pressedAt.y) < DRAG_PX;
        const selected = slipped ? null : selectedWords();
        selecting = !!selected;
        if (!selected) return;
        // The selection is cleared only once this mouse-up and the click that
        // follows it are over. Until then it is how every other listener on
        // the page can tell that this was a selection and not a click.
        setTimeout(() => {
          getSelection().removeAllRanges();
          panel.highlight(...selected).catch(console.error);
        });
      });

      // A click on a mark opens its Highlight. Of two that share the word clicked, the inner one.
      lines.addEventListener('click', (event) => {
        if (selecting) return; // the end of a selection, not a click
        const mark = event.target.closest('mark[data-highlight]');
        if (mark) panel.openHighlight(mark.dataset.highlight);
      });

      box.querySelector('#remove-highlight').addEventListener('click', () => {
        if (openId) panel.removeHighlight(openId).catch(console.error);
      });
      box.querySelector('#close-highlight').addEventListener('click', () => panel.closeHighlight());
      // A click on one of the colours gives it to the open Highlight. The box stays open.
      box.querySelector('#highlight-colours').addEventListener('click', (event) => {
        const colour = event.target.closest('button')?.dataset.colour;
        if (openId && colour) panel.colourHighlight(openId, colour).catch(console.error);
      });
    },
  };
}
