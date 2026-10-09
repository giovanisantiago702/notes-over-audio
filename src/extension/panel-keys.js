// The panel's keys, on the panel's page. A key is pressed with keyboard focus
// in the panel, where this page hears it itself, or with focus in the video's
// page, whose script passes it on (youtube-page.js). Either way it is handed
// to the core, which decides what it does and which keys it takes
// (../core/keys.js). With the panel closed there is no core, and a key
// pressed in the page does nothing.
//
// While a Note is being written, the page passes on what is typed there
// another way, and none of it comes through here: an h, an n or a u typed
// into a Note is a letter, in the page as in the panel (panel-typing.js).

// A key typed into a text field is the text's.
const typingIn = (element) => !!element?.isContentEditable || !!element?.closest?.('input, textarea, select');

/**
 * @param {object} given
 * @param {number} given.tabId  The tab the panel sits beside.
 * @param {string[]} given.keys  The letters the core takes, in lower case (`keys` of the panel in ../core/panel.js).
 * @param {(key: string) => void} given.pressed  Called with each key pressed, as a keyboard event names it: "h", "H", "Enter".
 */
export function listenForKeys({ tabId, keys, pressed }) {
  document.addEventListener('keydown', (event) => {
    // A key held down counts once, and with Ctrl, Alt or Command it is another key.
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || typingIn(event.target)) return;
    // A key the core takes types nothing here. N opens a field and puts the keyboard in it at once,
    // and without this its own "n" would be the first letter of the Note. This is the panel's own
    // page: the key was never on its way to YouTube, and a key pressed in the video's page is not touched.
    if (keys.includes(String(event.key).toLowerCase())) event.preventDefault();
    pressed(event.key);
  });
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'key-pressed' && sender.tab?.id === tabId) pressed(message.key);
  });
}
