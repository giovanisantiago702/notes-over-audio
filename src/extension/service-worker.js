// The background worker decides one thing: which tabs have the side panel.
// Chrome gives a side panel to a tab, never to an address, so a tab gets the
// panel while it is on a video and loses it when it leaves.
//
// The worker is not on the way between the panel and the page; they talk
// directly (tab-player.js). Chrome stops this worker whenever it is idle, so
// it keeps nothing in memory.

const PANEL_PAGE = 'extension/side-panel.html';

// A click on the toolbar icon opens the panel, on a tab that has one.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/** Gives the tab the panel if it is on a video, and takes it away if not. */
function scopePanel(tabId, video) {
  // Chrome does not tell a panel which tab it sits beside, so its address
  // does. The address must not change with the video: Chrome would load the
  // panel afresh.
  const options = video ? { tabId, path: `${PANEL_PAGE}?tabId=${tabId}`, enabled: true } : { tabId, enabled: false };
  return chrome.sidePanel.setOptions(options).catch(() => {}); // the tab has closed
}

// The page says whenever its video changes, to none included (youtube-page.js).
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'video-changed' && sender.tab) scopePanel(sender.tab.id, message.video);
});

// A tab that loads another site has no page script left to say it went, so
// every tab that finishes loading is asked. No answer means no video.
chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  if (change.status !== 'complete') return;
  const video = await chrome.tabs.sendMessage(tabId, { type: 'which-video' }).catch(() => null);
  scopePanel(tabId, video);
});
