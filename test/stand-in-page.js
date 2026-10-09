// A YouTube page for the tests of the page script (src/extension/youtube-page.js):
// it has what that script reads of the page and asks of Chrome, from memory.
// The page script is a plain script and cannot be imported, so the stand-in
// runs the file itself, as Chrome does at every load of the page.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const pageScript = readFileSync(new URL('../src/extension/youtube-page.js', import.meta.url), 'utf8');

/** The address of a video's watch page. */
export const watchPage = (id) => `https://www.youtube.com/watch?v=${id}`;

/** Where a key is on the keyboard, as a keyboard event says it: the same for a letter and its capital. */
const placeOf = (key) => (/^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : /^\d$/.test(key) ? `Digit${key}` : key === ' ' ? 'Space' : key);

/**
 * @param {object} [given]
 * @param {string} [given.address]  Where the tab is.
 */
export function standInPage({ address = 'https://www.youtube.com/' } = {}) {
  let at = new URL(address);
  let description = null; // the block of JSON in which YouTube describes a watch page's video, as text
  let everyQuarterSecond = []; // what the page script does four times a second
  let onWindow = []; // who listens for keys on the window, on a key's way down into the page, in the order they began to
  let onConnect = []; // who in the page hears a connection opened to it
  const connections = new Set(); // the connections open to the page
  const said = [];
  const youTubeHeard = [];
  const tookEffect = [];

  /** A key event goes to everyone listening on the window, in order, until one of them stops it there. */
  function send(type, key, { shift = false, ctrl = false, alt = false, meta = false, repeat = false, composing = false, on = page.player } = {}) {
    let stopped = false;
    const event = {
      type,
      key,
      code: placeOf(key),
      repeat,
      shiftKey: shift,
      ctrlKey: ctrl,
      altKey: alt,
      metaKey: meta,
      isComposing: composing,
      defaultPrevented: false,
      target: on,
      composedPath: () => [on],
      preventDefault() {
        event.defaultPrevented = true;
      },
      // Stopping a key's way onward does not keep it from the others who listen at the same stop.
      stopPropagation() {},
      stopImmediatePropagation() {
        stopped = true;
      },
    };
    for (const each of onWindow.filter((one) => one.type === type)) {
      if (!stopped) each.listener(event);
    }
    if (!event.defaultPrevented) tookEffect.push(`${key} ${type === 'keydown' ? 'down' : 'up'}`);
  }

  const page = {
    /** Everything the page script has said to the extension with `chrome.runtime.sendMessage`, in order. */
    said,
    /**
     * Every key that reached YouTube's own handlers, in order: "k down", "k up", and with ", cancelled"
     * when what the key does by itself in the page had been called off by then.
     */
    youTubeHeard,
    /**
     * Every key that went on to do what a key does by itself in a page, such as scrolling it or
     * pressing the button that has focus: one that nobody had called that off for. As "k down", "k up".
     */
    tookEffect,

    // Where a key can be pressed: on YouTube's player, which is where keyboard focus is while a video
    // is watched; in its search box; and in a field edited in place, as a comment is.
    player: { isContentEditable: false, closest: () => null },
    searchBox: { isContentEditable: false, closest: (selectors) => (selectors.split(',').some((one) => one.trim() === 'input') ? page.searchBox : null) },
    comment: { isContentEditable: true, closest: () => null },

    // What a test does to it, as a person or YouTube would.
    /** Loads the page, or loads it again: Chrome runs the page script afresh, in a page that has forgotten everything. */
    load(to = at.href) {
      at = new URL(to);
      description = null;
      everyQuarterSecond = [];
      onWindow = [];
      onConnect = [];
      // The page that was there is gone, and every connection to it with it.
      for (const connection of [...connections]) connections.delete(connection) && connection.pageWent();
      const world = {
        location: { get pathname() { return at.pathname; }, get search() { return at.search; }, get href() { return at.href; } },
        document: {
          querySelector: (selector) => (selector.startsWith('#microformat') && description !== null ? { textContent: description } : null),
          addEventListener() {},
          dispatchEvent() {},
        },
        chrome: {
          runtime: {
            sendMessage: (message) => (said.push(structuredClone(message)), Promise.resolve()),
            onMessage: { addListener() {} },
            onConnect: { addListener: (listener) => onConnect.push(listener) },
          },
        },
        // A key is heard here on its way down into the page. Anything else the window is listened to for has no way to go.
        addEventListener: (type, listener, how) => (how === true || how?.capture === true || !type.startsWith('key')) && onWindow.push({ type, listener }),
        setInterval: (run) => everyQuarterSecond.push(run),
        clearInterval() {},
        setTimeout,
        clearTimeout,
        URL,
        URLSearchParams,
      };
      world.window = world;
      vm.runInNewContext(pageScript, world);
      // YouTube's own handlers. Chrome runs the page script before any script of the page's, so they
      // come after it; the nearest they can stand to it is the same stop on a key's way, which is here.
      for (const [type, way] of [['keydown', 'down'], ['keyup', 'up']]) {
        onWindow.push({ type, listener: (event) => youTubeHeard.push(`${event.key} ${way}${event.defaultPrevented ? ', cancelled' : ''}`) });
      }
    },
    /** YouTube writes the block that describes a video, which is where the page script reads its title and channel. */
    describe({ id, title, channel }) {
      description = JSON.stringify({ '@id': watchPage(id), name: title, author: channel });
    },
    /** The tab moves to another address with no page load, as YouTube moves from one video to the next. */
    moveTo(to) {
      at = new URL(to);
    },
    /** A quarter of a second passes. */
    later() {
      for (const run of everyQuarterSecond) run();
    },

    /**
     * A key goes down with keyboard focus in the page. `how` is what is held with it (`shift`, `ctrl`,
     * `alt`, `meta`), whether it is the key repeating because it is held down (`repeat`) or one that
     * only picks a character (`composing`), and where focus is (`on`): the player unless told otherwise.
     */
    press: (key, how) => send('keydown', key, how),
    /** And comes up again. */
    release: (key, how) => send('keyup', key, how),
    /** The keyboard leaves the page: for the panel after a click in it, or for another window. A key that is down then comes up somewhere else. */
    loseKeyboard() {
      for (const each of onWindow.filter((one) => one.type === 'blur')) each.listener({ type: 'blur' });
    },
    /** A key is pressed and let go. */
    strike(key, how) {
      page.press(key, how);
      page.release(key, how);
    },
    /** Each character of a text is pressed and let go, in turn. */
    type(text, how) {
      for (const key of text) page.strike(key, how);
    },

    /**
     * The panel opens a connection to the page script, as `chrome.tabs.connect(tabId, { name })` does.
     * Gives the panel's end of it, as Chrome does: `onMessage`, `onDisconnect` and `disconnect()`.
     * `disconnect()` is the panel closing it, and also the panel going, however it goes, since Chrome
     * tells the page script the same thing either way. The panel's end is told when the page goes,
     * as it does at every load. For a test it also has `heard`, everything the page script has sent
     * over it; `goUntold()`, the connection gone before the page script has been told; and `refused`,
     * how many times the page script tried to send over it after it had closed, which Chrome refuses.
     */
    connect(name) {
      const [toldPanel, toldPage, messagesToPanel] = [[], [], []];
      const panelsEnd = {
        name,
        heard: [],
        refused: 0,
        onMessage: { addListener: (listener) => messagesToPanel.push(listener) },
        onDisconnect: { addListener: (listener) => toldPanel.push(listener) },
        disconnect() {
          if (!connections.delete(connection)) return;
          for (const listener of toldPage) listener(pagesEnd);
        },
        goUntold() {
          connections.delete(connection);
        },
      };
      const pagesEnd = {
        name,
        onMessage: { addListener() {} },
        onDisconnect: { addListener: (listener) => toldPage.push(listener) },
        postMessage(message) {
          if (!connections.has(connection)) {
            panelsEnd.refused += 1;
            throw new Error('Attempting to use a disconnected port object');
          }
          panelsEnd.heard.push(structuredClone(message));
          for (const listener of messagesToPanel) listener(structuredClone(message), panelsEnd);
        },
      };
      const connection = { pageWent: () => toldPanel.forEach((listener) => listener(panelsEnd)) };
      connections.add(connection);
      // With nobody in the page to hear it, as in a tab loaded before the extension was, Chrome closes it at once.
      if (!onConnect.length) queueMicrotask(() => connections.delete(connection) && connection.pageWent());
      for (const listener of onConnect) listener(pagesEnd);
      return panelsEnd;
    },
  };
  return page;
}
