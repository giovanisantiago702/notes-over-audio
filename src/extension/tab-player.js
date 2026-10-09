// The real player, as the panel holds it. Each of its answers is a question
// sent to the page script in the panel's tab (youtube-page.js), which answers
// from YouTube's page. The messages go straight from the panel to the
// page, so the background worker is not woken by them.

/**
 * Asks the page script in a tab, and gives its answer. No answer (null) means
 * no page script: the tab is not on YouTube, or it was already open when the
 * extension was loaded and has not been reloaded.
 * @param {number} tabId
 * @returns {(message: { type: string }) => Promise<any>}
 */
export const askPageIn = (tabId) => (message) => chrome.tabs.sendMessage(tabId, message).catch(() => null);

/**
 * @param {number} tabId  The tab the panel sits beside.
 * @returns {import('../core/panel.js').Player}
 */
export function createTabPlayer(tabId) {
  const ask = askPageIn(tabId);

  return {
    video: () => ask({ type: 'which-video' }),
    currentTime: () => ask({ type: 'current-time' }),
    seekTo: async (seconds) => {
      await ask({ type: 'seek-to', seconds });
    },
    playing: async () => (await ask({ type: 'is-playing' })) === true,
    pause: async () => {
      await ask({ type: 'pause' });
    },
    play: async () => {
      await ask({ type: 'play' });
    },
  };
}

/**
 * Calls back whenever the tab's page says its video changed, to none included.
 * `loaded` is whether a page loaded afresh is saying so, a reload included: it
 * is true for the first thing a page says and for nothing after it.
 * @param {number} tabId
 * @param {(said: { loaded: boolean }) => void} callback
 */
export function onVideoChanged(tabId, callback) {
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'video-changed' && sender.tab?.id === tabId) callback({ loaded: message.loaded === true });
  });
}
