// Typing a Note with the keyboard still in the video's page: the panel's half.
//
// N pressed in the video's page opens the Note's box here, in the panel, but
// the keyboard stays with the page. Chrome gives an extension no way to move
// it, and a person's next keys go on arriving there, where K, M, F and the
// space bar are YouTube's own (seen by hand, 2026-10-07). So for as long as a
// Note is being written the panel holds a connection open to the page script
// (youtube-page.js). While it is open, the page script hands over every key
// that types and keeps it from YouTube, and this file gives each one to
// whoever types it into the open box (panel-notes.js).
//
// The connection is the whole of what the page knows. Open: a Note is being
// written. Closed: none is. This file closes it when the box shuts, and
// Chrome closes it when this page goes, however it goes, so the page cannot
// be left keeping keys with no panel to hand them to. Nothing is sent over it
// but keys, from the page to the panel.
//
// With the keyboard in the box itself, after a click in it, no key reaches
// the page, so nothing comes over the connection and the typing is the
// browser's own. A key reaches one of the two and never both.

/** The name of that connection. The page script has it again, since it cannot import; a test holds the two together. */
export const WRITING = 'writing-a-note';

/** Opens that connection to the page script in a tab, as `typingFromPage` asks for it. */
export const connectTo = (tabId) => () => chrome.tabs.connect(tabId, { name: WRITING });

/**
 * @param {object} given
 * @param {() => chrome.runtime.Port} given.connect  Opens a connection to the page script in the panel's tab (`connectTo`).
 * @param {(key: { key: string, shift: boolean }) => void} given.typed
 *   Called with each key the page script hands over: the key as a keyboard event names it, and whether Shift was held.
 */
export function typingFromPage({ connect, typed }) {
  let connection = null;

  function open() {
    const opened = connect();
    connection = opened;
    opened.onMessage.addListener((key) => typed(key));
    // The page's end has gone: the page was loaded again, or the tab has no page script, as one
    // loaded before the extension was. The next showing opens another.
    opened.onDisconnect.addListener(() => {
      void globalThis.chrome?.runtime?.lastError; // Chrome wants its reason looked at, and there is nothing to do about it
      if (connection === opened) connection = null;
    });
  }

  return {
    /**
     * Call with what the core shows, each time it changes (see createPanel in ../core/panel.js). A Note
     * is being written while a Note at a Moment is (`writing`), and while a Highlight's box is open
     * (`open`), since that is where the Note on a Highlight is written.
     */
    show({ writing, open: openHighlight }) {
      const beingWritten = !!(writing || openHighlight);
      if (beingWritten && !connection) open();
      else if (!beingWritten && connection) {
        connection.disconnect();
        connection = null;
      }
    },
  };
}
