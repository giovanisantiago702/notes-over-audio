// The export on the panel's page: the button that copies the video's
// Highlights and Notes to the clipboard as Markdown, and the "Include the full
// transcript" checkbox beside it. What is copied is written in the core
// (../core/markdown.js), from what the panel shows; this file only asks for
// it, copies it and says that it did.
//
// The clipboard needs no permission: a page may write to it when the person
// has just clicked in it, and the click on the button is that click. Nothing
// here reads the clipboard.

import { markdownOf } from '../core/markdown.js';

// How long the button says what happened before it offers to copy again.
const SAYS_FOR_MS = 2000;

/**
 * @param {object} given
 * @param {HTMLElement} given.strip  The strip at the top of the panel that holds the button and the checkbox.
 * @param {import('../core/markdown.js').LinkTo} given.linkTo  Makes the link to the video, and to a time in it.
 */
export function exportOnPage({ strip, linkTo }) {
  const button = strip.querySelector('#copy-markdown');
  const option = strip.querySelector('#include-transcript');
  const offer = button.textContent;

  let shown = null; // what the panel shows now
  let ticked = false; // what the person last chose, kept while the checkbox cannot be used
  let saying = 0;
  /** The button says what happened, and then offers to copy again. */
  const say = (what) => {
    button.textContent = what;
    clearTimeout(saying);
    saying = setTimeout(() => (button.textContent = offer), SAYS_FOR_MS);
  };

  button.addEventListener('click', async () => {
    if (!shown?.video) return;
    const markdown = markdownOf(shown, { withTranscript: option.checked, linkTo });
    try {
      await navigator.clipboard.writeText(markdown);
      say('Copied');
    } catch (error) {
      console.error(error);
      say('Could not copy');
    }
  });
  option.addEventListener('change', () => {
    ticked = option.checked;
    // A checkbox is a field as far as the keys go (panel-keys.js), so focus does not stay on it.
    option.blur();
  });

  return {
    /** Takes what the core shows. The full Transcript can be asked for only while one is on show. */
    show(state) {
      shown = state;
      strip.hidden = !state.video;
      const transcriptOnShow = state.transcript?.status === 'ready';
      option.disabled = !transcriptOnShow;
      option.checked = ticked && transcriptOnShow;
    },
  };
}
