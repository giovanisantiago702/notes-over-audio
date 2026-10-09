// Loads the built folder in Playwright's Chromium, opens a real YouTube watch
// page, and checks the extension there, in Chrome's real side panel. It needs
// the network, and YouTube as it is today, so it is not part of `npm test`.
//
//   npm run check:browser                        builds dist/, then runs this
//   node scripts/check-in-browser.js --headed    shows the browser while it runs
//   node scripts/check-in-browser.js <folder>    checks that folder instead of dist/,
//                                                such as the one unzipped from the zip
//
// How it reaches the panel: the DevTools protocol runs the extension's toolbar
// action (Extensions.triggerAction, in Chromium 149 and later), which is what a
// click on the icon does. Chrome then lists the panel among the extension's
// contexts, and a page of the extension can read the panel's document.
//
// The Transcript. In this browser (Playwright's Chromium, logged out, driven
// by a script) YouTube has answered every request for captions with HTTP 200
// and an empty body: the extension's request, which carries the player's
// token, and the player's own. Which of those three things YouTube objects to
// is not known. So the check does two separate things, and says which is
// which as it goes:
//   - with YouTube answering for itself, it reports exactly what YouTube sent
//     and checks what the panel says about it;
//   - with YouTube's answer replaced by the captions recorded from the same
//     videos on 2026-10-07 (kept in test/captions), it checks everything
//     around the answer: the real player's list of captions and its token read
//     in the page, which captions are asked for, the wait for the token, and
//     the Transcript in the real side panel. That part does not show the
//     fetch working.
// YouTube puts adverts before some loads and not others. The player has no
// token until they are over, so a run is longer by the length of the adverts.
//
// Following playback. The video does play in this browser, but not for long:
// YouTube's player gets the first minute of a video and no more, and about
// 45 s after a load it stops with "Something went wrong". So everything that
// needs the video playing is done straight after a load, in two goes, one on
// each video that has a recorded Transcript, and nothing seeks past the first
// minute until the end. When the player has stopped all the same, the check
// says what it could NOT SHOW instead of calling it a failure.
// The side panel is a page Playwright does not hold, but the DevTools protocol
// reaches it, so the wheel, the clicks and the drag in the panel are real
// input, not events made up by a script.
//
// Highlights. That real input is how the check drags across words in the real
// side panel, clicks a Highlight and clicks "Remove highlight": Chrome
// hit-tests the protocol's mouse, selects with it and clicks with it as it
// does a hand's. The words it drags across are the recorded Transcript's. It
// then starts the browser again on the same profile and opens the video
// again, to see the Highlight that was left.
//
// H and U. The keys are the DevTools protocol's too, sent to the side panel's
// own target for a key pressed with keyboard focus in the panel, and to the
// watch page for one pressed with focus in the page, on YouTube's player or in
// its search box. The video is paused and put at a known time before a first
// H, so that which sentence was being said 1.2 s earlier is known from the
// recorded captions; one H is pressed while the video plays. The 5 s after a
// Highlight is made are waited out on the real clock, which adds about half a
// minute to a run. Whether Chrome sends a key to the panel or to the page
// when a person has clicked in one of them was seen by hand, in Chrome 151
// (ticket 09), and is not shown here.
//
// Colours. The same mouse clicks the three colours the box offers. What the
// check reads is what Chrome paints: the computed colour of each mark and of
// the words on it, with the panel in the light scheme and in the dark, which
// it sets on the panel as the system's setting would. It gives the contrast
// of the words on each colour. Whether three colours can be told apart at a
// glance is for a person's eyes; the check only shows that they differ.
//
// Notes. The same keys and the same mouse write them: N pressed in the panel
// and in the page, a Note typed a key at a time into the box docked at the
// bottom of the real side panel, Enter and Escape, a click on a Highlight, on
// a Note's time and on its ×, and a click on the "Pause the video while I
// write a Note" checkbox. One Note is typed while the video plays, on a load
// of its own, with the panel read between the keys to show that the
// Transcript goes on following above the box. In those parts the keys of a
// Note are sent to the panel, which is where they go once the box has been
// clicked. Where a finger's keys go after N is pressed with keyboard focus in
// the page, this browser cannot show: the protocol sends a key to whichever
// page the check names. A hand showed it: they stay with the page.
//
// Typing from the page. So a part near the end sends every key of a Note to
// the watch page instead, as a finger's go after N is pressed there, and
// reads the box in the panel: letters that are YouTube's own keys, the space
// bar, Backspace, Shift with Enter, Enter and Escape, at a Moment and on the
// Highlight just made. A listener of the check's own at the next stop on a
// key's way through the page says which keys the extension let through, and
// YouTube's player is read for what K, M and F did to it. The panel's page is
// loaded afresh with a Note open, and the panel is closed with one open, to
// see the page stop taking keys both times.
//
// No Transcript. Both ways of having none are real here, with nothing
// replaced: one of the videos has no captions at all, and YouTube sends this
// browser none for the others, so with the record not answering the fetch
// fails. The check reads the one line and the list under it, writes Notes
// there with N, clicks an entry and reads where the video went, presses H and
// drags across an entry as a hand does to select it, and opens and removes a
// Highlight from the list. It reads the panel all through each wait for a
// Transcript, to show the list under the waiting line. Then it lets the
// Transcript arrive for the same video, from the record, by sending the tab
// to another video and back, and reads the same marks in it. A Transcript
// that arrives because YouTube itself sent one is not shown, here as elsewhere.
//
// A reload tries again. Near the end, with the panel open on a fetch that has
// just failed, the watch page is reloaded four times, and the extension's own
// requests to YouTube for the captions are counted: one more for a reload
// after the failure, one for two reloads of which the second comes while the
// first one's fetch is under way, and none for a reload with the Transcript
// on show. In between, the page is made to name the same video again with no
// load, and no request may follow that either.
//
// Markdown export. The same mouse clicks "Copy as Markdown" in the real side
// panel, and what that click put on the clipboard is read back with a real
// paste key press in another page, one that is never the tab in front. It is
// compared with text written out here by hand from the recorded captions and
// from what the parts before left saved. Headless, this browser keeps a
// clipboard of its own: the machine's clipboard was seen untouched by it, on
// macOS. With --headed it is the machine's own clipboard that is written.
// The export with no Transcript on show is checked near the end, where the
// panel is opened afresh and YouTube answers for itself again.
//
// What is left for a person at a real Chrome: the click on the icon itself,
// a drag with a hand on a mouse or a trackpad, how the panel looks, Chrome
// proper instead of Playwright's Chromium, a Transcript that YouTube itself
// sent, how the following feels while a video is watched for longer than this
// browser plays one, and a real advert.

import { chromium } from 'playwright-core';
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = 'nekpkadhomgkgmkcnkljoejocdcjdmac';
const WARNING = 'Read and change your data on www.youtube.com';
const watchPage = (id) => `https://www.youtube.com/watch?v=${id}`;
const TALK = 'iG9CE55wbtY'; // 65 sets of captions: the uploader's in 64 languages, and auto-generated English
const DINNER = 'rddfPNBNAJs'; // auto-generated captions only
const NO_CAPTIONS = 'aqz-KE-bpKQ';
const WATCH_PAGE = watchPage(TALK);
const OTHER_SITE = 'https://example.com/';

// The captions YouTube sent for two of those videos on 2026-10-07, by video, kind and language.
const recordedCaptions = fileURLToPath(new URL('../test/captions', import.meta.url));
const RECORDED = {
  [`${TALK}||en`]: `${TALK}.manual.en.json3`,
  [`${TALK}|asr|en`]: `${TALK}.auto.en.json3`,
  [`${DINNER}|asr|en`]: `${DINNER}.auto.en.json3`,
};
// They are not kept in the repository: they are the words of two videos, and
// their makers'. The check answers for YouTube from them, so without them it
// does not start.
const notRecorded = Object.values(RECORDED).filter((file) => !existsSync(join(recordedCaptions, file)));
if (notRecorded.length > 0) {
  console.error(`The recorded captions are not in ${recordedCaptions}: ${notRecorded.join(', ')}.`);
  console.error('The check answers the extension from them in place of YouTube, and cannot run without them.');
  process.exit(1);
}
const WAITING_LINE = 'Getting the transcript…';
const NONE_LINE = 'This video has no transcript.';
const FAILED_LINE = 'The transcript could not be fetched.';
// Following playback: the line being spoken is held this far down the panel, as a share of its height.
const HELD_AT = 0.58;
// The panel asks the page the time four times a second, so it can be this many seconds behind the video.
const BEHIND = 0.6;

// The folder Chrome loads: dist/, or the folder named when the check is run. Chrome gives a folder's path with its links followed.
const named = process.argv.slice(2).find((given) => !given.startsWith('--'));
const dist = named ? realpathSync(resolve(named)) : fileURLToPath(new URL('../dist', import.meta.url));
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'notes-over-audio-check-')));
const headed = process.argv.includes('--headed');

let failures = 0;
const check = (passed, what, detail) => {
  console.log(`${passed ? ' ok ' : 'FAIL'}  ${what}${detail ? `\n        ${detail}` : ''}`);
  if (!passed) failures += 1;
};
/** Something seen that is neither right nor wrong. */
const note = (what, detail) => console.log(` --   ${what}${detail ? `\n        ${detail}` : ''}`);
let realFetch = 'not tried';
const notShown = []; // what needed the video playing, when YouTube's player had stopped
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until `read` gives something truthy and returns it, or null when time runs out. */
async function until(read, timeout = 20000) {
  const end = Date.now() + timeout;
  for (;;) {
    const value = await read().catch(() => null);
    if (value || Date.now() > end) return value || null;
    await pause(200);
  }
}

const launch = (folder) =>
  chromium.launchPersistentContext(join(scratch, 'profile'), {
    channel: 'chromium', // the full browser; its headless mode loads extensions
    headless: !headed,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${folder}`, `--load-extension=${folder}`, '--enable-unsafe-extension-debugging'],
  });

/** chrome://extensions, where Chrome says what it loaded and lists an extension's errors. */
const openExtensionsPage = async (context) => {
  const page = await context.newPage();
  await page.goto('chrome://extensions');
  // Chrome keeps an extension's errors only in developer mode with collection
  // switched on, and only from then on. So switch both on and load the
  // extension again; without this the list stays empty whatever goes wrong.
  await page.evaluate(async (id) => {
    const call = (name, ...given) => new Promise((done) => chrome.developerPrivate[name](...given, done));
    await call('updateProfileConfiguration', { inDeveloperMode: true });
    await call('updateExtensionConfiguration', { extensionId: id, errorCollection: true });
    await call('reload', id, { failQuietly: true });
  }, ID);
  await pause(2000);
  return page;
};
const asLoaded = async (extensionsPage) => {
  const all = await extensionsPage.evaluate(() => new Promise((done) => chrome.developerPrivate.getExtensionsInfo({}, done)));
  const info = all.find((extension) => extension.name === 'Notes over audio');
  return (
    info && {
      id: info.id,
      folder: info.path,
      state: info.state,
      manifestErrors: info.manifestErrors.map((error) => error.message),
      runtimeErrors: info.runtimeErrors.map((error) => error.message),
      installWarnings: info.installWarnings,
    }
  );
};
const noErrors = (loaded) => !loaded.manifestErrors.length && !loaded.runtimeErrors.length && !loaded.installWarnings.length;

/** A page of the extension's own in a tab, to call Chrome's extension functions from. */
const openHelperPage = async (context) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${ID}/extension/side-panel.html`);
  return page;
};

// What the watch page itself shows for its video: the yardstick for the panel.
const shownByYouTube = (page) =>
  page.evaluate(() => {
    const id = new URLSearchParams(location.search).get('v');
    const watch = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
    if (location.pathname !== '/watch' || !watch || watch.getAttribute('video-id') !== id) return null;
    const title = document.querySelector('ytd-watch-metadata h1')?.textContent.trim();
    const channel = document.querySelector('ytd-watch-metadata ytd-channel-name a')?.textContent.trim();
    return title && channel ? { id: `youtube:${id}`, title, channel } : null;
  });

// ------------------------------------------------------------------ Highlights
/** Whether two values hold the same things, whatever order their keys come in. Chrome's storage gives keys back sorted. */
const sameWhateverTheOrder = (a, b) => {
  const sorted = (value) =>
    Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])])) : value;
  return same(sorted(a), sorted(b));
};

/**
 * What a tab's side panel shows of Highlights, read from a page of the
 * extension's own. A line is written with each mark between « and », and only
 * the lines that hold a mark are given.
 */
const highlightsInPanel = (helper, tabId) =>
  helper.evaluate((tabId) => {
    const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
    if (!panel) return null;
    const doc = panel.document;
    const written = (node) => [...node.childNodes].map((child) => (child.nodeType === 1 && child.matches('mark[data-highlight]') ? `«${written(child)}»` : child.textContent)).join('');
    const box = doc.getElementById('highlight');
    const lines = [...doc.querySelectorAll('.sentence')];
    return {
      count: lines.length,
      lines: lines.filter((line) => line.querySelector('mark[data-highlight]')).map(written),
      ids: [...new Set([...doc.querySelectorAll('mark[data-highlight]')].map((mark) => mark.dataset.highlight))],
      open: box.hidden ? null : doc.getElementById('highlight-words').textContent,
      offers: box.hidden ? [] : [...box.querySelectorAll('button')].map((button) => button.textContent || button.title), // a colour has no words on it, only a name
      selected: panel.getSelection().toString().replace(/\s+/g, ' '),
      canSelect: lines[0] ? panel.getComputedStyle(lines[0]).userSelect : null,
    };
  }, tabId);

/**
 * What a tab's side panel shows of Notes, read from a page of the extension's
 * own. Each Note drawn between the lines comes with the line it follows and
 * that line's start. `box` is the docked box: null when a Highlight's box has
 * its place, "offer" while it offers to write a Note, and otherwise what it
 * says of the Note at a Moment being written. `docked` is whichever box is at
 * the bottom of the panel, as Chrome lays it out.
 */
const notesInPanel = (helper, tabId) =>
  helper.evaluate((tabId) => {
    const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
    if (!panel) return null;
    const doc = panel.document;
    const box = doc.getElementById('note-box');
    const editor = doc.getElementById('note-editor');
    const highlightBox = doc.getElementById('highlight');
    const lineBefore = (note) => {
      let before = note.previousElementSibling;
      while (before && !before.classList.contains('sentence')) before = before.previousElementSibling;
      return before;
    };
    const atBottom = [highlightBox, box].find((each) => !each.hidden);
    const laid = atBottom?.getBoundingClientRect();
    return {
      notes: [...doc.querySelectorAll('#transcript > .note')].map((note) => ({
        after: lineBefore(note)?.textContent ?? null,
        afterStart: lineBefore(note) ? Number(lineBefore(note).dataset.start) : null,
        time: note.querySelector('.note-time').textContent,
        seconds: Number(note.querySelector('.note-time').dataset.time),
        text: note.querySelector('.note-text').textContent,
        on: note.dataset.onHighlight ? 'a Highlight' : 'a Moment',
        colour: note.dataset.colour ?? null,
        edge: panel.getComputedStyle(note).borderLeftColor,
      })),
      box: box.hidden ? null : editor.hidden ? 'offer' : doc.getElementById('note-at').textContent,
      written: box.hidden || editor.hidden ? null : doc.getElementById('note-text').value,
      onHighlight: highlightBox.hidden ? null : doc.getElementById('highlight-note').value,
      focus: doc.activeElement?.id || doc.activeElement?.tagName,
      hasFocus: doc.hasFocus(),
      pauseTicked: doc.getElementById('pause-while-writing').checked,
      docked: laid ? { position: panel.getComputedStyle(atBottom).position, top: laid.top, gapBelow: panel.innerHeight - laid.bottom, width: laid.width, panelWidth: panel.innerWidth, panelHeight: panel.innerHeight } : null,
    };
  }, tabId);

/**
 * What a tab's side panel shows while it has no Transcript on show, read from
 * a page of the extension's own: the one line, and the list of what is saved.
 * Each entry comes as its time, a Highlight's saved words with the colour
 * Chrome paints them in, and its Note. `shown` is whether the list is on
 * show, `underTheLine` whether it is laid out below the line, and `lines` how
 * many lines of a Transcript the panel holds.
 */
const savedInPanel = (helper, tabId) =>
  helper.evaluate((tabId) => {
    const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
    if (!panel) return null;
    const doc = panel.document;
    const line = doc.getElementById('transcript-line');
    const list = doc.getElementById('saved');
    const transcript = doc.getElementById('transcript');
    return {
      title: doc.getElementById('title').textContent,
      line: line.hidden ? null : line.textContent,
      lines: transcript.hidden ? 0 : transcript.querySelectorAll('.sentence').length,
      shown: !list.hidden,
      underTheLine: !list.hidden && !line.hidden && list.getBoundingClientRect().top >= line.getBoundingClientRect().bottom,
      entries: [...list.querySelectorAll('.entry')].map((entry) => {
        const words = entry.querySelector('mark[data-highlight]');
        const note = entry.querySelector('.note');
        return {
          time: entry.querySelector('.entry-time').textContent,
          seconds: Number(entry.dataset.time),
          words: words?.textContent ?? null,
          colour: words?.dataset.colour ?? null,
          background: words ? panel.getComputedStyle(words).backgroundColor : null,
          open: !!words?.classList.contains('open'),
          note: note?.querySelector('.note-text').textContent ?? null,
          on: words ? 'a Highlight' : 'a Moment',
        };
      }),
      selected: panel.getSelection().toString(),
    };
  }, tabId);

/**
 * What a tab's side panel shows of the export, read from a page of the
 * extension's own: what the button says, the checkbox, and where the strip
 * that holds them sits, as Chrome lays it out.
 */
const exportInPanel = (helper, tabId) =>
  helper.evaluate((tabId) => {
    const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
    if (!panel) return null;
    const doc = panel.document;
    const strip = doc.getElementById('export');
    const option = doc.getElementById('include-transcript');
    const laid = strip.getBoundingClientRect();
    return {
      shown: !strip.hidden,
      says: doc.getElementById('copy-markdown').textContent,
      option: doc.querySelector('label[for="include-transcript"]').textContent,
      ticked: option.checked,
      canTick: !option.disabled,
      position: panel.getComputedStyle(strip).position,
      top: laid.top,
      width: laid.width,
      panelWidth: panel.innerWidth,
      scrolled: panel.scrollY,
      titleBottom: doc.getElementById('title').getBoundingClientRect().bottom,
    };
  }, tabId);

/**
 * A page to paste into, so that what is on the browser's clipboard can be
 * read as a person would read it: by pasting. It is opened before the watch
 * page and never brought to the front.
 */
const openClipboardReader = async (context) => {
  const page = await context.newPage();
  await page.setContent('<textarea id="pasted"></textarea>');
  return page;
};
/** What a paste gives in that page now: a real key press, Command or Control with V. */
const pasteIn = async (reader) => {
  await reader.evaluate(() => {
    const field = document.getElementById('pasted');
    field.value = '';
    field.focus();
  });
  await reader.keyboard.press('ControlOrMeta+V');
  return reader.inputValue('#pasted');
};

/**
 * The colours in a tab's side panel, as Chrome paints them: every mark's, the
 * choices the box offers, and the panel's own background. A mark's `colour` is
 * the name it carries, null for a mark that names none; `inside` is whether it
 * sits in another mark, where it is a darker shade.
 */
const coloursInPanel = (helper, tabId) =>
  helper.evaluate((tabId) => {
    const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
    if (!panel) return null;
    const doc = panel.document;
    const painted = (element) => panel.getComputedStyle(element);
    const box = doc.getElementById('highlight');
    const choices = [...doc.querySelectorAll('#highlight-colours button')];
    return {
      marks: [...doc.querySelectorAll('mark[data-highlight]')].map((mark) => ({
        words: mark.textContent,
        colour: mark.dataset.colour ?? null,
        inside: !!mark.parentElement.closest('mark[data-highlight]'),
        background: painted(mark).backgroundColor,
        ink: painted(mark).color,
      })),
      open: box.hidden ? null : doc.getElementById('highlight-words').textContent,
      choices: choices.map((choice) => ({ name: choice.title, background: painted(choice).backgroundColor })),
      pressed: choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true').map((choice) => choice.title),
      panel: painted(box).backgroundColor, // the box has the panel's own background
    };
  }, tabId);

/**
 * How far apart two colours are in lightness, from 1 to 21: the contrast ratio
 * of WCAG 2. Each is written as Chrome writes a computed colour, "rgb(r, g, b)".
 */
const contrast = (one, other) => {
  const luminance = (colour) => {
    const [r, g, b] = colour.match(/[\d.]+/g).slice(0, 3).map((part) => (part / 255 <= 0.04045 ? part / 255 / 12.92 : ((part / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * A mouse in a tab's real side panel. The panel is a DevTools target of its
 * own, so the DevTools protocol can send it mouse events: Chrome then does
 * with them what it does with a hand's, hit-testing, selecting and clicking.
 * `requests` fills with the address of every request the panel makes from now on.
 */
async function mouseInPanel(devtools, helper, tabId) {
  const address = `chrome-extension://${ID}/extension/side-panel.html?tabId=${tabId}`;
  const target = (await devtools.send('Target.getTargets')).targetInfos.find((each) => each.url === address);
  if (!target) throw new Error(`No side panel is open beside tab ${tabId}.`);
  // Playwright speaks to one session; a second, to the panel, goes through it as text.
  const { sessionId } = await devtools.send('Target.attachToTarget', { targetId: target.targetId, flatten: false });
  const answers = new Map();
  const requests = [];
  devtools.on('Target.receivedMessageFromTarget', (event) => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    answers.get(message.id)?.(message);
  });
  let sent = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (sent += 1);
      answers.set(id, (answer) => (answer.error ? reject(new Error(`${method}: ${answer.error.message}`)) : resolve(answer.result)));
      devtools.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject);
    });
  await send('Network.enable');

  /** Where a word of a line, or an element by its id, is in the panel. `bring` scrolls it to the middle first. */
  const whereIs = (what, bring = false) =>
    helper.evaluate(
      ({ tabId, what, bring }) => {
        const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
        const element = what.id ? panel.document.getElementById(what.id) : panel.document.querySelectorAll('.sentence')[what.line].querySelectorAll('.word')[what.word];
        if (bring) element.scrollIntoView({ block: 'center' });
        const box = element.getBoundingClientRect();
        // The middle of a word's first letter: a caret set to its left and one set to its right are a letter apart.
        const letter = panel.document.createRange();
        if (!what.id) letter.setEnd(element.firstChild, 1), letter.setStart(element.firstChild, 0);
        const first = letter.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          firstLetter: first.left + first.width / 2,
          text: element.textContent,
          inView: box.top >= 0 && box.bottom <= panel.innerHeight,
        };
      },
      { tabId, what, bring }
    );
  const event = (type, x, y, more) => send('Input.dispatchMouseEvent', { type, x, y, ...more });
  const UP = { button: 'none', buttons: 0 };
  const DOWN = { button: 'left', buttons: 1, clickCount: 1 };

  return {
    requests,
    targetType: target.type,
    /**
     * Presses on the start of one word, moves to the end of another and lets
     * go. Gives what the panel had selected while the button was still down.
     */
    async drag(from, to) {
      // Any scrolling is done before the button goes down: a scroll between
      // the press and the first movement moves where the selection starts.
      await whereIs(from, true);
      const [a, b] = [await whereIs(from), await whereIs(to)];
      if (!a.inView || !b.inView) throw new Error(`"${a.text}" and "${b.text}" are not both in view in the panel.`);
      await event('mouseMoved', a.left + 1, a.y, UP);
      await event('mousePressed', a.left + 1, a.y, DOWN);
      for (let step = 1; step <= 5; step += 1) await event('mouseMoved', a.left + 1 + ((b.right - a.left - 2) * step) / 5, a.y + ((b.y - a.y) * step) / 5, DOWN);
      const selected = (await highlightsInPanel(helper, tabId)).selected;
      await event('mouseReleased', b.right - 1, b.y, { button: 'left', buttons: 0, clickCount: 1 });
      await pause(400);
      return { from: a.text, to: b.text, selected };
    },
    /**
     * A click that slips: pressed 2 px to the left of the middle of a word's
     * first letter and let go 2 px to its right. Gives what the panel had
     * selected while the button was still down.
     */
    async slip(what) {
      const at = await whereIs(what, true);
      await event('mouseMoved', at.firstLetter - 2, at.y, UP);
      await event('mousePressed', at.firstLetter - 2, at.y, DOWN);
      await event('mouseMoved', at.firstLetter + 2, at.y, DOWN);
      const selected = (await highlightsInPanel(helper, tabId)).selected;
      await event('mouseReleased', at.firstLetter + 2, at.y, { button: 'left', buttons: 0, clickCount: 1 });
      await pause(400);
      return { on: at.text, selected };
    },
    /** A click in the middle of a word, or of an element by its id. */
    async click(what) {
      const at = await whereIs(what, !what.id);
      await event('mouseMoved', at.x, at.y, UP);
      await event('mousePressed', at.x, at.y, DOWN);
      await event('mouseReleased', at.x, at.y, { button: 'left', buttons: 0, clickCount: 1 });
      await pause(400);
    },
    /** Shows the panel in the 'light' scheme or the 'dark' one, as the system's setting would. With nothing given, as the system has it. */
    scheme: (value) => send('Emulation.setEmulatedMedia', { features: value ? [{ name: 'prefers-color-scheme', value }] : [] }),
  };
}

let context;
try {
  // ---------------------------------------------------------------- loading
  context = await launch(dist);
  console.log(`Chromium ${context.browser().version()}, ${headed ? 'headed' : 'headless'}, loading ${dist}\n`);

  const extensions = await openExtensionsPage(context);
  const atLoad = await asLoaded(extensions);
  check(atLoad?.id === ID && atLoad.folder === dist, 'the built folder loads, with the fixed id', JSON.stringify({ id: atLoad?.id, folder: atLoad?.folder }));
  check(atLoad?.state === 'ENABLED' && noErrors(atLoad), 'chrome://extensions lists it enabled, with no errors', JSON.stringify(atLoad));

  // An unpacked extension is loaded with no install dialog, so the warning is
  // never on screen. This asks Chrome what the dialog would say. (The function
  // is "Warning" in Chrome's documentation and "Warnings" in this Chromium.)
  const warnings = await extensions.evaluate((id) => {
    const ask = chrome.management.getPermissionWarningsById ?? chrome.management.getPermissionWarningById;
    return new Promise((done) => ask.call(chrome.management, id, done));
  }, ID);
  check(same(warnings, [WARNING]), `Chrome has one install warning for it, "${WARNING}"`, JSON.stringify(warnings));

  const helper = await openHelperPage(context);
  const clipboardReader = await openClipboardReader(context);
  const behavior = await helper.evaluate(() => chrome.sidePanel.getPanelBehavior());
  check(behavior.openPanelOnActionClick === true, 'a click on the toolbar icon is set to open the side panel', JSON.stringify(behavior));

  // Every message the background worker hears from here on, to show later
  // that the panel's questions about the time are not among them.
  const worker = context.serviceWorkers().findLast((each) => each.url().includes(ID));
  const hearing = await worker
    ?.evaluate(() => {
      self.heard = [];
      chrome.runtime.onMessage.addListener((message) => void self.heard.push(String(message?.type)));
      return true;
    })
    .catch(() => false);
  const heardByWorker = () => worker.evaluate(() => self.heard ?? null).catch(() => null);

  // Every answer to a request for captions, the extension's and the player's
  // own. The extension asks with fetch and YouTube's player with XMLHttpRequest.
  const captionAnswers = [];
  const fromTheRecord = new WeakSet();
  context.on('response', async (response) => {
    const address = new URL(response.url());
    if (address.pathname !== '/api/timedtext') return;
    const body = await response.text().catch(() => null);
    const asked = address.searchParams;
    captionAnswers.push({
      video: asked.get('v'),
      by: response.request().resourceType() === 'fetch' ? 'the extension' : 'the player',
      from: fromTheRecord.has(response.request()) ? 'the record' : 'YouTube',
      status: response.status(),
      characters: body?.length ?? null,
      language: asked.get('lang'),
      kind: asked.get('kind'),
      format: asked.get('fmt'),
      client: asked.get('c'),
      withToken: asked.has('pot'),
    });
  });
  const answersFor = (video, by) => captionAnswers.filter((answer) => answer.video === video && answer.by === by);

  // ------------------------------------------------------------- a watch page
  const watch = await context.newPage();
  const thrownInPage = [];
  watch.on('pageerror', (error) => String(error.stack).includes(ID) && thrownInPage.push(String(error.stack)));
  const loadStarted = Date.now();
  await watch.goto(WATCH_PAGE, { waitUntil: 'domcontentloaded' });
  const first = await until(() => shownByYouTube(watch), 30000);
  check(!!first, 'a YouTube watch page opens', first ? `${first.title} / ${first.channel}` : `stuck at ${watch.url()}`);
  if (!first) throw new Error('No watch page to check against.');

  // Only the page script can say which tab this is: Chrome hides tabs' addresses from the extension.
  const tabId = await until(() =>
    helper.evaluate(async () => {
      for (const tab of await chrome.tabs.query({})) {
        const video = await chrome.tabs.sendMessage(tab.id, { type: 'which-video' }).catch(() => null);
        if (video) return tab.id;
      }
      return null;
    })
  );
  check(tabId != null, 'the page script answers in the watch tab', `tab ${tabId}`);

  const panelOptions = () => helper.evaluate((tabId) => chrome.sidePanel.getOptions({ tabId }), tabId);
  const tabHasPanel = (has) => until(async () => (await panelOptions()).enabled === has);
  await tabHasPanel(true);
  const given = await panelOptions();
  check(given.enabled === true && given.path === `extension/side-panel.html?tabId=${tabId}`, 'the watch tab is given the side panel', JSON.stringify(given));

  // The real side panel, as Chrome and the extension see it.
  const devtools = await context.browser().newBrowserCDPSession();
  const runToolbarAction = async () => {
    await watch.bringToFront();
    const { targetInfos } = await devtools.send('Target.getTargets', { filter: [{ type: 'tab' }] });
    const tab = targetInfos.find((target) => target.url === watch.url());
    await devtools.send('Extensions.triggerAction', { id: ID, targetId: tab.targetId });
  };
  const openPanels = () => helper.evaluate(() => chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] }).then((all) => all.map((one) => one.documentUrl)));
  const panelIsOpen = (open) => until(async () => (await openPanels()).length === (open ? 1 : 0));
  const shownByPanel = () =>
    helper.evaluate((tabId) => {
      const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
      if (!panel) return null;
      const element = (id) => panel.document.getElementById(id);
      return {
        title: element('title').textContent,
        channel: element('channel').textContent,
        noVideoLine: element('no-video').hidden ? null : element('no-video').textContent,
        width: panel.innerWidth,
        marked: panel.marked === true,
      };
    }, tabId);
  const panelShows = (video) =>
    until(async () => {
      const shown = await shownByPanel();
      return shown && shown.title === video.title && shown.channel === video.channel ? shown : null;
    });

  await runToolbarAction();
  await panelIsOpen(true);
  const opened = await openPanels();
  check(
    same(opened, [`chrome-extension://${ID}/extension/side-panel.html?tabId=${tabId}`]),
    'the toolbar action opens the side panel beside the watch tab',
    JSON.stringify(opened)
  );
  const named = await panelShows(first);
  check(!!named, "the panel shows the video's title and channel", JSON.stringify(named ?? (await shownByPanel())));

  // --------------------------------------- the Transcript: reading the panel
  /** What the panel holds where the Transcript goes. `words` are those of one line, each with the time it keeps. */
  const transcriptInPanel = (wordsOfLine = 0) =>
    helper.evaluate(
      ({ tabId, wordsOfLine }) => {
        const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
        if (!panel) return null;
        const line = panel.document.getElementById('transcript-line');
        const transcript = panel.document.getElementById('transcript');
        const sentences = [...transcript.querySelectorAll('.sentence')];
        const boxes = sentences.slice(0, 60).map((sentence) => sentence.getBoundingClientRect());
        return {
          title: panel.document.getElementById('title').textContent,
          line: line.hidden ? null : line.textContent,
          reason: line.title || null,
          count: transcript.hidden ? 0 : sentences.length,
          opening: sentences.slice(0, 6).map((sentence) => [Number(sentence.dataset.start), sentence.textContent]),
          language: transcript.lang,
          source: transcript.dataset.source,
          timing: transcript.dataset.timing,
          // Each sentence is a block as wide as the panel, below the one before it.
          onePerLine: boxes.length > 1 && boxes.every((box, i) => box.height > 0 && (i === 0 || box.top >= boxes[i - 1].bottom - 0.5)),
          words: [...(sentences[wordsOfLine]?.querySelectorAll('.word') ?? [])].map((word) => [word.textContent, Number(word.dataset.start)]),
        };
      },
      { tabId, wordsOfLine }
    );
  const brief = (now) => (now.count ? `${now.count} sentences, from "${now.opening[0][1]}"` : now.line);
  const captionsByPageScript = () => helper.evaluate((tabId) => chrome.tabs.sendMessage(tabId, { type: 'which-captions' }).catch(() => null), tabId);
  const hasNoToken = (said) => !said || (said.captions.length > 0 && !said.captions.some((each) => each.hasToken));

  // Every stretch in which the panel showed the waiting line while the player
  // had no token for the video. How long it lasts is YouTube's doing: the
  // token comes when the adverts before the video are over, and not every load has adverts.
  const tokenWaits = [];
  /**
   * Follows the Transcript's place in the panel until `wanted`, and gives
   * everything it held on the way. Nothing is done to the panel meanwhile.
   * The wait is long because adverts are: two of them took 73 s on one load.
   */
  const followTranscript = async (where, wanted, timeout = 300000) => {
    const held = [];
    const wait = { where, seconds: 0, withAdvert: 0 };
    let last = null;
    let tokenSeen = null;
    let sampled = Date.now();
    for (const end = sampled + timeout; !last && Date.now() < end; await pause(100)) {
      const before = await captionsByPageScript();
      const now = await transcriptInPanel().catch(() => null);
      const after = await captionsByPageScript();
      const seconds = (Date.now() - sampled) / 1000;
      sampled = Date.now();
      if (!hasNoToken(after)) tokenSeen ??= sampled;
      if (!now) continue;
      const holds = { title: now.title, shows: brief(now) };
      if (!same(held.at(-1), holds)) held.push(holds);
      if (now.line === WAITING_LINE && hasNoToken(before) && hasNoToken(after)) {
        wait.seconds += seconds;
        if (before?.advert && after?.advert) wait.withAdvert += seconds;
      }
      if (wanted(now)) last = now;
    }
    if (wait.seconds > 0) tokenWaits.push(wait);
    return { held, last, tokenSeen };
  };
  const settled = (now) => now.count > 0 || (now.line !== null && now.line !== WAITING_LINE);
  const journey = (held) => held.map((each) => `[${each.title || '…'}] ${each.shows}`).join('  →  ');

  // What the page's own world holds, read directly: the yardstick for what the page script says.
  const playerInPage = () =>
    watch.evaluate(() => {
      const id = new URLSearchParams(location.search).get('v');
      const player = document.querySelector('#movie_player');
      const mine = (player?.getAudioTrack?.()?.captionTracks ?? []).filter((each) => new URL(each.url, location.href).searchParams.get('v') === id);
      return {
        id,
        captions: mine.map((each) => `${each.languageCode}${each.kind === 'asr' ? ' auto' : ''}`),
        withToken: mine.filter((each) => new URL(each.url, location.href).searchParams.has('pot')).length,
        captionsOn: document.querySelector('.ytp-subtitles-button')?.getAttribute('aria-pressed') === 'true',
        playerError: document.querySelector('.ytp-error')?.textContent.trim().slice(0, 80) || null,
      };
    });

  // ------------------------------- following playback: reading and driving
  const videoNow = () =>
    watch.evaluate(() => {
      const element = document.querySelector('video.html5-main-video');
      return {
        time: element?.currentTime ?? null,
        paused: element?.paused ?? null,
        advert: !!document.querySelector('.html5-video-player.ad-showing'),
        stopped: document.querySelector('.ytp-error')?.textContent.trim().slice(0, 60) || null,
      };
    });
  /** YouTube's own player, asked to play, pause or seek, as its buttons and its bar ask it. */
  const askPlayer = (what, ...given) => watch.evaluate(({ what, given }) => document.querySelector('#movie_player')[what](...given), { what, given });
  /** Where the following stands in the panel: the tinted line, where it sits, and "back to now". */
  const followingInPanel = () =>
    helper.evaluate((tabId) => {
      const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
      if (!panel) return null;
      const lines = panel.document.getElementsByClassName('sentence');
      const tinted = panel.document.querySelectorAll('.sentence.spoken');
      const line = tinted[0];
      const place = line ? Array.prototype.indexOf.call(lines, line) : -1;
      const another = lines[place === 0 ? 1 : 0];
      return {
        tinted: tinted.length,
        place,
        text: line?.textContent ?? null,
        start: line ? Number(line.dataset.start) : null,
        nextStart: lines[place + 1] ? Number(lines[place + 1].dataset.start) : null,
        top: line ? line.getBoundingClientRect().top : null,
        height: panel.innerHeight,
        scrollY: panel.scrollY,
        backToNow: !panel.document.getElementById('back-to-now').hidden,
        colours: [line && panel.getComputedStyle(line).backgroundColor, another && panel.getComputedStyle(another).backgroundColor],
        selected: panel.getSelection().toString(),
        askedTheTime: panel.askedTheTime ?? null,
      };
    }, tabId);
  /** The panel and the video read together: the video just before the panel and just after. */
  const readBoth = async () => {
    const before = await videoNow();
    const panel = await followingInPanel();
    const after = await videoNow();
    return { ...panel, from: before.time, to: after.time, paused: after.paused, advert: before.advert || after.advert, stopped: after.stopped };
  };
  // The tinted line is the right one when the video is inside its sentence, or was a moment ago.
  const tintIsRight = (read) => read.tinted === 1 && read.start <= read.to && (read.nextStart === null || read.nextStart > read.from - BEHIND);
  const isHeld = (read) => read.tinted === 1 && Math.abs(read.top - HELD_AT * read.height) <= 2;
  const where = (read) => (read.tinted ? `line ${read.place} "${read.text.slice(0, 24)}" (from ${read.start} s) with the video at ${read.to?.toFixed(1)} s` : `no line tinted with the video at ${read.to?.toFixed(1)} s`);
  const sits = (read) => `${Math.round(read.top)} px down a panel ${read.height} px high`;
  /** Reads both until `wanted`, and gives that reading, or the last one when time runs out, marked `late`. */
  const readUntil = async (wanted, timeout = 4000) => {
    const end = Date.now() + timeout;
    for (;;) {
      const read = await readBoth();
      if (wanted(read)) return read;
      if (Date.now() > end) return { ...read, late: true };
      await pause(100);
    }
  };
  /**
   * A check of something that needs the video playing. When it does not hold
   * and YouTube's player has stopped, that is this browser and not the
   * extension: it is listed as not shown.
   */
  const checkWhilePlaying = async (passed, what, detail) => {
    const { stopped } = await videoNow();
    if (passed || !stopped) return check(passed, what, detail);
    notShown.push(what);
    note(`NOT SHOWN: ${what}`, `YouTube's player had stopped: "${stopped}". ${detail ?? ''}`);
  };
  /** Waits for the video to be playing, and says what YouTube's player was doing meanwhile. */
  const videoPlaying = async () => {
    const seen = [];
    const playing = await until(async () => {
      const now = await videoNow();
      const state = now.stopped ? `stopped ("${now.stopped}")` : now.advert ? 'an advert' : now.paused ? 'paused' : 'playing';
      if (seen.at(-1) !== state) seen.push(state);
      if (now.paused && !now.advert && !now.stopped) await askPlayer('playVideo').catch(() => {});
      return state === 'playing' && now.time > 0 ? now : null;
    }, 90000);
    return { playing, seen: seen.join(', then ') };
  };

  // The side panel is a page Playwright does not hold. The DevTools protocol
  // reaches it as a target of its own, which is how the check uses a real
  // wheel, real clicks and a real drag in the real panel.
  let panelSession = null;
  const inPanel = async (method, params = {}) => {
    if (!panelSession) {
      const { targetInfos } = await devtools.send('Target.getTargets');
      const target = targetInfos.find((each) => each.url.endsWith(`side-panel.html?tabId=${tabId}`));
      const { sessionId } = await devtools.send('Target.attachToTarget', { targetId: target.targetId, flatten: false });
      panelSession = { sessionId, sent: 0, waiting: new Map() };
      devtools.on('Target.receivedMessageFromTarget', (event) => {
        const message = JSON.parse(event.message);
        if (event.sessionId !== sessionId || !panelSession.waiting.has(message.id)) return;
        panelSession.waiting.get(message.id)(message);
        panelSession.waiting.delete(message.id);
      });
    }
    const id = (panelSession.sent += 1);
    const answer = await new Promise((answered) => {
      panelSession.waiting.set(id, answered);
      devtools.send('Target.sendMessageToTarget', { sessionId: panelSession.sessionId, message: JSON.stringify({ id, method, params }) });
    });
    if (answer.error) throw new Error(`${method}: ${answer.error.message}`);
    return answer.result;
  };
  const mouse = (type, { x, y }, more = {}) => inPanel('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, clickCount: 1, ...more });
  const clickInPanel = async (at) => {
    await mouse('mouseMoved', at, { button: 'none', buttons: 0 });
    await mouse('mousePressed', at);
    await mouse('mouseReleased', at, { buttons: 0 });
  };
  /** Presses at one place, moves to another in steps, and lets go there. */
  const dragInPanel = async (from, to) => {
    await mouse('mouseMoved', from, { button: 'none', buttons: 0 });
    await mouse('mousePressed', from);
    for (let step = 1; step <= 6; step += 1) await mouse('mouseMoved', { x: from.x + ((to.x - from.x) * step) / 6, y: from.y + ((to.y - from.y) * step) / 6 });
    await mouse('mouseReleased', to, { buttons: 0 });
  };
  const wheelInPanel = (deltaY) => inPanel('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 180, y: 300, deltaX: 0, deltaY });
  /** Something in the panel, by what it is, with where it is. A line is `{ line }`, a word `{ line, word }`, anything else `{ id }`. */
  const placeInPanel = (what) =>
    helper.evaluate(
      ({ tabId, what }) => {
        const panel = chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`);
        const lines = panel.document.getElementsByClassName('sentence');
        const element = what.id ? panel.document.getElementById(what.id) : what.word == null ? lines[what.line] : lines[what.line].querySelectorAll('.word')[what.word];
        const box = element.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2, left: box.left, right: box.right, top: box.top, bottom: box.bottom, text: element.textContent, start: Number(element.dataset.start) };
      },
      { tabId, what }
    );
  /** Runs `change` in the panel's own page, with `given`, and gives what it returns. */
  const changePanel = async (change, given = null) => {
    const ran = await inPanel('Runtime.evaluate', { expression: `(${change})(${JSON.stringify(given)})`, returnByValue: true });
    if (ran.exceptionDetails) throw new Error(`in the panel: ${ran.exceptionDetails.exception?.description ?? ran.exceptionDetails.text}`);
    return ran.result.value;
  };
  /** Waits for the panel's page to stop scrolling, and gives a reading of both from then. */
  const pageAtRest = async () => {
    for (let last = await readBoth(); ; ) {
      await pause(150);
      const now = await readBoth();
      if (now.scrollY === last.scrollY) return now;
      last = now;
    }
  };
  /** Whether the video is somewhere other than the start of a sentence a click might have sent it to. */
  const notJumpedTo = (read, start) => !(read.to >= start - 0.3 && read.to < start + 1.5);

  // ------------------------------------------------- H and U: pressing a key
  // Real key presses, as the DevTools protocol sends them: to the side panel's
  // own target, which is a key pressed with keyboard focus in the panel, and
  // to the watch page, which is one pressed with focus in the page.
  const KEY = { h: { key: 'h', code: 'KeyH', windowsVirtualKeyCode: 72 }, n: { key: 'n', code: 'KeyN', windowsVirtualKeyCode: 78 }, u: { key: 'u', code: 'KeyU', windowsVirtualKeyCode: 85 } };
  const pressInPanel = async (letter) => {
    await inPanel('Input.dispatchKeyEvent', { type: 'keyDown', ...KEY[letter], text: letter, unmodifiedText: letter });
    await inPanel('Input.dispatchKeyEvent', { type: 'keyUp', ...KEY[letter] });
  };
  const pressInPage = (letter) => watch.keyboard.press(letter);
  /**
   * Types into whatever has the keyboard in the side panel, a key at a time. Each is a real key
   * press that carries its letter, so the panel's own listener for H, N and U hears every one.
   */
  const typeInPanel = async (text) => {
    for (const letter of text) {
      const key = { key: letter, ...(/[a-z0-9 ]/i.test(letter) && { windowsVirtualKeyCode: letter.toUpperCase().charCodeAt(0) }) };
      await inPanel('Input.dispatchKeyEvent', { type: 'keyDown', ...key, text: letter, unmodifiedText: letter });
      await inPanel('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
    }
  };
  // Enter, Escape and Backspace in the side panel. Backspace names what it does as well, which is how macOS is told.
  const NAMED = {
    Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
    Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
    Backspace: { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, commands: ['deleteBackward'] },
  };
  const pressNamedInPanel = async (name) => {
    const { text, commands, ...key } = NAMED[name];
    await inPanel('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...key, ...(text && { text }), ...(commands && { commands }) });
    await inPanel('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
  };
  const notesNow = () => notesInPanel(helper, tabId);
  /** Waits for what the panel shows of Notes to be as `wanted`, and gives it then, or null when time runs out. */
  const notesBecome = (wanted, timeout = 3000) =>
    until(async () => {
      const now = await notesNow();
      return now && wanted(now) ? now : null;
    }, timeout);
  const boxIsOpen = (now) => !!now.box && now.box !== 'offer';
  /** Where a part of a drawn Note is in the panel, by what the Note says: its "time", its "text" or its "delete". The Note is brought into view first. */
  const partOfNote = (text, part) =>
    changePanel(
      ({ text, part }) => {
        const note = [...document.querySelectorAll('#transcript > .note')].find((each) => each.querySelector('.note-text').textContent === text);
        if (!note) return null;
        note.scrollIntoView({ block: 'center' });
        const box = note.querySelector(`.note-${part}`).getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      },
      { text, part }
    );
  /** A real click on a part of a drawn Note. A Note that is not there is not clicked, and what is checked next says so. */
  const clickNote = async (text, part) => {
    const at = await partOfNote(text, part);
    if (at) await clickInPanel(at);
  };
  /** The Notes as they are drawn, each as the line it follows, its time, what it says and what it is on. */
  const drawn = (now) => (now?.notes ?? []).map((note) => [note.after, note.time, note.text, note.on]);
  /** Puts keyboard focus where it is while a video is watched: on YouTube's player. Not a click, which would pause it. */
  const focusThePlayer = () => watch.evaluate(() => (document.querySelector('#movie_player')?.focus(), document.activeElement?.id || document.activeElement?.tagName));
  /** Waits for the panel's marked lines to be exactly these, and gives the panel's Highlights then, or null when time runs out. */
  const marksBecome = (lines, timeout = 3000) =>
    until(async () => {
      const now = await highlightsInPanel(helper, tabId);
      return same(now?.lines, lines) ? now : null;
    }, timeout);
  /**
   * The line H should take with the video at a time, worked out here from the
   * lines in the panel and not by the extension: the last line to have started
   * 1.2 s earlier, or, when that is a bracketed sound, the last before it that is not.
   */
  const lineJustSpoken = (seconds) =>
    changePanel((seconds) => {
      const lines = [...document.getElementsByClassName('sentence')];
      let place = lines.findLastIndex((line) => Number(line.dataset.start) <= seconds - 1.2);
      while (place >= 0 && lines[place].classList.contains('sound')) place -= 1;
      return place < 0 ? null : lines[place].textContent;
    }, seconds);

  // ------------------- following playback, 1 of 2: while the video plays
  // Run straight after a load, on the video whose recorded Transcript is word-timed.
  const followWhilePlaying = async () => {
    console.log('\n      Following playback, 1 of 2: while the video plays (the word-timed Transcript, from the record)');
    const began = await videoPlaying();
    check(!!began.playing, 'the video plays in this browser', `YouTube's player was ${began.seen}${began.playing ? `; the video was at ${began.playing.time.toFixed(1)} s when the following was first read` : ''}`);
    // The panel asks the time every quarter of a second, so a Transcript can be on show that long before its first tint.
    const firstTint = await readUntil((read) => read.tinted === 1, 2000);
    await checkWhilePlaying(!firstTint.late, 'a line is tinted within moments of the Transcript showing', where(firstTint));

    // The panel's questions about the time are counted, to set against what the worker hears.
    await changePanel(() => {
      const send = chrome.tabs.sendMessage;
      window.askedTheTime = 0;
      chrome.tabs.sendMessage = (tab, message, ...rest) => {
        if (message?.type === 'current-time') window.askedTheTime += 1;
        return send.call(chrome.tabs, tab, message, ...rest);
      };
    });
    const heardBefore = await heardByWorker();

    // Sixteen seconds of the video playing, the panel read some six times a second.
    const reads = [];
    for (const end = Date.now() + 16000; Date.now() < end; await pause(100)) reads.push(await readBoth());
    const lines = []; // each line that was tinted, in turn, with the last reading of it
    for (const read of reads) {
      if (lines.at(-1)?.place !== read.place) lines.push({ place: read.place, since: read.to });
      Object.assign(lines.at(-1), { last: read, until: read.to });
    }
    const wrong = reads.filter((read) => !tintIsRight(read));
    await checkWhilePlaying(
      wrong.length === 0 && lines.length >= 4 && lines.every((line, i) => i === 0 || line.place > lines[i - 1].place),
      'while the video plays, the sentence being spoken is the one line tinted',
      `${reads.length} readings over ${(reads.at(-1).to - reads[0].from).toFixed(1)} s of the video; ${lines.length} lines in turn: ${lines.map((line) => `${line.place} from ${line.since.toFixed(1)} s`).join(', ')}` +
        (wrong.length ? `; WRONG in ${wrong.length}, such as: ${wrong.slice(0, 3).map(where).join('; ')}` : '')
    );
    const colours = reads.at(-1).colours;
    check(!!colours[0] && colours[0] !== colours[1], 'the tint is a background the other lines have not', JSON.stringify(colours));
    // The lines the page had to scroll for, each as it sat when the next one took over.
    const scrolledFor = lines.filter((line) => line.last.scrollY > 0 && line.until - line.since > 0.5);
    await checkWhilePlaying(
      scrolledFor.length >= 2 && scrolledFor.every((line) => isHeld(line.last)),
      `and it is held at a fixed height, its top ${Math.round(HELD_AT * 100)}% of the way down the panel`,
      `${scrolledFor.map((line) => `line ${line.place} ${sits(line.last)}`).join('; ')}. The first lines of a Transcript sit higher, the page being at its top: line ${lines[0].place} ${sits(lines[0].last)}`
    );
    check(reads.every((read) => !read.backToNow), 'with no "back to now" on show while it follows');

    const heardAfter = await heardByWorker();
    const asked = (await followingInPanel()).askedTheTime;
    if (hearing && heardBefore && heardAfter) {
      check(
        asked > 20 && heardAfter.length === heardBefore.length && heardAfter.includes('video-changed') && !heardAfter.includes('current-time'),
        'the panel asks the page the time, and the background worker hears none of it',
        `in those 16 s the panel asked the time ${asked} times and the worker heard ${heardAfter.length - heardBefore.length} messages. Since the check began it has heard ${heardAfter.length}, all of them "${[...new Set(heardAfter)].join('", "')}"`
      );
    } else note('the background worker could not be listened to, so what it hears while the panel follows was not checked');

    // Pausing in the player.
    await askPlayer('pauseVideo');
    const pausedAt = await readUntil((read) => read.paused && tintIsRight(read) && (isHeld(read) || read.scrollY === 0), 3000);
    await pause(2500);
    const still = await readBoth();
    await checkWhilePlaying(
      !pausedAt.late && still.paused && still.place === pausedAt.place && Math.abs(still.scrollY - pausedAt.scrollY) <= 1 && Math.abs(still.to - pausedAt.to) < 0.1,
      'pausing in the player shows in the panel: the tint stays on the sentence the video stopped in',
      `${where(pausedAt)}; 2.5 s later, ${where(still)}`
    );
    await askPlayer('playVideo');
    const movedOn = await readUntil((read) => !read.paused && read.place > still.place && tintIsRight(read), 12000);
    await checkWhilePlaying(!movedOn.late, 'and when it plays again the tint moves on', where(movedOn));

    // Seeking in the player, back and then forwards, inside the minute this browser is given.
    await askPlayer('seekTo', 5.5, true);
    const back = await readUntil((read) => read.place === 5 && tintIsRight(read), 4000); // "That's not necessary.", 5.16 s to 7.32 s
    await checkWhilePlaying(!back.late && !back.backToNow, 'seeking back in the player shows in the panel: the tint goes to the sentence there', where(back));
    await askPlayer('seekTo', 28.5, true);
    const forward = await readUntil((read) => read.place >= 15 && tintIsRight(read) && isHeld(read), 4000); // line 15 runs from 26.2 s to 29.08 s
    await checkWhilePlaying(!forward.late && !forward.backToNow, 'seeking forwards too, and the panel follows it there', `${where(forward)}, ${sits(forward)}`);

    // Scrolling by hand: a real wheel, 80 px up.
    await wheelInPanel(-80);
    const stopped = await readUntil((read) => read.backToNow, 3000);
    let left = await pageAtRest();
    // One turn of the wheel has been seen to stop the following and leave the
    // page where it was. Probably it landed while the page was gliding to the
    // next line, and the glide took the page back; that was not looked into.
    // With the following stopped there is no glide, so a second turn moves it.
    const turns = left.scrollY > forward.scrollY - 40 ? 2 : 1;
    if (turns === 2) {
      await wheelInPanel(-80);
      left = await pageAtRest();
    }
    await checkWhilePlaying(
      !stopped.late && left.backToNow && left.scrollY < forward.scrollY - 40,
      'scrolling the panel by hand, with a real wheel, stops the following: "back to now" appears',
      `the page was at ${Math.round(forward.scrollY)} px and is at ${Math.round(left.scrollY)} px` + (turns === 2 ? ', after two turns of the wheel: the first stopped the following and left the page where it was' : '')
    );
    // The video plays on. The tint goes with it, and the page stays where the hand left it.
    const afterwards = [];
    for (const end = Date.now() + 9000; Date.now() < end && !(afterwards.at(-1)?.place >= left.place + 2); await pause(100)) afterwards.push(await readBoth());
    await checkWhilePlaying(
      afterwards.at(-1).place > left.place && afterwards.every((read) => read.backToNow && Math.abs(read.scrollY - left.scrollY) <= 1 && tintIsRight(read)),
      'after that the tint still moves on with the video, and the page stays where it was left',
      `the tint went from line ${left.place} to line ${afterwards.at(-1).place} with the page at ${Math.round(left.scrollY)} px throughout, and that line now ${sits(afterwards.at(-1))}`
    );
    await clickInPanel(await placeInPanel({ id: 'back-to-now' }));
    const resumed = await readUntil((read) => !read.backToNow && tintIsRight(read) && isHeld(read), 4000);
    await checkWhilePlaying(!resumed.late, 'a real click on "back to now" resumes the following: the control goes, and the line being spoken is back at its height', `${where(resumed)}, ${sits(resumed)}`);
  };

  // ------------------- following playback, 2 of 2: the click that jumps
  // Run straight after a load, on the video whose recorded Transcript is cue-timed. Nothing is said in it until 27 s.
  const jumpByClicking = async () => {
    console.log('\n      Following playback, 2 of 2: the click that jumps (the cue-timed Transcript, from the record)');
    const began = await videoPlaying();
    check(!!began.playing, 'the video plays again after another load', `YouTube's player was ${began.seen}`);
    const quiet = await readBoth();
    if (quiet.to < 27) check(quiet.tinted === 0 && !quiet.backToNow && quiet.scrollY === 0, 'before the first sentence starts no line is tinted, and the panel is at its top', where(quiet));
    else note('the video was already past its first sentence, so the panel was not read before it', where(quiet));

    // A real click on a line.
    const clickedLine = await placeInPanel({ line: 4 });
    await clickInPanel(await placeInPanel({ line: 4, word: 1 }));
    const jumped = await readUntil((read) => read.place === 4 && tintIsRight(read), 3000);
    check(
      !jumped.late && clickedLine.start === 31.129 && jumped.to >= 31.129 && jumped.to < 34 && !jumped.backToNow,
      'a real click on a sentence moves the video to the start of that sentence, and the tint goes there',
      `clicked "${clickedLine.text}", which starts at ${clickedLine.start} s; ${where(jumped)}`
    );

    // An advert. None can be ordered, so the player is marked the way YouTube
    // marks it while one plays, which is all the page script goes by. The
    // video itself plays on underneath, through the start of two more sentences.
    await watch.evaluate(() => document.querySelector('.html5-video-player').classList.add('ad-showing'));
    const during = [];
    for (const end = Date.now() + 5000; Date.now() < end; await pause(200)) during.push(await readBoth());
    const timeGiven = await helper.evaluate((tabId) => chrome.tabs.sendMessage(tabId, { type: 'current-time' }), tabId);
    await clickInPanel(await placeInPanel({ line: 1, word: 0 })); // "How are you?", which starts at 28.49 s
    await pause(700);
    const clickedDuring = await readBoth();
    // H then has no sentence to take: the player cannot say the time. Nor has N a Moment to take.
    await pressInPage('h');
    await pressInPage('n');
    await pause(600);
    const keptDuringAdvert = await highlightsInPanel(helper, tabId);
    const noteDuringAdvert = await notesNow();
    await watch.evaluate(() => document.querySelector('.html5-video-player').classList.remove('ad-showing'));
    const caughtUp = await readUntil((read) => read.place > 4 && tintIsRight(read), 3000);
    const wentOn = during.at(-1).to - during[0].from;
    await checkWhilePlaying(
      timeGiven === null && wentOn > 3 && [...during, clickedDuring].every((read) => read.advert && read.place === 4) && notJumpedTo(clickedDuring, 28.49),
      'while the page is marked as playing an advert the panel holds still, and a click on a sentence does nothing',
      `a pretend advert, not a real one. The page gave ${timeGiven} for the time; the video underneath went on ${wentOn.toFixed(1)} s, to ${clickedDuring.to.toFixed(1)} s; the tint stayed on line ${[...new Set(during.map((read) => read.place))].join(', ')}`
    );
    await checkWhilePlaying(!caughtUp.late, 'and when it is over the tint catches up with the video', where(caughtUp));
    check(keptDuringAdvert?.lines.length === 0, 'H pressed in the page during that pretend advert kept nothing', JSON.stringify(keptDuringAdvert?.lines));
    check(
      noteDuringAdvert?.box === 'offer' && noteDuringAdvert.notes.length === 0,
      'and N pressed in the page during it opened no Note: there is no Moment to take',
      JSON.stringify({ box: noteDuringAdvert?.box, notes: noteDuringAdvert?.notes })
    );

    // H while the video plays, pressed with keyboard focus on YouTube's player.
    // The video is in the laughter after "In fact, I'm leaving." by now, or
    // near it; which line H should take is worked out from the video's time
    // just before the key and just after it.
    const focused = await focusThePlayer();
    const beforeH = await videoNow();
    await pressInPage('h');
    const keptPlaying = await until(async () => {
      const now = await highlightsInPanel(helper, tabId);
      return now?.lines.length ? now : null;
    }, 3000);
    const afterH = await videoNow();
    const couldTake = [await lineJustSpoken(beforeH.time), await lineJustSpoken(afterH.time)];
    await checkWhilePlaying(
      keptPlaying?.lines.length === 1 && couldTake.some((line) => keptPlaying.lines[0] === `«${line}»`) && afterH.time > beforeH.time && !afterH.paused,
      'while the video plays, H pressed in the page makes a Highlight of the sentence that was being said 1.2 s earlier',
      `focus on "${focused}"; pressed with the video between ${beforeH.time?.toFixed(2)} s and ${afterH.time?.toFixed(2)} s, playing; the panel then marked ${JSON.stringify(keptPlaying?.lines)}; by the lines' own times it should be ${JSON.stringify([...new Set(couldTake)])}`
    );
    await pressInPage('u');
    const undonePlaying = await marksBecome([]);
    check(!!undonePlaying, 'and U pressed in the page takes it back', JSON.stringify((await highlightsInPanel(helper, tabId))?.lines));

    // Selecting words is not a click: it makes a Highlight of them, and the
    // video stays where it is. A real drag over three words of the line
    // clicked before, then over two lines.
    const [its, great] = [await placeInPanel({ line: 4, word: 0 }), await placeInPanel({ line: 4, word: 2 })];
    await dragInPanel({ x: its.left + 1, y: its.y }, { x: great.right - 1, y: great.y });
    await pause(700);
    const selected = await readBoth();
    const markedInLine = await highlightsInPanel(helper, tabId);
    check(
      same(markedInLine?.lines, ["«It's been great,» hasn't it?"]) && notJumpedTo(selected, 31.129),
      'dragging across words in a line makes a Highlight of them and does not move the video',
      `the real side panel then marked ${JSON.stringify(markedInLine?.lines)}, in a line that starts at 31.129 s; ${where(selected)}`
    );
    const [good, are] = [await placeInPanel({ line: 0, word: 0 }), await placeInPanel({ line: 1, word: 1 })];
    await dragInPanel({ x: good.left + 1, y: good.y }, { x: are.right - 1, y: are.y });
    await pause(700);
    const selectedAcross = await readBoth();
    const markedAcross = await highlightsInPanel(helper, tabId);
    check(
      same(markedAcross?.lines, ['«Good morning.»', '«How are» you?', "«It's been great,» hasn't it?"]) && markedAcross.ids.length === 2 && notJumpedTo(selectedAcross, 27.103) && notJumpedTo(selectedAcross, 28.49),
      'nor does a drag from one line into the next, which makes one Highlight of both',
      `marked ${JSON.stringify(markedAcross?.lines)}, in lines that start at 27.103 s and 28.49 s; ${where(selectedAcross)}`
    );

    // A click on a Highlight is the Highlight's own: it opens it, and the video
    // stays where it is. The Highlight is the one just made in the line that
    // starts at 31.129 s. Once it is removed, the same click jumps there.
    const been = await placeInPanel({ line: 4, word: 1 });
    await clickInPanel(been);
    await pause(700);
    const onHighlight = await readBoth();
    const openedByClick = await highlightsInPanel(helper, tabId);
    check(
      notJumpedTo(onHighlight, 31.129) && openedByClick?.open === "It's been great,",
      'a real click inside a Highlight opens it and does not move the video',
      `clicked "${been.text}" inside the Highlight; open: ${JSON.stringify(openedByClick?.open)}; ${where(onHighlight)}`
    );
    await clickInPanel(await placeInPanel({ id: 'remove-highlight' }));
    await pause(400);
    await clickInPanel(await placeInPanel({ line: 4, word: 1 }));
    const onPlainWord = await readUntil((read) => read.place === 4 && !notJumpedTo(read, 31.129), 3000);
    check(!onPlainWord.late, 'and the same click on the same word, once its Highlight is removed, does', where(onPlainWord));
    // The other Highlight is removed the same way, so that the lines are left as they were.
    await clickInPanel(await placeInPanel({ line: 0, word: 0 }));
    await pause(400);
    await clickInPanel(await placeInPanel({ id: 'remove-highlight' }));
    await pause(400);

    // Scrolling by hand with no wheel in it, as a key or the scroll bar does it: a real Page Down.
    const pageDown = { key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 };
    await inPanel('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...pageDown });
    await inPanel('Input.dispatchKeyEvent', { type: 'keyUp', ...pageDown });
    let scrolledBy = 'a real Page Down';
    let byKey = await readUntil((read) => read.backToNow, 2500);
    if (byKey.late) {
      scrolledBy = 'the page scrolled by a script, a real Page Down not having moved it';
      await changePanel(() => scrollBy(0, 500));
      byKey = await readUntil((read) => read.backToNow, 2500);
    }
    byKey = { ...(await pageAtRest()), late: byKey.late };
    check(!byKey.late && byKey.scrollY > 100, `scrolling with no wheel stops the following too: ${scrolledBy}`, `the page is at ${Math.round(byKey.scrollY)} px, with "back to now" ${byKey.backToNow ? 'on show' : 'hidden'}`);

    // A click on a sentence from there jumps to it and resumes the following.
    // This one is past the minute of video this browser is given, so it comes last.
    const far = await changePanel(() => {
      const lines = [...document.getElementsByClassName('sentence')];
      const place = lines.findIndex((line) => line.getBoundingClientRect().top > innerHeight * 0.75);
      return { place, start: Number(lines[place].dataset.start), text: lines[place].textContent };
    });
    await clickInPanel(await placeInPanel({ line: far.place, word: 0 }));
    const followedThere = await readUntil((read) => read.place === far.place && !read.backToNow && isHeld(read), 4000);
    check(
      !followedThere.late && !notJumpedTo(followedThere, far.start),
      'a click on a sentence after scrolling away jumps there and resumes the following',
      `clicked line ${far.place} "${far.text.slice(0, 24)}", which starts at ${far.start} s; ${where(followedThere)}, ${sits(followedThere)}, "back to now" gone`
    );
  };

  // -------------------------- the Transcript, with YouTube answering for itself
  console.log('\n      The Transcript, with YouTube answering for itself (logged out, driven by a script)');
  const real = await followTranscript('on opening the panel', settled);
  const said = await captionsByPageScript();
  const inPage = await playerInPage();
  const saidAs = (said?.captions ?? []).map((each) => `${each.language}${each.auto ? ' auto' : ''}`);
  check(
    !!said && said.video === `youtube:${TALK}` && saidAs.length > 1 && same(saidAs, inPage.captions),
    "the page script lists the captions YouTube's player holds for the video",
    `${saidAs.length} sets, among them ${saidAs.filter((each) => each.startsWith('en')).join(' and ')}; the page's own world holds ${inPage.captions.length}`
  );
  check(
    !!said && said.captions.every((each) => each.hasToken) && inPage.withToken === inPage.captions.length,
    "the player's token has arrived on every one of them",
    real.tokenSeen ? `first seen ${((real.tokenSeen - loadStarted) / 1000).toFixed(1)} s after the page began to load, which is when the panel was first read` : 'never seen'
  );
  const usual = (said?.captions ?? []).filter((each) => each.shownByDefault).map((each) => `${each.language}${each.auto ? ' auto' : ''}`);
  check(same(usual, ['en']), "it marks the uploader's English captions as the ones the player shows by default", JSON.stringify(usual));

  const mine = answersFor(TALK, 'the extension');
  const players = answersFor(TALK, 'the player');
  check(
    mine.length === 1 && mine[0].language === 'en' && mine[0].kind === null && mine[0].format === 'json3' && mine[0].client === 'WEB' && mine[0].withToken,
    "the extension asked YouTube once, for the uploader's English captions, with the player's token",
    JSON.stringify(mine)
  );
  if (real.last?.count > 0) {
    realFetch = `YouTube answered with ${mine[0]?.characters} characters, and the panel shows ${brief(real.last)}`;
    check(real.last.onePerLine && real.last.timing === 'cue', 'YouTube answered, and the panel shows the Transcript one sentence per line', JSON.stringify(real.last));
  } else {
    realFetch = `YouTube answered the extension with HTTP ${mine[0]?.status} and ${mine[0]?.characters} characters`;
    note(`NOT SHOWN: the fetch working. ${realFetch}.`, `the panel's reason: ${real.last?.reason}`);
    note(
      players.length ? `YouTube's player asked for captions itself and got ${players.map((each) => `HTTP ${each.status}, ${each.characters} characters`).join('; ')}` : "YouTube's player made no request for captions of its own",
      `captions switched on in the player: ${inPage.captionsOn}`
    );
    check(real.last?.line === FAILED_LINE && real.last.count === 0, `so the panel says "${FAILED_LINE}"`, journey(real.held));
  }

  // A video with no captions. Nothing is replaced here: this is YouTube's own page.
  await watch.goto(watchPage(NO_CAPTIONS), { waitUntil: 'domcontentloaded' });
  const none = await followTranscript('on the video with no captions', (now) => now.line === NONE_LINE);
  check(!!none.last && none.last.count === 0, `on a video with no captions the panel says "${NONE_LINE}"`, journey(none.held));
  check(answersFor(NO_CAPTIONS, 'the extension').length === 0, 'and the extension asks YouTube for nothing');

  // ------------------- the Transcript, with YouTube's answer taken from the record
  console.log("\n      The Transcript, with YouTube's answer replaced by the captions recorded on 2026-10-07");
  const answerFromTheRecord = async (route) => {
    const asked = new URL(route.request().url()).searchParams;
    const file = RECORDED[`${asked.get('v')}|${asked.get('kind') ?? ''}|${asked.get('lang')}`];
    if (route.request().resourceType() !== 'fetch' || !file) return route.continue();
    fromTheRecord.add(route.request());
    await pause(3000); // long enough to see the panel wait
    await route.fulfill({ status: 200, contentType: 'application/json; charset=UTF-8', body: readFileSync(join(recordedCaptions, file), 'utf8') });
  };
  const isCaptions = (address) => address.pathname === '/api/timedtext';
  await context.route(isCaptions, answerFromTheRecord);

  // Auto-generated captions only.
  await watch.goto(watchPage(DINNER), { waitUntil: 'domcontentloaded' });
  const dinner = await followTranscript('on loading the second video', settled);
  const dinnerLine = await transcriptInPanel(4);
  check(
    dinner.last?.count === 380 && dinner.last.onePerLine,
    'auto-generated captions: the Transcript appears one sentence per line',
    `${brief(dinner.last ?? {})}; ${JSON.stringify(dinner.last?.opening.map((each) => each[1]))}`
  );
  check(
    dinner.last?.timing === 'word' && dinner.last.source === 'auto-generated' && same(dinnerLine?.words, [['Please', 4], ['remain', 4.36], ['seated.', 4.72]]),
    'each word keeps its own time',
    JSON.stringify(dinnerLine?.words)
  );
  const waitedThenCame = dinner.held.map((each) => each.shows).slice(-2);
  check(
    waitedThenCame[0] === WAITING_LINE && dinner.last?.count > 0,
    'the panel shows a waiting line, then the Transcript, with nothing done to it in between',
    `${journey(dinner.held)}  (the answer is held back 3 s, so some of this wait is for the answer and not the token)`
  );
  check(same(answersFor(DINNER, 'the extension').map((each) => [each.from, each.kind, each.language, each.withToken]), [['the record', 'asr', 'en', true]]), 'asked for once: the auto-generated captions, the only ones this video has', JSON.stringify(answersFor(DINNER, 'the extension')));
  await followWhilePlaying();

  // Back to the first video, which has the uploader's captions among its 65.
  captionAnswers.length = 0;
  await watch.goto(WATCH_PAGE, { waitUntil: 'domcontentloaded' });
  const talk = await followTranscript('on loading the first video again', (now) => now.title === first.title && settled(now));
  check(
    talk.last?.count === 321 && talk.last.onePerLine && same(talk.last.opening.slice(0, 4), [[27.103, 'Good morning.'], [28.49, 'How are you?'], [29.702, '(Audience)'], [30.667, 'Good.']]),
    "moving to another video replaces the Transcript with that video's",
    journey(talk.held)
  );
  check(!talk.held.some((each) => each.title === first.title && each.shows.startsWith('380 ')), "and the video before's sentences are gone before this one is named");
  check(
    talk.last?.timing === 'cue' && talk.last.source === 'uploader' && same(answersFor(TALK, 'the extension').map((each) => [each.from, each.kind, each.language, each.withToken]), [['the record', null, 'en', true]]),
    "the uploader's captions are taken, in the language the video is spoken in, and are timed per cue",
    JSON.stringify(answersFor(TALK, 'the extension'))
  );
  await jumpByClicking();
  await until(() => shownByYouTube(watch), 30000);

  // ------------------------------------------------------------ the real player
  // YouTube plays adverts in the video's own element; the player gives no time while one runs.
  await until(() => watch.evaluate(() => !document.querySelector('.html5-video-player.ad-showing')), 90000);
  const answers = await helper.evaluate(async (tabId) => {
    const { createTabPlayer } = await import('./tab-player.js');
    const player = createTabPlayer(tabId);
    const video = await player.video();
    const timeBefore = await player.currentTime();
    await player.seekTo(90);
    const timeAfter = await player.currentTime();
    return { video, timeBefore, timeAfter };
  }, tabId);
  const elementTime = await watch.evaluate(() => document.querySelector('video.html5-main-video')?.currentTime ?? null);
  check(same(answers.video, first), 'the real player answers which video', JSON.stringify(answers.video));
  check(typeof answers.timeBefore === 'number', 'the real player answers the current time', `${answers.timeBefore} s`);
  check(
    typeof answers.timeAfter === 'number' && answers.timeAfter >= 90 && answers.timeAfter < 100 && elementTime >= 90 && elementTime < 100,
    'the real player seeks to a time',
    `asked for 90 s; it then answered ${answers.timeAfter} s, and the page's video element reads ${elementTime} s`
  );

  // -------------------------------------------- Highlights, made by selecting
  // The mouse here is the DevTools protocol's, sent to the side panel's own
  // target: Chrome hit-tests it, selects with it and clicks with it as it does
  // a hand's. The Transcript is still the recorded one: the uploader's
  // captions of the talk, timed per cue. The video stands at about 90 s, so
  // a jump to a Highlight's line, at 33 s, would show.
  console.log('\n      Highlights, made with a real drag in the real side panel (the Transcript is still from the record)');
  const SAVED_TALK = `video:youtube:${TALK}`;
  const hand = await mouseInPanel(devtools, helper, tabId);
  const keptNow = () => helper.evaluate(() => chrome.storage.local.get(null));
  const videoTime = () => watch.evaluate(() => document.querySelector('video.html5-main-video')?.currentTime ?? null);
  const timeBeforeMarking = await videoTime();
  const untouched = await highlightsInPanel(helper, tabId);
  const keptBefore = await keptNow();
  check(
    untouched?.count === 321 && untouched.lines.length === 0 && untouched.open === null && same(keptBefore[SAVED_TALK]?.highlights, []),
    'the two Highlights made and removed while the click that jumps was checked are gone: the panel holds no mark and none is kept',
    JSON.stringify({ lines: untouched?.lines, kept: keptBefore })
  );

  // Line 5 is "I've been blown away by the whole thing.", one cue from 33.408 to 35.729 s.
  const dragged = await hand.drag({ line: 5, word: 2 }, { line: 5, word: 7 });
  check(
    dragged.selected === 'blown away by the whole thing.',
    'pressing on one word and moving to another selects the words between, in the real side panel',
    `from "${dragged.from}" to "${dragged.to}": while the button was down the panel's selection read ${JSON.stringify(dragged.selected)}; the panel is a "${hand.targetType}" target, user-select "${untouched?.canSelect}"`
  );
  const madeOne = await highlightsInPanel(helper, tabId);
  check(
    same(madeOne?.lines, ["I've been «blown away by the whole thing.»"]) && madeOne.selected === '' && madeOne.open === null,
    'letting go makes a Highlight of exactly those words, with no further step',
    JSON.stringify(madeOne)
  );
  const afterFirst = await keptNow();
  const [savedFirst] = afterFirst[SAVED_TALK]?.highlights ?? [];
  check(
    sameWhateverTheOrder(afterFirst, {
      formatVersion: 1,
      [SAVED_TALK]: {
        title: first.title,
        channel: first.channel,
        highlights: [{ id: savedFirst?.id, start: 33.408, end: 35.729, words: 'blown away by the whole thing.', transcript: { language: 'en', source: 'uploader' }, made: savedFirst?.made }],
      },
    }),
    "it is kept in the extension's local storage: the video's title and channel, a format version, and the Highlight with its cue's time range, its words, its Transcript and when it was made",
    JSON.stringify(afterFirst)
  );
  check(
    typeof savedFirst?.id === 'string' && savedFirst.id.length > 0 && Math.abs(Date.now() - Date.parse(savedFirst.made)) < 60000,
    'the Highlight has an id of its own and the time it was made',
    JSON.stringify([savedFirst?.id, savedFirst?.made])
  );

  // A second one that starts inside the first and ends in the next line, "In fact, I'm leaving."
  const draggedOn = await hand.drag({ line: 5, word: 5 }, { line: 6, word: 1 });
  const overlapped = await highlightsInPanel(helper, tabId);
  const afterSecond = (await keptNow())[SAVED_TALK]?.highlights ?? [];
  check(
    draggedOn.selected === 'the whole thing. In fact,' && same(overlapped?.lines, ["I've been «blown away by «the whole thing.»»", "«In fact,» I'm leaving."]) && overlapped.ids.length === 2,
    'a selection across two sentences makes one Highlight, with a mark in each line',
    `${JSON.stringify(draggedOn.selected)} → ${JSON.stringify(overlapped?.lines)}`
  );
  check(
    same(afterSecond.map((each) => [each.words, each.start, each.end]), [['blown away by the whole thing.', 33.408, 35.729], ['the whole thing. In fact,', 33.408, 37.245]]) && afterSecond[0].id === savedFirst?.id,
    'it overlaps the first, and both are kept, each as it was made, the second with the time range of both its cues',
    JSON.stringify(afterSecond.map((each) => [each.words, each.start, each.end]))
  );

  // A click on a Highlight.
  await hand.click({ line: 5, word: 3 });
  const openedOne = await highlightsInPanel(helper, tabId);
  check(
    openedOne?.open === 'blown away by the whole thing.' && same(openedOne.offers, ['Remove highlight', 'Close', 'Yellow', 'Green', 'Purple']),
    'a click on a Highlight opens it, with the offer to remove it and, beside that, the three colours',
    JSON.stringify({ open: openedOne?.open, offers: openedOne?.offers })
  );
  await hand.click({ line: 5, word: 6 });
  const openedInner = await highlightsInPanel(helper, tabId);
  check(openedInner?.open === 'the whole thing. In fact,', 'where two Highlights share a word, a click there opens the one that starts later', JSON.stringify(openedInner?.open));
  const timeAfterClicks = await videoTime();
  check(
    timeBeforeMarking >= 90 && timeAfterClicks >= timeBeforeMarking && timeAfterClicks < timeBeforeMarking + 60,
    'neither the drags nor the clicks on a Highlight moved the video',
    `the video was at ${timeBeforeMarking} s before them and at ${timeAfterClicks} s after; the Highlights are at 33 s`
  );

  // Removing the first one.
  await hand.click({ line: 5, word: 3 });
  await hand.click({ id: 'remove-highlight' });
  const removed = await highlightsInPanel(helper, tabId);
  const afterRemoving = (await keptNow())[SAVED_TALK]?.highlights ?? [];
  const LEFT = ["I've been blown away by «the whole thing.»", "«In fact,» I'm leaving."];
  check(
    same(removed?.lines, LEFT) && removed.open === null && same(afterRemoving.map((each) => each.words), ['the whole thing. In fact,']),
    'a click on "Remove highlight" takes it off the panel and out of storage, and leaves the other',
    JSON.stringify({ lines: removed?.lines, kept: afterRemoving.map((each) => each.words) })
  );

  // A click that slips a few pixels selects a letter. It is still a click.
  const slippedOnWords = await hand.slip({ line: 8, word: 2 });
  const afterSlip = await highlightsInPanel(helper, tabId);
  check(
    slippedOnWords.selected.length === 1 && same(afterSlip?.lines, LEFT) && afterSlip.open === null && (await keptNow())[SAVED_TALK]?.highlights.length === 1,
    'a click that slips 4 px across a letter of a plain word makes no Highlight',
    `on "${slippedOnWords.on}": while the button was down the panel's selection read ${JSON.stringify(slippedOnWords.selected)}`
  );
  // Whether such a click should jump, as a clean click on a plain word does, is nobody's rule yet.
  const timeAfterSlip = await videoTime();
  note(
    Math.abs(timeAfterSlip - 43.096) < 3 ? 'that slip moved the video to the start of its line' : 'that slip did not move the video either, so a click that slips on a plain word does nothing at all',
    `the video is at ${timeAfterSlip} s and the line starts at 43.096 s; following playback takes the letter a slip selects for the end of a selection`
  );
  const slippedOnMark = await hand.slip({ line: 5, word: 6 });
  const openedBySlip = await highlightsInPanel(helper, tabId);
  check(
    slippedOnMark.selected.length === 1 && openedBySlip?.open === 'the whole thing. In fact,' && same(openedBySlip.lines, LEFT),
    'and the same slip on a Highlight opens it',
    `on "${slippedOnMark.on}": selected ${JSON.stringify(slippedOnMark.selected)}, then open: ${JSON.stringify(openedBySlip?.open)}`
  );
  await hand.click({ id: 'close-highlight' });
  const closed = await highlightsInPanel(helper, tabId);
  check(closed?.open === null && same(closed.lines, LEFT), 'a click on "Close" shuts it and removes nothing', JSON.stringify({ open: closed?.open, lines: closed?.lines }));

  // ------------------------------------------------------------ three colours
  // The Highlight that is left was made by a drag, and nothing has given it a
  // colour. It has a mark in each of two lines.
  console.log('\n      The three colours, picked with real clicks in the real side panel');
  const YELLOW = 'rgb(255, 226, 122)'; // the prototype's, #ffe27a
  const ONE_LEFT = 'the whole thing. In fact,';
  const coloursKept = async () => ((await keptNow())[SAVED_TALK]?.highlights ?? []).map((each) => [each.words, each.colour ?? null]);
  const madeByDrag = await coloursInPanel(helper, tabId);
  check(
    madeByDrag?.marks.length === 2 && madeByDrag.marks.every((mark) => mark.colour === null && mark.background === YELLOW) && same(await coloursKept(), [[ONE_LEFT, null]]),
    "a Highlight made by a drag is in the default colour, the prototype's yellow: nothing asked for a colour and none is saved",
    JSON.stringify({ marks: madeByDrag?.marks, kept: await coloursKept() })
  );

  await hand.click({ line: 5, word: 6 });
  const offered = await coloursInPanel(helper, tabId);
  check(
    same(offered?.choices.map((choice) => choice.name), ['Yellow', 'Green', 'Purple']) && offered.choices[0].background === YELLOW && same(offered.pressed, ['Yellow']),
    'opened, it offers the three colours, with the one it is in pressed',
    JSON.stringify({ choices: offered?.choices, pressed: offered?.pressed })
  );
  const [, GREEN, PURPLE] = offered.choices.map((choice) => choice.background);

  await hand.click({ id: 'colour-green' });
  const green = await coloursInPanel(helper, tabId);
  check(
    green?.marks.length === 2 && green.marks.every((mark) => mark.colour === 'green' && mark.background === GREEN) && same(await coloursKept(), [[ONE_LEFT, 'green']]),
    'a click on the green one recolours its mark in both lines, and the colour is saved with it',
    JSON.stringify({ marks: green?.marks, kept: await coloursKept() })
  );
  check(green?.open === ONE_LEFT && same(green.pressed, ['Green']), 'the box stays open, with green now the one pressed', JSON.stringify({ open: green?.open, pressed: green?.pressed }));

  await hand.click({ id: 'colour-yellow' });
  const yellowAgain = await coloursInPanel(helper, tabId);
  const keptYellowAgain = (await keptNow())[SAVED_TALK]?.highlights ?? [];
  check(
    yellowAgain?.marks.length === 2 && yellowAgain.marks.every((mark) => mark.colour === null && mark.background === YELLOW) && same(yellowAgain.pressed, ['Yellow']) && sameWhateverTheOrder(keptYellowAgain, afterRemoving),
    'the default can be picked again, and the Highlight is then kept exactly as it was before it had a colour',
    JSON.stringify({ marks: yellowAgain?.marks, kept: keptYellowAgain })
  );

  // It is left purple. Two more are made beside it, so that all three colours
  // are on show at once: one around its first line, and one in line 8, which
  // is then given green.
  await hand.click({ id: 'colour-purple' });
  await hand.click({ id: 'close-highlight' });
  await hand.drag({ line: 5, word: 2 }, { line: 5, word: 7 });
  await hand.drag({ line: 8, word: 0 }, { line: 8, word: 3 });
  await hand.click({ line: 8, word: 1 });
  await hand.click({ id: 'colour-green' });
  await hand.click({ id: 'close-highlight' });
  const three = await coloursInPanel(helper, tabId);
  check(
    same(three?.marks.map((mark) => [mark.words, mark.colour, mark.inside]), [
      ['blown away by the whole thing.', null, false],
      ['the whole thing.', 'purple', true],
      ['In fact,', 'purple', false],
      ['There have been three', 'green', false],
    ]) && same(await coloursKept(), [['blown away by the whole thing.', null], [ONE_LEFT, 'purple'], ['There have been three', 'green']]),
    'each Highlight has its own colour: one dragged around the purple one is yellow, whatever was picked last, and giving another green leaves both as they are',
    JSON.stringify({ marks: three?.marks.map((mark) => [mark.words, mark.colour, mark.inside]), kept: await coloursKept() })
  );

  // What Chrome paints, in the light scheme and in the dark. The panel's own
  // background changes with the scheme; a mark and its words do not.
  const paintedIn = {};
  for (const scheme of ['light', 'dark']) {
    await hand.scheme(scheme);
    paintedIn[scheme] = await coloursInPanel(helper, tabId);
  }
  await hand.scheme(null);
  const shades = (painted) => painted.marks.map((mark) => `${mark.colour ?? 'yellow'}${mark.inside ? ', inside another' : ''}: words ${mark.ink} on ${mark.background}, ${contrast(mark.ink, mark.background).toFixed(1)} to 1`);
  const alone = (painted) => painted.marks.filter((mark) => !mark.inside).map((mark) => mark.background);
  check(
    paintedIn.light.panel !== paintedIn.dark.panel && same(paintedIn.light.marks, paintedIn.dark.marks) && same(alone(paintedIn.light), [YELLOW, PURPLE, GREEN]) && new Set(alone(paintedIn.light)).size === 3,
    'the three colours are three different colours on the page, the same ones in the light scheme and in the dark',
    `the panel is ${paintedIn.light.panel} in the light scheme and ${paintedIn.dark.panel} in the dark; the marks are ${alone(paintedIn.light).join(', ')} in both`
  );
  check(
    paintedIn.light.marks.every((mark) => contrast(mark.ink, mark.background) >= 7),
    'the words on a mark of each colour are at least 7 to 1 against it, the darker shade inside another mark included',
    shades(paintedIn.light).join('\n        ')
  );
  note(
    'how far each colour is from the panel behind it, which is how well the edge of a mark shows',
    ['light', 'dark'].map((scheme) => `${scheme}: ${alone(paintedIn[scheme]).map((background) => `${contrast(background, paintedIn[scheme].panel).toFixed(1)} to 1`).join(', ')}`).join('; ')
  );

  // The two made here are removed, so that the lines are left as they were, with their one Highlight now purple.
  await hand.click({ line: 8, word: 1 });
  await hand.click({ id: 'remove-highlight' });
  await hand.click({ line: 5, word: 3 });
  await hand.click({ id: 'remove-highlight' });
  const leftPurple = await coloursInPanel(helper, tabId);
  check(
    same((await highlightsInPanel(helper, tabId))?.lines, LEFT) && leftPurple.marks.every((mark) => mark.colour === 'purple' && mark.background === PURPLE) && same(await coloursKept(), [[ONE_LEFT, 'purple']]),
    'with those two removed, the one that was left before is the one left now, and it is purple',
    JSON.stringify({ marks: leftPurple?.marks.map((mark) => [mark.words, mark.colour, mark.background]), kept: await coloursKept() })
  );

  // Nothing is sent anywhere. The panel's requests have been watched since before the first drag.
  const sentMeanwhile = [...hand.requests];
  await helper.evaluate((tabId) => chrome.extension.getViews().find((view) => view.location.search === `?tabId=${tabId}`).fetch(chrome.runtime.getURL('manifest.json')).then(() => true), tabId);
  await pause(300);
  check(
    sentMeanwhile.length === 0 && hand.requests.length === 1,
    'while Highlights were made, opened, recoloured and removed, the panel made no request at all',
    `seen: ${JSON.stringify(sentMeanwhile)}; a request the check then made from the panel on purpose was seen (${hand.requests.length}), so the watch works`
  );
  const synced = await helper.evaluate(() => chrome.storage.sync.get(null));
  check(same(synced, {}), 'and nothing is in the storage Chrome syncs', JSON.stringify(synced));

  // ------------------------------------------------------------------ H and U
  // Real key presses, in the real side panel and in the watch page. The video
  // is paused and put at a known time before each first H, so which sentence
  // was being said 1.2 s earlier is known here from the recorded captions:
  //   11  67.261 s  "No idea how this may play out."
  //   12  70.27 s   "I have an interest in education."
  //   13  71.916 s  "Actually, what I find is, everybody has an interest in education."
  //   14  76.352 s  "Don't you?"
  //   15  77.693 s  "I find this very interesting."
  //   16  79.119 s  "If you're at a dinner party, … at dinner parties, frankly."   (two cues, 79.119 to 85.846 s)
  //   17  85.87 s   (Laughter)
  //   18  89.69 s   "If you work in education, you're not asked."
  // The 5 s after a Highlight is made are counted on the real clock, so this part waits them out.
  console.log('\n      H and U, with real key presses in the real side panel and in the page (the Transcript is still from the record)');
  const [L11, L12, L13, L14, L15] = ['No idea how this may play out.', 'I have an interest in education.', 'Actually, what I find is, everybody has an interest in education.', "Don't you?", 'I find this very interesting.'];
  const L16 = "If you're at a dinner party, and you say you work in education -- actually, you're not often at dinner parties, frankly.";
  const m = (line) => `«${line}»`;
  const keptOfTalk = async () => ((await keptNow())[SAVED_TALK]?.highlights ?? []).map((each) => ({ id: each.id, start: each.start, end: each.end, words: each.words }));
  const [leftKept] = await keptOfTalk();
  /** Pauses the video and puts it at a time, with the extension's own seek. Gives the video as it then stands. */
  const standAt = async (seconds) => {
    await until(() => watch.evaluate(() => !document.querySelector('.html5-video-player.ad-showing')), 90000);
    await askPlayer('pauseVideo').catch(() => {});
    await watch.evaluate(() => document.querySelector('video.html5-main-video')?.pause());
    await helper.evaluate(({ tabId, seconds }) => chrome.tabs.sendMessage(tabId, { type: 'seek-to', seconds }), { tabId, seconds });
    return until(async () => {
      const now = await videoNow();
      return now.paused && !now.advert && Math.abs(now.time - seconds) < 0.05 ? now : null;
    }, 5000);
  };
  // Two listeners of the page's own, to show what the extension's leaves of a key. The extension
  // hears a key first, on the window, on the way down. "next" is the next stop on that way, the
  // document: a key the extension stopped or cancelled would not come there, or would come cancelled.
  // "last" is the window again on the way back up, the end of the key's way through the page.
  await watch.evaluate(() => {
    window.keysHeard = [];
    document.addEventListener('keydown', (event) => window.keysHeard.push({ key: event.key, by: 'next', cancelled: event.defaultPrevented }), true);
    window.addEventListener('keydown', (event) => window.keysHeard.push({ key: event.key, by: 'last', cancelled: event.defaultPrevented }));
  });
  const keysHeard = () => watch.evaluate(() => window.keysHeard.splice(0));
  const heardBy = (heard, by) => heard.filter((each) => each.by === by).map((each) => each.key).join('');
  // What YouTube could change in answer to a key, as the hand check tracked it.
  const youTubeNow = () =>
    watch.evaluate(() => {
      const video = document.querySelector('video.html5-main-video');
      return {
        paused: video?.paused,
        muted: video?.muted,
        speed: video?.playbackRate,
        volume: video?.volume,
        time: video?.currentTime,
        fullscreen: !!document.fullscreenElement,
        theater: !!document.querySelector('ytd-watch-flexy[theater], ytd-watch-grid[theater]'),
        captions: document.querySelector('.ytp-subtitles-button')?.getAttribute('aria-pressed') ?? null,
        miniplayer: !!document.querySelector('ytd-miniplayer[active]'),
        address: location.href,
      };
    });
  const focusInPanel = () => changePanel(() => `${document.activeElement?.id || document.activeElement?.tagName}, the panel's document ${document.hasFocus() ? 'has' : 'has not'} the window's focus`);

  /** A Highlight as it is kept, whole, by its id. */
  const keptWhole = async (id) => ((await keptNow())[SAVED_TALK]?.highlights ?? []).find((each) => each.id === id);
  /** The marks of the lines that are these and no others, as Chrome paints them. */
  const paintedOn = async (...lines) => ((await coloursInPanel(helper, tabId))?.marks ?? []).filter((mark) => lines.includes(mark.words));

  // Any Highlight made in the last 5 s is waited out before the first H here. The wait is from when H
  // grew a Highlight made by a drag as well: the first run of this part did not wait, and H added two
  // sentences to the Highlight a drag had left 5 s before. Since ticket 23 H grows only a Highlight
  // that H made, and takes a sentence afresh after a drag, so the wait is no longer needed. It is
  // left in: nothing here shows the new rule in the real panel, and the wait keeps this part as it ran.
  const newest = Math.max(0, ...((await keptNow())[SAVED_TALK]?.highlights ?? []).map((each) => Date.parse(each.made)));
  await pause(Math.max(0, newest + 5500 - Date.now()));

  // H with keyboard focus in the panel.
  const stoodAt72 = await standAt(72.5);
  const panelFocus = await focusInPanel();
  await pressInPanel('h');
  const hInPanel = await marksBecome([...LEFT, m(L12)]);
  const keptA = (await keptOfTalk()).find((each) => each.id !== leftKept?.id);
  check(
    !!stoodAt72 && !!hInPanel && hInPanel.ids.length === 2 && same(keptA && [keptA.start, keptA.end, keptA.words], [70.27, 71.892, L12]),
    'H pressed in the side panel makes a Highlight of the sentence that was being said 1.2 s earlier',
    `the video stood at ${stoodAt72?.time} s, paused; 1.2 s earlier line 12 was being said, and the line after it starts at 71.916 s. Marked: ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}; kept: ${JSON.stringify(keptA)}. Focus in the panel: ${panelFocus}`
  );
  const paintedA = await paintedOn(L12);
  const wholeA = await keptWhole(keptA?.id);
  check(
    paintedA.length === 1 && paintedA[0].colour === null && paintedA[0].background === YELLOW && !!wholeA && !('colour' in wholeA),
    `a Highlight made with H is in the default colour: its mark is painted the prototype's yellow, ${YELLOW}, and no colour is saved with it`,
    JSON.stringify({ mark: paintedA[0], kept: wholeA })
  );

  // It is given green with real clicks, and then H again, inside its 3 s: the sentence before is added, and it stays green.
  await hand.click({ line: 12, word: 1 });
  await hand.click({ id: 'colour-green' });
  const greenA = await keptWhole(keptA?.id);
  const buttonFocus = await focusInPanel();
  await pressInPanel('h');
  const hAgain = await marksBecome([...LEFT, m(L11), m(L12)]);
  const keptGrown = (await keptOfTalk()).find((each) => each.id === keptA?.id);
  check(
    !!hAgain && hAgain.ids.length === 2 && same(keptGrown && [keptGrown.start, keptGrown.end, keptGrown.words], [67.261, 71.892, `${L11} ${L12}`]),
    'H again within 3 s adds the sentence before to that same Highlight',
    `marked: ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}; kept under the same id: ${JSON.stringify(keptGrown)}. Focus in the panel: ${buttonFocus}`
  );
  const paintedGrown = await paintedOn(L11, L12);
  check(
    greenA?.colour === 'green' && paintedGrown.length === 2 && paintedGrown.every((mark) => mark.colour === 'green' && mark.background === GREEN) && (await keptWhole(keptA?.id))?.colour === 'green',
    'a Highlight given a colour and then grown with H keeps the colour: both its lines are painted green, and green is still saved with it',
    JSON.stringify({ marks: paintedGrown.map((mark) => [mark.words, mark.colour, mark.background]), kept: await keptWhole(keptA?.id) })
  );
  // U, twice, in the panel.
  await pressInPanel('u');
  const uOnce = await marksBecome([...LEFT, m(L12)]);
  const paintedBack = await paintedOn(L12);
  check(
    !!uOnce && sameWhateverTheOrder(await keptWhole(keptA?.id), greenA) && paintedBack.length === 1 && paintedBack[0].background === GREEN,
    'U pressed in the side panel takes back the sentence that H again added: what is kept is exactly the record that was there, green included',
    JSON.stringify({ kept: await keptWhole(keptA?.id), before: greenA, mark: paintedBack[0] })
  );
  await pressInPanel('u');
  const uTwice = await marksBecome(LEFT);
  check(!!uTwice && same(await keptOfTalk(), [leftKept]) && uTwice.open === null, 'and U again takes back the Highlight that H made, and the box that was open on it shuts', JSON.stringify(await keptOfTalk()));

  // H with keyboard focus in the page, on YouTube's player, with a bracketed sound just spoken.
  const stoodAt88 = await standAt(88.5);
  const pageFocus = await focusThePlayer();
  await keysHeard();
  const youTubeBefore = await youTubeNow();
  const pressed = [Date.now()]; // when each H from here on was pressed, to set against the 3 s
  await pressInPage('h');
  const hInPage = await marksBecome([...LEFT, m(L16)]);
  const keptB = (await keptOfTalk()).find((each) => each.id !== leftKept?.id);
  const paintedB = await paintedOn(L16);
  check(
    !!stoodAt88 && !!hInPage && same(keptB && [keptB.start, keptB.end, keptB.words], [79.119, 85.846, L16]),
    'H pressed in the page makes one too, and skips a bracketed sound: with (Laughter) just spoken it takes what was said before it',
    `the video stood at ${stoodAt88?.time} s, paused; 1.2 s earlier line 17, (Laughter), was on. Marked: ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}; kept: ${JSON.stringify(keptB)}. Focus in the page: ${pageFocus}`
  );
  check(
    paintedB.length === 1 && paintedB[0].colour === null && paintedB[0].background === YELLOW && !('colour' in ((await keptWhole(keptB?.id)) ?? { colour: 0 })),
    'and that one is yellow too, though the Highlight a colour was last picked for was green',
    JSON.stringify({ mark: paintedB[0], kept: await keptWhole(keptB?.id) })
  );
  await pause(600); // as long as the hand check gave YouTube to answer a key
  const youTubeAfter = await youTubeNow();
  const heardOfH = await keysHeard();
  check(
    same(heardOfH.filter((each) => each.by === 'next'), [{ key: 'h', by: 'next', cancelled: false }]) && heardBy(heardOfH, 'last') === 'h' && same(youTubeAfter, youTubeBefore),
    "the extension left the key to YouTube: it went on through the page, not stopped and not cancelled, and nothing of YouTube's changed",
    `listeners of the page's own heard ${JSON.stringify(heardOfH)}: "next" is the next stop after the extension's, "last" the end of the key's way. YouTube before and after: ${JSON.stringify(youTubeAfter)}`
  );

  // The 3 s start again with each H. Three more, some 2 s apart: each comes inside the 3 s of the
  // one before it and past the 3 s of the one before that.
  const seconds = (ms) => (ms / 1000).toFixed(1);
  const since = (earlier) => pressed.at(-1) - pressed.at(-1 - earlier);
  await pause(1200);
  pressed.push(Date.now());
  await pressInPage('h');
  const grewOnce = await marksBecome([...LEFT, m(L15), m(L16)]);
  await pause(1700);
  pressed.push(Date.now());
  await pressInPanel('h');
  const grewTwice = await marksBecome([...LEFT, m(L14), m(L15), m(L16)]);
  const twoBack = since(2);
  await pause(1700);
  pressed.push(Date.now());
  await pressInPage('h');
  const grewThrice = await marksBecome([...LEFT, m(L13), m(L14), m(L15), m(L16)]);
  const keptLong = (await keptOfTalk()).find((each) => each.id === keptB?.id);
  const gaps = [pressed[1] - pressed[0], pressed[2] - pressed[1], pressed[3] - pressed[2]];
  check(
    !!grewOnce && !!grewTwice && !!grewThrice && grewThrice.ids.length === 2 && same(keptLong && [keptLong.start, keptLong.end, keptLong.words], [71.916, 85.846, [L13, L14, L15, L16].join(' ')]),
    'H again, three times more, in the page and in the panel: each adds the sentence before to the same Highlight',
    `marked: ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}; kept under the same id from ${keptLong?.start} s to ${keptLong?.end} s`
  );
  check(
    !!grewTwice && !!grewThrice && gaps.every((gap) => gap < 3000) && twoBack > 3000 && since(2) > 3000,
    'and the 3 s start again with each: the later ones came more than 3 s after the H before the last, and still added a sentence',
    `pressed ${gaps.map(seconds).join(' s, ')} s apart by this script's clock; the third H came ${seconds(twoBack)} s after the first, and the fourth ${seconds(since(2))} s after the second`
  );
  // Once the 3 s are over, H takes a sentence afresh. The video stands at 88.5 s, so that is line 16
  // again, which is now part of a longer Highlight and not one itself.
  await pause(3300);
  await standAt(88.5);
  pressed.push(Date.now());
  await pressInPage('h');
  const afresh = await marksBecome([...LEFT, m(L13), m(L14), m(L15), `«${m(L16)}»`]);
  const keptC = (await keptOfTalk()).find((each) => ![leftKept?.id, keptB?.id].includes(each.id));
  check(
    since(1) > 3000 && !!afresh && afresh.ids.length === 3 && same(keptC && [keptC.start, keptC.end, keptC.words], [79.119, 85.846, L16]),
    'H once the 3 s are over adds no sentence: it makes a Highlight of the sentence just spoken, inside the longer one',
    `${seconds(since(1))} s after the H before it. Marked: ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}; kept: ${JSON.stringify(keptC)}`
  );
  // That sentence is now a Highlight. Once its 3 s are over too, H on it makes no second one.
  await pause(3300);
  await standAt(88.5);
  const keptBeforeSame = await keptOfTalk();
  pressed.push(Date.now());
  await pressInPage('h');
  await pause(1000);
  const sameAgain = await highlightsInPanel(helper, tabId);
  check(
    since(1) > 3000 && sameAgain?.ids.length === 3 && same(await keptOfTalk(), keptBeforeSame) && keptBeforeSame.length === 3 && same(sameAgain.lines, afresh?.lines),
    'H on a sentence that is already a Highlight makes no second one',
    `${seconds(since(1))} s after the H that made it, with the video at 88.5 s again: ${sameAgain?.ids.length} Highlights on the panel and ${keptBeforeSame.length} kept, as before`
  );

  // Keys typed into a text field are the text's. U would take back the last Highlight, and H would make
  // another of line 16 or grow one, so either would show. YouTube's search box, then a field of the
  // check's own that can be edited as a comment box can: logged out, YouTube opens none.
  const searchBox = 'input[name="search_query"]';
  await keysHeard();
  const inSearchBox = await watch.focus(searchBox, { timeout: 5000 }).then(() => true, () => false);
  await watch.keyboard.type('uh');
  await pause(1000);
  const typedInSearch = await watch.evaluate((box) => ({ value: document.querySelector(box)?.value, focusOn: document.activeElement?.name || document.activeElement?.tagName }), searchBox);
  const afterSearch = await highlightsInPanel(helper, tabId);
  check(
    inSearchBox && typedInSearch.value === 'uh' && typedInSearch.focusOn === 'search_query' && same(afterSearch?.lines, sameAgain?.lines) && same(await keptOfTalk(), keptBeforeSame),
    "U and H typed into YouTube's search box go into the box and do nothing else",
    `the box reads ${JSON.stringify(typedInSearch.value)}, with focus on "${typedInSearch.focusOn}"; the panel's Highlights and what is kept are as they were`
  );
  await watch.evaluate((box) => {
    const search = document.querySelector(box);
    if (search) search.value = '';
    search?.dispatchEvent(new Event('input', { bubbles: true }));
    const field = document.createElement('div');
    field.id = 'check-editable';
    field.contentEditable = 'true';
    field.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;min-width:80px;background:#fff;color:#000';
    document.body.append(field);
    field.focus();
  }, searchBox);
  await watch.keyboard.type('uh');
  await pause(1000);
  const typedInField = await watch.evaluate(() => {
    const field = document.getElementById('check-editable');
    const typed = { text: field.textContent, focusOn: document.activeElement?.id };
    field.remove();
    return typed;
  });
  check(
    typedInField.text === 'uh' && typedInField.focusOn === 'check-editable' && same((await highlightsInPanel(helper, tabId))?.lines, sameAgain?.lines) && same(await keptOfTalk(), keptBeforeSame),
    'nor do they in a field that is edited in place, as a comment is',
    `a field of the check's own, put on the page for this: it reads ${JSON.stringify(typedInField.text)}`
  );
  const heardTyped = await keysHeard();
  check(
    heardBy(heardTyped, 'next') === 'uhuh' && heardTyped.filter((each) => each.by === 'next').every((each) => !each.cancelled),
    'and the extension stopped and cancelled none of those four keys either',
    `the page's next listener after the extension's heard "${heardBy(heardTyped, 'next')}", and the last in line "${heardBy(heardTyped, 'last')}": whatever is missing there, the page itself stopped`
  );

  // U undoes a removal. The longer Highlight is opened by a click on line 14, which only it covers, and removed.
  await hand.click({ line: 14, word: 0 });
  await hand.click({ id: 'remove-highlight' });
  const removedLong = await marksBecome([...LEFT, m(L16)]);
  await focusThePlayer();
  await pressInPage('u');
  const removalUndone = await marksBecome([...LEFT, m(L13), m(L14), m(L15), `«${m(L16)}»`]);
  check(
    !!removedLong && !!removalUndone && same(await keptOfTalk(), keptBeforeSame),
    'U pressed in the page undoes the removal of a Highlight: it is back, with the id, the time range and the words it had',
    `removed with a click on "Remove highlight", which left ${JSON.stringify(removedLong?.lines)}; after U: ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}`
  );
  // And U again goes further back, one change at a time, to where this part began.
  const goingBack = [
    [...LEFT, m(L13), m(L14), m(L15), m(L16)], // the Highlight made afresh is taken back
    [...LEFT, m(L14), m(L15), m(L16)], // then each of the three sentences H again added
    [...LEFT, m(L15), m(L16)],
    [...LEFT, m(L16)],
    LEFT, // then the Highlight itself
  ];
  const wentBack = [];
  for (const [step, lines] of goingBack.entries()) {
    await (step % 2 ? pressInPanel('u') : pressInPage('u'));
    wentBack.push(!!(await marksBecome(lines)));
  }
  check(
    wentBack.every(Boolean) && same(await keptOfTalk(), [leftKept]),
    'pressing U again goes further back, one change at a time: five more, in the page and in the panel by turns, undo everything H did here',
    `${JSON.stringify(wentBack)}; the panel is left with ${JSON.stringify((await highlightsInPanel(helper, tabId))?.lines)}, and what is kept with the one Highlight it had: ${same(await keptOfTalk(), [leftKept])}`
  );
  // No further U here: the next would undo the removal made with a click before this part, and the
  // parts after this one count on the panel as that removal left it.

  // ------------------------------------------------------------------- Notes
  // 1 of 2: with the video standing still, on the talk. The keys and the mouse are the protocol's,
  // in the real side panel. The video is paused and put at a known time before each N, so that the
  // Moment and the line a Note should follow are known here from the recorded captions:
  //   17  85.87 s   (Laughter)                                   the line being spoken at 88.5 s
  //   12  70.27 s   "I have an interest in education."          the line H takes at 72.5 s
  //    6  35.729 s  "In fact, I'm leaving."                     the second line of the Highlight that is left
  console.log('\n      Notes, written with real keys in the real side panel (the Transcript is still from the record)');
  const SAVED_DINNER = `video:youtube:${DINNER}`;
  const keptRecord = async () => (await keptNow())[SAVED_TALK];
  const leftWhole = await keptWhole(leftKept?.id);
  const requestsBeforeNotes = hand.requests.length;
  const noNotesYet = await notesNow();
  check(
    noNotesYet?.notes.length === 0 && noNotesYet.box === 'offer' && noNotesYet.pauseTicked === false && !('notes' in ((await keptRecord()) ?? { notes: 0 })) && !('settings' in (await keptNow())),
    'before any Note the panel draws none, the docked box offers to write one, "Pause the video while I write a Note" is not ticked, and nothing of Notes is kept',
    JSON.stringify({ notes: noNotesYet?.notes, box: noNotesYet?.box, ticked: noNotesYet?.pauseTicked, keys: Object.keys(await keptNow()) })
  );
  check(
    noNotesYet?.docked?.position === 'fixed' && Math.abs(noNotesYet.docked.gapBelow) < 1 && Math.abs(noNotesYet.docked.width - noNotesYet.docked.panelWidth) < 1,
    'that box is docked at the bottom of the panel, as wide as the panel',
    JSON.stringify(noNotesYet?.docked)
  );

  // N at a Moment, with the video standing at 88.5 s. What is typed has an h, a u and an n in it:
  // H would make a Highlight of line 16, U would bring back a Highlight removed earlier, and N
  // would start the Note afresh and empty the box.
  const stoodForNote = await standAt(88.5);
  await pressInPanel('n');
  const atMoment = await notesBecome(boxIsOpen);
  check(
    !!stoodForNote && atMoment?.box === 'Note at 1:28' && atMoment.written === '' && atMoment.focus === 'note-text' && atMoment.docked?.position === 'fixed' && Math.abs(atMoment.docked.gapBelow) < 1,
    'N pressed in the side panel, more than 5 s after any Highlight was made, opens a Note at the Moment: the docked box says its time, is empty, and has the keyboard',
    `the video stood at ${stoodForNote?.time} s; ${JSON.stringify({ box: atMoment?.box, written: atMoment?.written, focus: atMoment?.focus, hasFocus: atMoment?.hasFocus, docked: atMoment?.docked })}`
  );
  await typeInPanel('A human note, unnumbered.');
  const typedAtMoment = await notesNow();
  check(
    typedAtMoment?.written === 'A human note, unnumbered.' && same((await highlightsInPanel(helper, tabId))?.lines, LEFT) && same(await keptOfTalk(), [leftKept]),
    'keys typed into the box go into the box and are not taken as H, N or U: no Highlight is made, none comes back, and the Note is not started afresh',
    `the box reads ${JSON.stringify(typedAtMoment?.written)}; the panel's Highlights and what is kept are as they were`
  );
  await pressNamedInPanel('Escape');
  const cancelled = await notesBecome((now) => now.box === 'offer');
  check(!!cancelled && cancelled.notes.length === 0 && !('notes' in (await keptRecord())), 'Escape cancels: the box shuts, no Note is drawn and none is kept', JSON.stringify({ box: (await notesNow())?.box, kept: await keptRecord() }));

  // N again, pressed as soon as the box is seen shut. A field that is hidden keeps the keyboard for a
  // moment in Chrome, and an N pressed in that moment was once taken for a letter typed into it.
  await pressInPanel('n');
  const openedAgain = await notesBecome(boxIsOpen, 1500);
  check(!!openedAgain && openedAgain.written === '' && openedAgain.focus === 'note-text', 'N pressed straight after Escape opens the box again, empty', JSON.stringify({ box: (await notesNow())?.box, focus: (await notesNow())?.focus }));
  await typeInPanel('Education, again.');
  await pressNamedInPanel('Enter');
  const savedAtMoment = await notesBecome((now) => now.notes.length === 1 && now.box === 'offer');
  const recordWithNote = await keptRecord();
  const [momentKept] = recordWithNote?.notes ?? [];
  check(
    same(drawn(savedAtMoment), [['(Laughter)', '1:28', 'Education, again.', 'a Moment']]) && savedAtMoment.notes[0].afterStart === 85.87,
    'Enter saves it: the Note shows in the Transcript between the sentences around its Moment, with its time',
    `${JSON.stringify(savedAtMoment?.notes ?? (await notesNow())?.notes)}; the line it follows starts at 85.87 s and the next at 89.69 s`
  );
  check(
    sameWhateverTheOrder(recordWithNote, { title: first.title, channel: first.channel, highlights: [leftWhole], notes: [{ id: momentKept?.id, time: momentKept?.time, text: 'Education, again.', made: momentKept?.made }] }) &&
      Math.abs(momentKept.time - 88.5) < 0.05 &&
      typeof momentKept.id === 'string' &&
      Math.abs(Date.now() - Date.parse(momentKept.made)) < 60000,
    "it is kept in the video's record, beside its Highlights: its time, its text, when it was made and an id of its own, and nothing else",
    JSON.stringify(recordWithNote?.notes)
  );

  // A click on a Note's time jumps there. The video is put somewhere else first.
  await standAt(40);
  await clickNote('Education, again.', 'time');
  const jumpedToNote = await until(async () => {
    const now = await videoNow();
    return Math.abs(now.time - momentKept?.time) < 0.3 ? now : null;
  }, 3000);
  check(!!jumpedToNote, "a real click on the Note's time moves the video there", `the video stood at 40 s and is at ${(await videoNow()).time} s; the Note is at ${momentKept?.time} s`);

  // H, and N inside its 5 s: the Note goes on that Highlight.
  const stoodForH = await standAt(72.5);
  // The line being spoken at 72.5 s is line 13, and the panel is following: the click on a Note's
  // time resumed that. It is read here as it sits before a Note is drawn straight above it.
  let heldBeforeH = await readUntil((read) => read.place === 13 && (read.backToNow || isHeld(read)), 3000);
  if (heldBeforeH.backToNow) {
    await clickInPanel(await placeInPanel({ id: 'back-to-now' }));
    heldBeforeH = await readUntil((read) => read.place === 13 && !read.backToNow && isHeld(read), 3000);
  }
  const hPressed = Date.now();
  await pressInPanel('h');
  const madeForNote = await marksBecome([...LEFT, m(L12)]);
  await pressInPanel('n');
  const onJustMade = await notesBecome((now) => now.onHighlight !== null);
  const openForNote = await highlightsInPanel(helper, tabId);
  check(
    !!stoodForH && !!madeForNote && openForNote?.open === L12 && onJustMade?.box === null && onJustMade.onHighlight === '' && onJustMade.focus === 'highlight-note' && Date.now() - hPressed < 5000,
    'N pressed within 5 s of a Highlight being made opens a Note on it: the box for that Highlight opens, with an empty Note field that has the keyboard, and no Moment is taken',
    `${((Date.now() - hPressed) / 1000).toFixed(1)} s after the H; ${JSON.stringify({ open: openForNote?.open, field: onJustMade?.onHighlight, focus: onJustMade?.focus, box: onJustMade?.box, docked: onJustMade?.docked })}`
  );
  await typeInPanel('Everybody has one. You too?');
  await pressNamedInPanel('Enter');
  const savedOnHighlight = await notesBecome((now) => now.notes.length === 2 && now.onHighlight === null);
  const keptNoted = ((await keptRecord())?.highlights ?? []).find((each) => each.words === L12);
  check(
    same(drawn(savedOnHighlight), [[L12, '1:10', 'Everybody has one. You too?', 'a Highlight'], ['(Laughter)', '1:28', 'Education, again.', 'a Moment']]) && same((await highlightsInPanel(helper, tabId))?.lines, [...LEFT, m(L12)]),
    "Enter saves it: the Note shows after its Highlight, with the time the Highlight starts. Not a letter of it is the N that opened the box, and the h, n and u typed made no Highlight",
    JSON.stringify(savedOnHighlight?.notes ?? (await notesNow())?.notes)
  );
  check(
    !!keptNoted && same(Object.keys(keptNoted.note ?? {}).sort(), ['made', 'text']) && keptNoted.note.text === 'Everybody has one. You too?' && Math.abs(Date.now() - Date.parse(keptNoted.note.made)) < 60000 && !('notes' in keptNoted) && (await keptRecord()).notes.length === 1,
    'it is kept with its Highlight, as one more field of it: its text and when it was made',
    JSON.stringify(keptNoted)
  );

  // That Note was drawn straight above the line being spoken, and pushes it down by its own height.
  // The video stands still, so no next line comes to put the page right: the panel has to.
  const heldUnderNote = await readUntil((read) => read.place === 13 && isHeld(read), 2500);
  check(
    !heldBeforeH.late && !heldBeforeH.backToNow && !heldUnderNote.late && !heldUnderNote.backToNow && heldUnderNote.scrollY > heldBeforeH.scrollY + 10,
    'a Note drawn above the line being spoken pushes it down, and the panel brings it back to its height, with no "back to now"',
    `line 13 ${sits(heldUnderNote)}, as before the Note; the page went from ${Math.round(heldBeforeH.scrollY)} px to ${Math.round(heldUnderNote.scrollY)} px to keep it there`
  );

  // Once the 5 s are over, N is at the Moment again.
  await pause(Math.max(0, hPressed + 5300 - Date.now()));
  await pressInPanel('n');
  const atMomentAgain = await notesBecome(boxIsOpen);
  check(
    Date.now() - hPressed > 5000 && atMomentAgain?.box === 'Note at 1:12' && atMomentAgain.onHighlight === null,
    'N once those 5 s are over opens a Note at the Moment it was pressed, not on the Highlight',
    `${((Date.now() - hPressed) / 1000).toFixed(1)} s after the H, with the video at 72.5 s: ${JSON.stringify({ box: atMomentAgain?.box, field: atMomentAgain?.onHighlight })}`
  );
  await pressNamedInPanel('Escape');
  await notesBecome((now) => now.box === 'offer');

  // A click on a Highlight opens its Note for changing, beside what the box offered before.
  await hand.click({ line: 12, word: 1 });
  const clickedOpen = await notesNow();
  const clickedBox = await highlightsInPanel(helper, tabId);
  check(
    clickedBox?.open === L12 && same(clickedBox.offers, ['Remove highlight', 'Close', 'Yellow', 'Green', 'Purple']) && clickedOpen?.onHighlight === 'Everybody has one. You too?' && clickedOpen.focus === 'highlight-note',
    'a real click on a Highlight opens its Note for changing, in the box that offers to remove the Highlight and the three colours',
    JSON.stringify({ open: clickedBox?.open, offers: clickedBox?.offers, field: clickedOpen?.onHighlight, focus: clickedOpen?.focus, docked: clickedOpen?.docked })
  );
  await typeInPanel(' Even him.');
  await pressNamedInPanel('Enter');
  const changedNote = await notesBecome((now) => now.notes.some((note) => note.text === 'Everybody has one. You too? Even him.'));
  const keptChanged = ((await keptRecord())?.highlights ?? []).find((each) => each.words === L12);
  check(
    !!changedNote && changedNote.notes.filter((note) => note.on === 'a Highlight').length === 1 && keptChanged?.note.made === keptNoted?.note.made,
    'what is typed there changes the Note the Highlight has: it still carries one, kept with the time it was first made',
    JSON.stringify(keptChanged?.note)
  );

  // Saved empty, the Note is removed and the Highlight stays. The field is emptied with a real Backspace over everything in it.
  await hand.click({ line: 12, word: 1 });
  await changePanel(() => document.getElementById('highlight-note').select());
  await pressNamedInPanel('Backspace');
  const emptied = await notesNow();
  await pressNamedInPanel('Enter');
  const removedByEmpty = await notesBecome((now) => now.notes.length === 1 && now.onHighlight === null);
  const keptEmptied = ((await keptRecord())?.highlights ?? []).find((each) => each.words === L12);
  check(
    emptied?.onHighlight === '' && !!removedByEmpty && same((await highlightsInPanel(helper, tabId))?.lines, [...LEFT, m(L12)]) && !!keptEmptied && !('note' in keptEmptied),
    'saving it empty removes the Note, and the Highlight stays, kept with no Note at all',
    JSON.stringify({ field: emptied?.onHighlight, notes: (await notesNow())?.notes.map((note) => note.text), kept: keptEmptied })
  );

  // U undoes the last change to a Note, and again the change before it.
  await pressInPanel('u');
  const noteBack = await notesBecome((now) => now.notes.some((note) => note.text === 'Everybody has one. You too? Even him.'));
  const keptBack = ((await keptRecord())?.highlights ?? []).find((each) => each.words === L12);
  await pressInPanel('u');
  const noteAsFirst = await notesBecome((now) => now.notes.some((note) => note.text === 'Everybody has one. You too?'));
  check(
    !!noteBack && sameWhateverTheOrder(keptBack, keptChanged) && !!noteAsFirst && sameWhateverTheOrder(((await keptRecord())?.highlights ?? []).find((each) => each.words === L12), keptNoted),
    'U pressed in the side panel undoes the last change to a Note: the Note that was removed is back as it was, and U again takes back the change before that',
    JSON.stringify((await notesNow())?.notes.map((note) => note.text))
  );

  // A Note is deleted with its ×, and U pressed in the page brings it back.
  await clickNote('Everybody has one. You too?', 'delete');
  const deletedOn = await notesBecome((now) => now.notes.length === 1);
  const keptDeleted = ((await keptRecord())?.highlights ?? []).find((each) => each.words === L12);
  await focusThePlayer();
  await pressInPage('u');
  const undeleted = await notesBecome((now) => now.notes.length === 2);
  check(
    !!deletedOn && !!keptDeleted && !('note' in keptDeleted) && same(drawn(undeleted)[0], [L12, '1:10', 'Everybody has one. You too?', 'a Highlight']),
    'a real click on the × of a Note deletes it and leaves its Highlight, and U pressed in the page brings the Note back',
    JSON.stringify({ deleted: deletedOn?.notes.map((note) => note.text), afterU: undeleted?.notes.map((note) => note.text) })
  );

  // Removing a Highlight removes its Note.
  await hand.click({ line: 12, word: 1 });
  await hand.click({ id: 'remove-highlight' });
  const goneWithHighlight = await notesBecome((now) => now.notes.length === 1);
  check(
    !!goneWithHighlight && same((await highlightsInPanel(helper, tabId))?.lines, LEFT) && !JSON.stringify(await keptNow()).includes('Everybody has one') && same(drawn(goneWithHighlight), [['(Laughter)', '1:28', 'Education, again.', 'a Moment']]),
    'removing a Highlight removes its Note: neither is on the panel, and nothing of the Note is kept',
    JSON.stringify({ notes: goneWithHighlight?.notes.map((note) => note.text), kept: await keptRecord() })
  );

  // A Note on the Highlight that is left, which is purple and runs over two lines. It stays for the reopening.
  await hand.click({ line: 5, word: 6 });
  await notesBecome((now) => now.onHighlight !== null);
  await typeInPanel('Kept for the reopening.');
  await pressNamedInPanel('Enter');
  const onPurple = await notesBecome((now) => now.notes.length === 2 && now.onHighlight === null);
  const NOTES_LEFT = [["In fact, I'm leaving.", '0:33', 'Kept for the reopening.', 'a Highlight'], ['(Laughter)', '1:28', 'Education, again.', 'a Moment']];
  check(
    same(drawn(onPurple), NOTES_LEFT) && onPurple.notes[0].colour === 'purple' && onPurple.notes[1].colour === null && onPurple.notes[0].edge !== onPurple.notes[1].edge,
    "a Note on a Highlight that runs over two lines shows after the second, with the time the Highlight starts, and is edged in its Highlight's colour",
    JSON.stringify(onPurple?.notes ?? (await notesNow())?.notes)
  );

  // A click on what a Highlight's Note says opens that Highlight, with the Note in its field.
  await clickNote('Kept for the reopening.', 'text');
  const openedByNote = await notesBecome((now) => now.onHighlight !== null);
  check(
    openedByNote?.onHighlight === 'Kept for the reopening.' && (await highlightsInPanel(helper, tabId))?.open === 'the whole thing. In fact,',
    "a real click on what a Highlight's Note says opens that Highlight, with the Note in its field",
    JSON.stringify({ open: (await highlightsInPanel(helper, tabId))?.open, field: openedByNote?.onHighlight })
  );
  await pressNamedInPanel('Escape');
  const shutByEscape = await notesBecome((now) => now.onHighlight === null && now.box === 'offer');
  check(!!shutByEscape && same(drawn(shutByEscape), NOTES_LEFT), "and Escape in that field shuts the Highlight's box and leaves the Note as it was", JSON.stringify(drawn(shutByEscape)));

  // The Note at a Moment is deleted with its ×, and U brings it back as it was.
  await clickNote('Education, again.', 'delete');
  const momentDeleted = await notesBecome((now) => now.notes.length === 1);
  const keptWithoutNotes = await keptRecord();
  await pressInPanel('u');
  const momentBack = await notesBecome((now) => now.notes.length === 2);
  check(
    !!momentDeleted && !!keptWithoutNotes && !('notes' in keptWithoutNotes) && same(drawn(momentBack), NOTES_LEFT) && sameWhateverTheOrder((await keptRecord())?.notes, [momentKept]),
    'the Note at a Moment is deleted with its × too, and nothing of it is kept; U brings it back with its id, its time and when it was made',
    JSON.stringify({ kept: (await keptRecord())?.notes, was: momentKept })
  );
  check(hand.requests.length === requestsBeforeNotes, 'while Notes were written, changed, deleted and brought back, the panel made no request at all', JSON.stringify(hand.requests.slice(requestsBeforeNotes)));

  // --------------------------------------------------------- Markdown export
  // 1 of 2: with the Transcript on show. Saved for the talk now: one Highlight, purple, "the whole
  // thing. In fact,", which runs from the cue at 33.408 s into the next and has a Note; and a Note
  // at a Moment at 88.5 s. Everything expected below is written out by hand, from that and from the
  // recorded captions, and none of it comes from the extension's own code.
  console.log('\n      Markdown export, copied with a real click in the real side panel (the Transcript is still from the record)');
  const TALK_LINK = `https://www.youtube.com/watch?v=${TALK}`;
  // The talk's title has a "|" or two in it, which Markdown would take for a table's, so each has a backslash before it.
  const HEAD = [`# ${first.title.replaceAll('|', '\\|')}`, `${first.channel} · <${TALK_LINK}>`];
  const SAVED_AS_MARKDOWN = `${[...HEAD, `[0:33](${TALK_LINK}&t=33s)`, '> the whole thing. In fact,', 'Kept for the reopening.', `[1:28](${TALK_LINK}&t=88s)`, 'Education, again.'].join('\n\n')}\n`;
  const exportNow = () => exportInPanel(helper, tabId);
  /** A real click on the button, with `mouse`. Gives what the button then says, and what a paste in another page gives. */
  const copyByClicking = async (mouse) => {
    await mouse.click({ id: 'copy-markdown' });
    const said = await until(async () => {
      const now = await exportNow();
      return now && now.says !== 'Copy as Markdown' ? now.says : null;
    }, 3000);
    return { said, pasted: await pasteIn(clipboardReader) };
  };

  const strip = await exportNow();
  check(
    strip?.shown && strip.says === 'Copy as Markdown' && strip.option === 'Include the full transcript' && strip.ticked === false && strip.canTick === true,
    'the panel offers "Copy as Markdown", and beside it "Include the full transcript", not ticked',
    JSON.stringify(strip)
  );
  check(
    strip?.position === 'sticky' && Math.abs(strip.top) < 1 && Math.abs(strip.width - strip.panelWidth) < 1 && strip.scrolled > 0 && strip.titleBottom < 0,
    "they are in a strip at the top of the panel, as wide as the panel, which stays there when the video's title has scrolled away",
    `the page is scrolled ${Math.round(strip?.scrolled)} px and the title's foot is ${Math.round(strip?.titleBottom)} px from the top of the panel; the strip's top is at ${strip?.top} px`
  );

  const clipboardBefore = await pasteIn(clipboardReader);
  const requestsBeforeExport = hand.requests.length;
  const copied = await copyByClicking(hand);
  check(
    copied.said === 'Copied' && clipboardBefore !== copied.pasted,
    'a real click on "Copy as Markdown" writes to the clipboard, and the button says "Copied"',
    `before the click a paste gave ${JSON.stringify(clipboardBefore)}; after it, ${copied.pasted.length} characters. The manifest asks for no clipboard permission.`
  );
  check(
    copied.pasted === SAVED_AS_MARKDOWN,
    "what a paste then gives is the video's title, channel and link, then each thing saved in time order: its time, linked to that second of the video, a Highlight's saved words as a quote with its Note after it, and the Note at a Moment at its own time",
    `\n${copied.pasted}`.replaceAll('\n', '\n        | ')
  );
  check(
    (await coloursInPanel(helper, tabId))?.marks.every((mark) => mark.colour === 'purple') && !/purple|colour/i.test(copied.pasted),
    'that Highlight is purple in the panel, and nothing copied says so'
  );
  const offersAgain = await until(async () => ((await exportNow())?.says === 'Copy as Markdown' ? true : null), 4000);
  check(!!offersAgain, 'a moment later the button offers to copy again', JSON.stringify((await exportNow())?.says));

  // With "Include the full transcript" ticked by a real click.
  await hand.click({ id: 'include-transcript' });
  const tickedForTranscript = await exportNow();
  const copiedInFull = await copyByClicking(hand);
  const blocks = copiedInFull.pasted.split('\n\n');
  // The talk as the panel shows it: every line's words, in order.
  const spoken = await changePanel(() => [...document.querySelectorAll('.sentence')].map((line) => line.textContent).join(' '));
  // The same from what was copied: the paragraphs, without the time each starts with and without the bold.
  const paragraphs = blocks.slice(2).filter((block) => !block.startsWith('>'));
  const spokenInExport = paragraphs.map((block) => block.replace(/^\[[\d:]+\]\([^)]*\) /, '')).join(' ').replaceAll('**', '').replace(/\\(.)/g, '$1').trim();
  check(
    tickedForTranscript?.ticked === true && copiedInFull.said === 'Copied' && same(blocks.slice(0, 2), HEAD) && spokenInExport === spoken,
    'with "Include the full transcript" ticked by a real click, what is copied is the whole Transcript: every word of the 321 lines the panel shows, in order, under the same title, channel and link',
    `${copiedInFull.pasted.length} characters, ${paragraphs.length} paragraphs; ${spoken.length} characters of speech in the panel and ${spokenInExport.length} in what was copied`
  );
  check(
    blocks[2] === `[0:27](${TALK_LINK}&t=27s) Good morning. How are you? (Audience) Good. It's been great, hasn't it? I've been blown away by **the whole thing. In fact,** I'm leaving.` &&
      copiedInFull.pasted.split('**').length === 3,
    'the Highlight is in bold where it shows, across the end of a sentence, and nothing else is bold; the paragraph starts with its time, linked',
    blocks[2]
  );
  const noteOnHighlight = `> [0:33](${TALK_LINK}&t=33s) Kept for the reopening.`;
  const noteAtMoment = `> [1:28](${TALK_LINK}&t=88s) Education, again.`;
  const momentAt = blocks.indexOf(noteAtMoment);
  check(
    blocks[3] === noteOnHighlight &&
      blocks[4]?.startsWith(`[0:37](${TALK_LINK}&t=37s) (Laughter) There have been three themes`) &&
      momentAt > 4 &&
      blocks[momentAt - 1]?.endsWith("you're not often at dinner parties, frankly. (Laughter)") &&
      blocks[momentAt + 1]?.startsWith(`[1:29](${TALK_LINK}&t=89s) If you work in education, you're not asked.`) &&
      blocks.filter((block) => block.startsWith('>')).length === 2,
    "each Note stands where the panel draws it, as a quote that starts with its time: the Highlight's after the Highlight's last line, and the one at a Moment between the sentences around it",
    `${JSON.stringify(blocks.slice(3, 5).map((block) => block.slice(0, 90)))} … ${JSON.stringify(blocks.slice(momentAt - 1, momentAt + 2).map((block) => (block.length > 110 ? `…${block.slice(-60)}` : block)))}`
  );
  check(
    hand.requests.length === requestsBeforeExport && sameWhateverTheOrder((await keptRecord())?.notes, [momentKept]) && same((await highlightsInPanel(helper, tabId))?.lines, LEFT),
    'copying made no request, and changed nothing that is kept or shown',
    JSON.stringify(hand.requests.slice(requestsBeforeExport))
  );
  // The checkbox is left ticked. The export with no Transcript on show is 2 of 2, near the end.

  // 2 of 2: a Note typed while the video plays. That needs a load of its own, since the player
  // stops some 45 s after one: the video whose recorded Transcript is word-timed, where a new
  // sentence starts every second or two.
  console.log('\n      Notes, typed while the video plays (the word-timed Transcript, from the record)');
  await watch.goto(watchPage(DINNER), { waitUntil: 'domcontentloaded' });
  const dinnerAgain = await followTranscript('on loading the second video again', (now) => now.count === 380);
  check(dinnerAgain.last?.count === 380, 'the second video is loaded again, and its Transcript shows', journey(dinnerAgain.held));
  const beganForNotes = await videoPlaying();
  check(!!beganForNotes.playing, 'the video plays after that load', `YouTube's player was ${beganForNotes.seen}`);

  // The real player's three new answers, asked as the panel asks them and set against the page's own video element.
  const viaPlayer = (what) =>
    helper.evaluate(
      async ({ tabId, what }) => {
        const { createTabPlayer } = await import('./tab-player.js');
        return createTabPlayer(tabId)[what]();
      },
      { tabId, what }
    );
  const saidPlaying = await viaPlayer('playing');
  await viaPlayer('pause');
  const pausedByPlayer = await until(async () => ((await videoNow()).paused ? videoNow() : null), 3000);
  const saidPaused = await viaPlayer('playing');
  const youTubeWhenPaused = await watch.evaluate(() => document.querySelector('#movie_player')?.getPlayerState?.());
  await viaPlayer('play');
  const playedByPlayer = await until(async () => {
    const now = await videoNow();
    return !now.paused && now.time > pausedByPlayer?.time ? now : null;
  }, 5000);
  const saidPlayingAgain = await viaPlayer('playing');
  await checkWhilePlaying(
    saidPlaying === true && !!pausedByPlayer && saidPaused === false && !!playedByPlayer && saidPlayingAgain === true,
    'the real player says whether the video is playing, pauses it, and plays it again',
    `it said ${saidPlaying}; asked to pause, the page's video element was paused at ${pausedByPlayer?.time?.toFixed(1)} s, it said ${saidPaused}, and YouTube's own player gave its state as ${youTubeWhenPaused} (2 is paused); asked to play, the video went on to ${playedByPlayer?.time?.toFixed(1)} s and it said ${saidPlayingAgain}`
  );

  // The video is put where the page has to scroll for every line, at 20.5 s. Once it is seen to
  // be going again from there, N is pressed in the panel.
  await askPlayer('seekTo', 20.5, true);
  const heldBeforeNote = await readUntil((read) => read.to > 21.2 && read.to < 22 && tintIsRight(read) && isHeld(read) && !read.paused, 6000);
  const beforeN = await videoNow();
  await pressInPanel('n');
  const openWhilePlaying = await notesBecome(boxIsOpen);
  const afterN = await videoNow();
  // Typed a key at a time, the panel and the video read after each key.
  const TYPED = 'Thanking the room, in no hurry.';
  const whileTyping = [];
  for (const letter of TYPED) {
    await typeInPanel(letter);
    await pause(150);
    whileTyping.push(await readBoth());
  }
  const typedWhilePlaying = await notesNow();
  const linesWhileTyping = [...new Set(whileTyping.map((read) => read.place))];
  await checkWhilePlaying(
    !heldBeforeNote.late && openWhilePlaying?.focus === 'note-text' && afterN.time > beforeN.time && beforeN.time > 21.2 && !afterN.paused && whileTyping.at(-1).to > afterN.time + 3 && whileTyping.every((read) => !read.paused),
    'N pressed in the side panel while the video plays opens the box, and the video keeps playing while the Note is typed',
    `pressed with the video between ${beforeN.time?.toFixed(2)} s and ${afterN.time?.toFixed(2)} s; the box said "${openWhilePlaying?.box}"; ${TYPED.length} keys later the video was at ${whileTyping.at(-1).to?.toFixed(1)} s, never paused. The panel's document ${openWhilePlaying?.hasFocus ? 'has' : 'has not'} the window's focus`
  );
  await checkWhilePlaying(
    linesWhileTyping.length >= 3 && whileTyping.every((read) => tintIsRight(read) && !read.backToNow) && whileTyping.filter((read) => isHeld(read)).length >= whileTyping.length / 2 && typedWhilePlaying?.docked?.top > HELD_AT * typedWhilePlaying.docked.panelHeight + 20,
    'and the Transcript keeps moving above the box meanwhile: the tint goes from line to line, each held at its height above the box, with no "back to now"',
    `the tint was on lines ${linesWhileTyping.join(', ')} in turn over ${whileTyping.length} readings, ${whileTyping.filter((read) => isHeld(read)).length} of them with the line at its height (between two lines the page is gliding); the box starts ${Math.round(typedWhilePlaying?.docked?.top)} px down a panel ${typedWhilePlaying?.docked?.panelHeight} px high, and the line is held at ${Math.round(HELD_AT * 100)}%`
  );
  check(
    typedWhilePlaying?.written === TYPED && (await highlightsInPanel(helper, tabId))?.lines.length === 0,
    'every key went into the box, the h, n and u among them, and no Highlight was made',
    JSON.stringify(typedWhilePlaying?.written)
  );
  await pressNamedInPanel('Enter');
  const savedWhilePlaying = await notesBecome((now) => now.notes.length === 1 && now.box === 'offer');
  const [keptPlaying] = (await keptNow())[SAVED_DINNER]?.notes ?? [];
  // The line it should follow, worked out here from the lines in the panel: the last to have started by its Moment.
  const lineAtMoment = await changePanel((seconds) => {
    const line = [...document.getElementsByClassName('sentence')].findLast((each) => Number(each.dataset.start) <= seconds);
    return line ? [line.textContent, Number(line.dataset.start)] : null;
  }, keptPlaying?.time ?? -1);
  await checkWhilePlaying(
    !!savedWhilePlaying && !!keptPlaying && keptPlaying.text === TYPED && keptPlaying.time >= beforeN.time - 0.05 && keptPlaying.time <= afterN.time + 0.05 && same([savedWhilePlaying.notes[0].after, savedWhilePlaying.notes[0].afterStart], lineAtMoment),
    'Enter saves it at the Moment N was pressed, not the Moment it was saved, and it shows after the line that was being spoken then',
    `kept at ${keptPlaying?.time} s, N having been pressed between ${beforeN.time?.toFixed(2)} s and ${afterN.time?.toFixed(2)} s; drawn after ${JSON.stringify([savedWhilePlaying?.notes[0]?.after?.slice(0, 40), savedWhilePlaying?.notes[0]?.afterStart])}, and by the lines' own times it should follow ${JSON.stringify([lineAtMoment?.[0]?.slice(0, 40), lineAtMoment?.[1]])}`
  );
  // The Note was drawn above the line being spoken, which moves every line below it. That is not scrolling by hand.
  const followingAfterNote = await readUntil((read) => tintIsRight(read) && isHeld(read), 4000);
  await checkWhilePlaying(
    !followingAfterNote.late && !followingAfterNote.backToNow && followingAfterNote.place > heldBeforeNote.place,
    'the Note drawn above the line being spoken does not stop the following: no "back to now", and the line is held at its height again',
    `${where(followingAfterNote)}, ${sits(followingAfterNote)}`
  );

  // "Pause the video while I write a Note", ticked with a real click, and N pressed in the page.
  await clickInPanel(await placeInPanel({ id: 'pause-while-writing' }));
  const ticked = await notesBecome((now) => now.pauseTicked);
  check(
    !!ticked && same((await keptNow()).settings, { pauseWhileWriting: true }) && ticked.focus !== 'pause-while-writing' && !JSON.stringify([(await keptNow())[SAVED_TALK], (await keptNow())[SAVED_DINNER]]).includes('pauseWhileWriting'),
    "a real click ticks it, and it is kept as a setting of its own, in no video's record",
    JSON.stringify({ settings: (await keptNow()).settings, focus: ticked?.focus })
  );
  const playerFocus = await focusThePlayer();
  const playingBeforePause = await videoNow();
  await pressInPage('n');
  const pausedForNote = await until(async () => {
    const [video, panel] = [await videoNow(), await notesNow()];
    return video.paused && boxIsOpen(panel) ? { video, panel } : null;
  }, 3000);
  await pause(700);
  const stoodWhileWriting = await videoNow();
  const youTubeWhileWriting = await watch.evaluate(() => document.querySelector('#movie_player')?.getPlayerState?.());
  const pageSaysFocus = await watch.evaluate(() => document.hasFocus());
  await checkWhilePlaying(
    !playingBeforePause.paused && !!pausedForNote && stoodWhileWriting.paused && Math.abs(stoodWhileWriting.time - pausedForNote.video.time) < 0.05,
    'with it ticked, N pressed in the page pauses the video and opens the box',
    `focus on "${playerFocus}"; the video was playing at ${playingBeforePause.time?.toFixed(2)} s and stands at ${stoodWhileWriting.time?.toFixed(2)} s; YouTube's own player gives its state as ${youTubeWhileWriting} (2 is paused); the box says "${pausedForNote?.panel.box}", and within the panel the keyboard is in "${pausedForNote?.panel.focus}". Which of the two a finger's keys would go to this browser cannot show: the panel's document says it ${pausedForNote?.panel.hasFocus ? 'has' : 'has not'} the window's focus and the page's says it ${pageSaysFocus ? 'has' : 'has not'}. A hand showed that they stay with the page, and the part near the end types a Note from there`
  );
  await typeInPanel('Written with the video stopped.');
  await pressNamedInPanel('Enter');
  const playsAgain = await until(async () => {
    const now = await videoNow();
    return !now.paused && now.time > stoodWhileWriting.time + 0.5 ? now : null;
  }, 5000);
  await notesBecome((now) => now.notes.length === 2);
  const keptStopped = ((await keptNow())[SAVED_DINNER]?.notes ?? []).find((note) => note.text === 'Written with the video stopped.');
  await checkWhilePlaying(
    !!keptStopped && Math.abs(keptStopped.time - stoodWhileWriting.time) < 0.05 && !!playsAgain,
    'the Note takes the time where the video stopped, and saving it plays the video again',
    `kept at ${keptStopped?.time} s, the video having stood at ${stoodWhileWriting.time?.toFixed(3)} s; after Enter it went on to ${playsAgain?.time?.toFixed(1)} s`
  );
  await pressInPage('n');
  const pausedAgain = await until(async () => ((await videoNow()).paused && boxIsOpen(await notesNow()) ? videoNow() : null), 3000);
  await pressNamedInPanel('Escape');
  const playsAfterCancel = await until(async () => {
    const now = await videoNow();
    return !now.paused && now.time > pausedAgain?.time + 0.5 ? now : null;
  }, 5000);
  await checkWhilePlaying(
    !!pausedAgain && !!playsAfterCancel && (await notesNow())?.notes.length === 2,
    'cancelling with Escape plays it again as well, and keeps no Note',
    `paused at ${pausedAgain?.time?.toFixed(1)} s; after Escape the video went on to ${playsAfterCancel?.time?.toFixed(1)} s`
  );
  // The option is left ticked, to be found ticked when the browser is started again.

  // Back to the first video: its Notes are where they were left.
  await watch.goto(WATCH_PAGE, { waitUntil: 'domcontentloaded' });
  const talkAgain = await followTranscript('on loading the first video a third time', (now) => now.title === first.title && now.count === 321);
  const notesBack = await notesBecome((now) => now.notes.length === 2, 5000);
  check(
    talkAgain.last?.count === 321 && same(drawn(notesBack), NOTES_LEFT) && same((await highlightsInPanel(helper, tabId))?.lines, LEFT) && notesBack.pauseTicked === true,
    'back on the first video, after another video and a load of the page, its Notes are there again, each at its place',
    JSON.stringify(drawn(notesBack ?? (await notesNow())))
  );

  // ------------------------------------------- another video, in the same tab
  // A mark on each document shows afterwards that neither was loaded afresh.
  const markPanel = () => helper.evaluate((tabId) => (chrome.extension.getViews().find((view) => view.location.search === `?tabId=${tabId}`).marked = true), tabId);
  await watch.evaluate(() => (window.marked = true));
  await markPanel();
  const link = await watch.evaluate(() => {
    const here = new URLSearchParams(location.search).get('v');
    const link = [...document.querySelectorAll('a[href^="/watch?v="]')].find((a) => !a.getAttribute('href').includes(here));
    link?.click();
    return link?.getAttribute('href') ?? null;
  });
  const second = await until(async () => {
    const shown = await shownByYouTube(watch);
    return shown && shown.id !== first.id ? shown : null;
  }, 30000);
  check(!!second, 'the tab moves to another video', second ? `${second.title} / ${second.channel}` : `clicked ${link}, stuck at ${watch.url()}`);
  if (second) {
    const renamed = await panelShows(second);
    check(!!renamed, 'the panel now shows that video', JSON.stringify(renamed ?? (await shownByPanel())));
    check((await watch.evaluate(() => window.marked === true)) && renamed?.marked === true, 'neither the tab nor the panel was loaded afresh for it');

    // YouTube often plays an advert before the next video. Not every run gets one.
    const [advert, time] = await Promise.all([
      watch.evaluate(() => !!document.querySelector('.html5-video-player.ad-showing')),
      helper.evaluate((tabId) => chrome.tabs.sendMessage(tabId, { type: 'current-time' }), tabId),
    ]);
    if (advert) check(time === null, 'while an advert plays, the real player gives no current time', `${time}`);
    else console.log(' --   no advert played, so the player was not asked during one');

    // The Transcript through this move and the one back, neither of them a page load.
    // YouTube answers for this second video itself; the first one's answer is still from the record.
    const moved = await transcriptInPanel();
    check(
      moved?.title === second.title && moved.count !== 321,
      "moving to that video took the first one's Transcript off the panel",
      moved && `[${moved.title}] ${brief(moved)}`
    );
    await watch.evaluate(() => history.back());
    const wentBack = await followTranscript('on going back to the first video with no page load', (now) => now.count === 321);
    check(
      !!wentBack.last && (await watch.evaluate(() => window.marked === true)) && (await shownByPanel())?.marked === true,
      'going back to the first video, again with no page load, put its Transcript back',
      journey(wentBack.held)
    );
    const marksBack = await until(async () => {
      const now = await highlightsInPanel(helper, tabId);
      return same(now?.lines, LEFT) ? now : null;
    }, 5000);
    check(!!marksBack, 'and its Highlight with it: the one that was left, not the one that was removed', JSON.stringify((await highlightsInPanel(helper, tabId))?.lines));
  }

  // ----------------------------------------------------------- no Transcript
  // With no Transcript on show the panel lists what is saved for the video, under the one line that
  // says why there is none. Both parts have YouTube answering for itself, with nothing replaced.
  //   1 of 2  a video that has no captions at all, and nothing saved until this part writes it
  //   2 of 2  the talk, which has the Highlight and the two Notes left above: with the record not
  //           answering, YouTube sends this browser nothing and the fetch fails for real
  // The keys and the mouse are the protocol's, in the real side panel, as everywhere above.
  console.log('\n      No Transcript, 1 of 2: a video with no captions (YouTube answers for itself)');
  const SAVED_NONE = `video:youtube:${NO_CAPTIONS}`;
  const savedNow = () => savedInPanel(helper, tabId);
  /** Waits for what the panel lists to be as `wanted`, and gives it then, or null when time runs out. */
  const listBecomes = (wanted, timeout = 3000) =>
    until(async () => {
      const now = await savedNow();
      return now && wanted(now) ? now : null;
    }, timeout);
  /** The list as it reads: each entry as its time, a Highlight's saved words, its Note, and what it is. */
  const listed = (now) => (now?.entries ?? []).map((entry) => [entry.time, entry.words, entry.note, entry.on]);
  /**
   * Follows the panel until `wanted`, and gives that reading, with every reading on the way in which the
   * list read as `listWanted` under the waiting line. Nothing is done to the panel meanwhile. The wait
   * is long because adverts are.
   */
  const followList = async (wanted, listWanted, timeout = 300000) => {
    const waiting = [];
    for (const end = Date.now() + timeout; Date.now() < end; await pause(100)) {
      const now = await savedNow().catch(() => null);
      if (!now) continue;
      if (now.line === WAITING_LINE && now.underTheLine && same(listed(now), listWanted)) waiting.push(now);
      if (wanted(now)) return { last: now, waiting };
    }
    return { last: null, waiting };
  };
  /** Where a part of an entry is in the panel, by what the entry says: its "time", its "words", its "note" or its "delete". The entry is brought into view first. */
  const partOfEntry = (text, part) =>
    changePanel(
      ({ text, part }) => {
        const entry = [...document.querySelectorAll('#saved .entry')].find((each) => [each.querySelector('mark[data-highlight]'), each.querySelector('.note-text')].some((said) => said?.textContent === text));
        if (!entry) return null;
        entry.scrollIntoView({ block: 'center' });
        const box = entry.querySelector({ time: '.entry-time', words: 'mark[data-highlight]', note: '.note-text', delete: '.note-delete' }[part]).getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2, left: box.left, right: box.right };
      },
      { text, part }
    );
  /** A real click on a part of an entry. An entry that is not there is not clicked, and what is checked next says so. */
  const clickEntry = async (text, part) => {
    const at = await partOfEntry(text, part);
    if (at) await clickInPanel(at);
  };
  /**
   * Presses on the start of a part of an entry, moves to its end and lets go, as a hand does to
   * select it. Gives what the panel had selected while the button was still down.
   */
  const dragAcrossEntry = async (text, part) => {
    const at = await partOfEntry(text, part);
    if (!at) return null;
    const [from, to] = [{ x: at.left + 1, y: at.y }, { x: at.right - 1, y: at.y }];
    await mouse('mouseMoved', from, { button: 'none', buttons: 0 });
    await mouse('mousePressed', from);
    for (let step = 1; step <= 5; step += 1) await mouse('mouseMoved', { x: from.x + ((to.x - from.x) * step) / 5, y: from.y });
    const selected = (await savedNow())?.selected;
    await mouse('mouseReleased', to, { buttons: 0 });
    await pause(400);
    return { selected, px: Math.round(to.x - from.x) };
  };
  /** Waits for the video to stand within 0.3 s of a time, and gives it then, or null when time runs out. */
  const videoComesTo = (seconds) =>
    until(async () => {
      const now = await videoNow();
      return Math.abs(now.time - seconds) < 0.3 ? now : null;
    }, 3000);

  await watch.goto(watchPage(NO_CAPTIONS), { waitUntil: 'domcontentloaded' });
  const noCaptions = await followTranscript('on the video with no captions, a second time', (now) => now.line === NONE_LINE);
  const nothingSaved = await savedNow();
  const boxWithNone = await notesNow();
  check(
    noCaptions.last?.line === NONE_LINE && nothingSaved?.lines === 0 && nothingSaved.shown === false && nothingSaved.entries.length === 0 && boxWithNone?.box === 'offer' && !(SAVED_NONE in (await keptNow())),
    `with no captions and nothing saved, the panel says "${NONE_LINE}" and lists nothing, and the docked box offers to write a Note`,
    JSON.stringify({ line: nothingSaved?.line, entries: nothingSaved?.entries, box: boxWithNone?.box, pauseTicked: boxWithNone?.pauseTicked })
  );

  // N pressed in the page while the video plays. "Pause the video while I write a Note" was left
  // ticked above, so the video is paused for the Note and plays again once it is saved.
  const beganWithNone = await videoPlaying();
  const focusWithNone = await focusThePlayer();
  const playingWithNone = await videoNow();
  await pressInPage('n');
  const pausedWithNone = await until(async () => {
    const [video, panel] = [await videoNow(), await notesNow()];
    return video.paused && boxIsOpen(panel) ? { video, panel } : null;
  }, 3000);
  const openedWithNone = pausedWithNone?.panel ?? (await notesBecome(boxIsOpen, 1000));
  if (openedWithNone) {
    await typeInPanel('Said with no captions.');
    await pressNamedInPanel('Enter');
  }
  const joined = await listBecomes((now) => now.entries.length === 1);
  const playsOnWithNone = await until(async () => {
    const now = await videoNow();
    return !now.paused && now.time > (pausedWithNone?.video.time ?? Infinity) + 0.3 ? now : null;
  }, 5000);
  const [keptWithNone] = (await keptNow())[SAVED_NONE]?.notes ?? [];
  check(
    !!openedWithNone && !!joined && joined.line === NONE_LINE && joined.underTheLine && same(listed(joined), [[joined.entries[0].time, null, 'Said with no captions.', 'a Moment']]) && keptWithNone?.text === 'Said with no captions.' && joined.entries[0].seconds === keptWithNone.time,
    'N pressed in the page opens a Note at the Moment, and once saved it is listed under that line, with its time',
    `focus on "${focusWithNone}"; YouTube's player was ${beganWithNone.seen}; the box said "${openedWithNone?.box}"; listed: ${JSON.stringify(listed(joined ?? (await savedNow())))}; kept: ${JSON.stringify(keptWithNone)}`
  );
  await checkWhilePlaying(
    boxWithNone?.pauseTicked === true && !playingWithNone.paused && !!pausedWithNone && !!keptWithNone && Math.abs(keptWithNone.time - pausedWithNone.video.time) < 0.05 && !!playsOnWithNone,
    'the pause checkbox works there as it does elsewhere: ticked, N pauses the video, the Note takes the time where it stopped, and saving it plays the video again',
    `the video was playing at ${playingWithNone.time?.toFixed(2)} s and stood at ${pausedWithNone?.video.time?.toFixed(3)} s while the Note was written; kept at ${keptWithNone?.time} s; after Enter it went on to ${playsOnWithNone?.time?.toFixed(1)} s`
  );

  // Its × deletes it, as between the lines of a Transcript.
  await clickEntry('Said with no captions.', 'delete');
  const nothingListed = await listBecomes((now) => now.entries.length === 0);
  check(
    !!nothingListed && nothingListed.shown === false && !('notes' in ((await keptNow())[SAVED_NONE] ?? { notes: 0 })),
    'a real click on its × deletes it: nothing is listed, and nothing of the Note is kept',
    JSON.stringify({ entries: (await savedNow())?.entries, kept: (await keptNow())[SAVED_NONE] })
  );

  // Two Notes with the video standing still, the later one written first.
  const stoodAt12 = await standAt(12);
  await pressInPanel('n');
  const boxAt12 = await notesBecome(boxIsOpen);
  await typeInPanel('The later one, written first.');
  await pressNamedInPanel('Enter');
  await listBecomes((now) => now.entries.length === 1);
  const stoodAt5 = await standAt(5);
  await pressInPanel('n');
  const boxAt5 = await notesBecome(boxIsOpen);
  await typeInPanel('The earlier one, written second.');
  await pressNamedInPanel('Enter');
  const inOrder = await listBecomes((now) => now.entries.length === 2);
  const NONE_LIST = [['0:05', null, 'The earlier one, written second.', 'a Moment'], ['0:12', null, 'The later one, written first.', 'a Moment']];
  const keptInOrder = ((await keptNow())[SAVED_NONE]?.notes ?? []).map((each) => [Math.round(each.time), each.text]);
  check(
    !!stoodAt12 && !!stoodAt5 && boxAt12?.box === 'Note at 0:12' && boxAt5?.box === 'Note at 0:05' && same(listed(inOrder), NONE_LIST) && same(keptInOrder, [[5, 'The earlier one, written second.'], [12, 'The later one, written first.']]),
    'N pressed in the side panel writes a Note at the Moment too, and the list is in the order of the video, not of the writing',
    JSON.stringify({ listed: listed(inOrder ?? (await savedNow())), kept: keptInOrder })
  );

  // The video stands at 5 s. A click on what the entry at 0:12 says, then one on the other's time.
  await clickEntry('The later one, written first.', 'note');
  const cameTo12 = await videoComesTo(12);
  await clickEntry('The earlier one, written second.', 'time');
  const cameTo5 = await videoComesTo(5);
  const afterJumps = await notesNow();
  check(
    !!cameTo12 && !!cameTo5 && afterJumps?.box === 'offer' && afterJumps.onHighlight === null,
    'a real click on an entry jumps the video to its time: on what it says, and on its time',
    `the video stood at ${stoodAt5?.time?.toFixed(1)} s, came to ${cameTo12?.time?.toFixed(1)} s on the first click and to ${cameTo5?.time?.toFixed(1)} s on the second; no box opened`
  );

  // H, in the panel and in the page, and a drag across an entry as if to select it.
  const keptBeforeHWithNone = await keptNow();
  await pressInPanel('h');
  await focusThePlayer();
  await pressInPage('h');
  await pause(800);
  const draggedWithNone = await dragAcrossEntry('The later one, written first.', 'note');
  const afterHWithNone = await savedNow();
  const stoodAfterDrag = await videoNow();
  check(
    same(await keptNow(), keptBeforeHWithNone) && same(listed(afterHWithNone), NONE_LIST) && draggedWithNone?.selected === '' && afterHWithNone.selected === '' && (await highlightsInPanel(helper, tabId))?.open === null && Math.abs(stoodAfterDrag.time - 5) < 0.3,
    'H and selecting make nothing: H in the panel and in the page keeps nothing, and a drag across an entry selects nothing, keeps nothing and does not move the video',
    `dragged ${draggedWithNone?.px} px across the entry at 0:12; while the button was down the panel's selection read ${JSON.stringify(draggedWithNone?.selected)}; the video stood at ${stoodAfterDrag.time?.toFixed(1)} s after it`
  );

  // U, which needs no Transcript either.
  await clickEntry('The later one, written first.', 'delete');
  const oneListed = await listBecomes((now) => now.entries.length === 1);
  await pressInPanel('u');
  const listedAgain = await listBecomes((now) => now.entries.length === 2);
  check(!!oneListed && same(listed(oneListed), [NONE_LIST[0]]) && same(listed(listedAgain), NONE_LIST), 'U brings back a Note deleted from the list, at its place in it', JSON.stringify(listed(listedAgain ?? (await savedNow()))));

  // 2 of 2: the fetch fails, on the video that has marks.
  console.log('\n      No Transcript, 2 of 2: the fetch fails, on the video with a Highlight and two Notes (YouTube answers for itself)');
  await context.unroute(isCaptions, answerFromTheRecord);
  const TALK_LIST = [['0:33', 'the whole thing. In fact,', 'Kept for the reopening.', 'a Highlight'], ['1:28', null, 'Education, again.', 'a Moment']];
  const recordBeforeFailing = await keptRecord();
  const askedBeforeFailing = answersFor(TALK, 'the extension').length;
  await watch.goto(WATCH_PAGE, { waitUntil: 'domcontentloaded' });
  const failedFetch = await followList((now) => now.title === first.title && now.line === FAILED_LINE, TALK_LIST);
  const refused = answersFor(TALK, 'the extension').slice(askedBeforeFailing);
  check(
    !!failedFetch.last && failedFetch.last.lines === 0 && failedFetch.last.underTheLine && same(listed(failedFetch.last), TALK_LIST) && failedFetch.last.entries[0].colour === 'purple' && failedFetch.last.entries[0].background === PURPLE,
    `when the fetch fails the panel says "${FAILED_LINE}", and under that line lists what is saved in time order: the Highlight as its saved words, in its colour, with its Note, then the Note at a Moment`,
    `${JSON.stringify(failedFetch.last?.entries ?? (await savedNow()))}; YouTube's answer to the extension: ${JSON.stringify(refused.map((each) => [each.from, `HTTP ${each.status}`, `${each.characters} characters`]))}`
  );
  check(
    failedFetch.waiting.length > 0,
    `and while the Transcript was still being fetched, the same list was already on show under "${WAITING_LINE}"`,
    `${failedFetch.waiting.length} readings of the panel, a tenth of a second apart or more, before the fetch failed`
  );

  // A click on the Highlight in the list, with the video standing elsewhere.
  await standAt(50);
  await clickEntry('the whole thing. In fact,', 'words');
  const openedFromList = await notesBecome((now) => now.onHighlight !== null);
  const cameToHighlight = await videoComesTo(33.408);
  const boxFromList = await highlightsInPanel(helper, tabId);
  check(
    !!cameToHighlight && openedFromList?.onHighlight === 'Kept for the reopening.' && boxFromList?.open === 'the whole thing. In fact,' && same(boxFromList.offers, ['Remove highlight', 'Close', 'Yellow', 'Green', 'Purple']) && (await savedNow())?.entries[0].open === true,
    'a real click on the Highlight in the list jumps the video to where it starts and opens it: its box holds its saved words and its Note, and offers to remove it',
    `the video stood at 50 s and came to ${cameToHighlight?.time?.toFixed(1)} s; ${JSON.stringify({ open: boxFromList?.open, note: openedFromList?.onHighlight, offers: boxFromList?.offers })}`
  );
  await hand.click({ id: 'remove-highlight' });
  const removedFromList = await listBecomes((now) => now.entries.length === 1);
  const keptRemoved = await keptRecord();
  await pressInPanel('u');
  const backInList = await listBecomes((now) => now.entries.length === 2);
  check(
    !!removedFromList && same(listed(removedFromList), [TALK_LIST[1]]) && same(keptRemoved?.highlights, []) && same(listed(backInList), TALK_LIST) && backInList.entries[0].background === PURPLE && sameWhateverTheOrder(await keptRecord(), recordBeforeFailing),
    'it is removed there with a click on "Remove highlight", its Note with it, and U brings both back, in its colour, kept exactly as before',
    JSON.stringify({ removed: listed(removedFromList), back: listed(backInList ?? (await savedNow())) })
  );

  // H where it would take a sentence if there were a Transcript, and a drag across the saved words.
  await standAt(72.5);
  const keptBeforeHFailed = await keptNow();
  await pressInPanel('h');
  await focusThePlayer();
  await pressInPage('h');
  await pause(800);
  const draggedWords = await dragAcrossEntry('the whole thing. In fact,', 'words');
  const afterHFailed = await savedNow();
  const stoodAfterWords = await videoNow();
  check(
    same(await keptNow(), keptBeforeHFailed) && same(listed(afterHFailed), TALK_LIST) && draggedWords?.selected === '' && afterHFailed.selected === '' && (await highlightsInPanel(helper, tabId))?.open === null && Math.abs(stoodAfterWords.time - 72.5) < 0.3,
    "H and selecting make nothing here either: H keeps nothing, and a drag across the Highlight's saved words selects nothing, makes nothing, opens nothing and does not move the video",
    `dragged ${draggedWords?.px} px across "the whole thing. In fact,"; while the button was down the panel's selection read ${JSON.stringify(draggedWords?.selected)}; the video stood at ${stoodAfterWords.time?.toFixed(1)} s after it`
  );

  // N, with the video standing a little before where the Highlight starts.
  await standAt(30);
  await pressInPanel('n');
  const boxAt30 = await notesBecome(boxIsOpen);
  await typeInPanel('Written with no transcript.');
  await pressNamedInPanel('Enter');
  const WITH_ONE_MORE = [['0:30', null, 'Written with no transcript.', 'a Moment'], ...TALK_LIST];
  const joinedTalk = await listBecomes((now) => now.entries.length === 3);
  check(
    boxAt30?.box === 'Note at 0:30' && same(listed(joinedTalk), WITH_ONE_MORE) && joinedTalk.line === FAILED_LINE,
    'N writes a Note at the Moment there, and it joins the list where it comes in the video: before the Highlight, though it was written after',
    JSON.stringify(listed(joinedTalk ?? (await savedNow())))
  );

  // The Transcript does arrive later for the same video. Nothing tries the fetch again by itself, so
  // the tab goes to another video and comes back, with no page load, and this time the answer is
  // taken from the record. The fetch under way when the tab comes back is the one that brings it.
  console.log("\n      No Transcript: the Transcript arrives after all (YouTube's answer taken from the record again)");
  await context.route(isCaptions, answerFromTheRecord);
  await watch.evaluate(() => {
    const here = new URLSearchParams(location.search).get('v');
    [...document.querySelectorAll('a[href^="/watch?v="]')].find((a) => !a.getAttribute('href').includes(here))?.click();
  });
  const away = await until(async () => {
    const shown = await shownByYouTube(watch);
    return shown && shown.id !== first.id ? shown : null;
  }, 30000);
  check(!!away && !!(await panelShows(away)), 'the tab moves to another video, and the panel with it', away ? `${away.title} / ${away.channel}` : `stuck at ${watch.url()}`);
  if (away) {
    await watch.evaluate(() => history.back());
    const arrived = await followList((now) => now.lines === 321, WITH_ONE_MORE);
    // The line being said at 30 s, worked out here from the lines in the panel and not by the extension.
    const lineAt30 = await changePanel((seconds) => [...document.getElementsByClassName('sentence')].findLast((line) => Number(line.dataset.start) <= seconds)?.textContent ?? null, 30);
    const notesIn = await notesBecome((now) => now.notes.length === 3, 5000);
    const marksIn = await highlightsInPanel(helper, tabId);
    const coloursIn = await coloursInPanel(helper, tabId);
    check(
      arrived.waiting.length > 0,
      `back on the video, while its Transcript was being fetched again, the list was on show under "${WAITING_LINE}", the new Note in it`,
      `${arrived.waiting.length} readings of the panel before the Transcript arrived`
    );
    check(
      !!arrived.last && arrived.last.shown === false && arrived.last.entries.length === 0 && arrived.last.line === null,
      'when the Transcript arrives for the same video, the line and the list give way to it',
      JSON.stringify({ line: arrived.last?.line, lines: arrived.last?.lines, listShown: arrived.last?.shown, entries: arrived.last?.entries.length })
    );
    check(
      same(marksIn?.lines, LEFT) && coloursIn?.marks.length === 2 && coloursIn.marks.every((mark) => mark.background === PURPLE) && !!lineAt30 && same(drawn(notesIn), [[lineAt30, '0:30', 'Written with no transcript.', 'a Moment'], ...NOTES_LEFT]),
      'and the same marks show in it: the Highlight on its words in its colour, its Note after it, and both Notes at their Moments, the one written with no Transcript among them',
      JSON.stringify({ marks: marksIn?.lines, notes: drawn(notesIn ?? (await notesNow())), lineAt30 })
    );
    // That Note goes again, so that the video is left as the parts after this one expect it.
    await clickNote('Written with no transcript.', 'delete');
    const tidied = await notesBecome((now) => now.notes.length === 2);
    check(same(drawn(tidied), NOTES_LEFT) && sameWhateverTheOrder(await keptRecord(), recordBeforeFailing), 'with that Note deleted again by its ×, the video is kept exactly as it was before the fetch failed', JSON.stringify(drawn(tidied ?? (await notesNow()))));
  } else {
    // The tab never left, so the list is still on show: the Note is deleted there instead.
    await clickEntry('Written with no transcript.', 'delete');
    await listBecomes((now) => now.entries.length === 2);
  }
  await context.unroute(isCaptions, answerFromTheRecord);

  const waits = tokenWaits.map((wait) => `${wait.where}, ${wait.seconds.toFixed(1)} s${wait.withAdvert ? ` (${wait.withAdvert.toFixed(1)} s of it with an advert playing)` : ''}`);
  if (waits.length) check(true, 'while the player had no token for the video, the panel showed the waiting line', waits.join('; '));
  else note('the waiting line was never caught while the player had no token: the token came too soon on every load of this run');

  // ----------------------------------------------------- leaving a watch page
  await watch.evaluate(() => document.querySelector('a#logo, ytd-topbar-logo-renderer a')?.click());
  await until(() => watch.evaluate(() => location.pathname === '/'));
  check((await tabHasPanel(false)) && (await panelIsOpen(false)), "on YouTube's home page, reached without a page load, the panel has closed", JSON.stringify({ tab: await panelOptions(), open: await openPanels() }));
  await runToolbarAction();
  await pause(1500);
  check((await openPanels()).length === 0, 'and the toolbar action opens nothing there', JSON.stringify(await openPanels()));

  await watch.evaluate(() => history.back());
  const back = await until(() => shownByYouTube(watch), 30000);
  await tabHasPanel(true);
  // The panel is closed here and the tab is on the video. What a key does is decided in the panel's
  // page, so H in the page now has nobody to take it up.
  const keptWhileClosed = await keptNow();
  const heardBeforeClosed = await heardByWorker();
  await focusThePlayer();
  await pressInPage('h');
  await pressInPage('u');
  await pause(1000);
  const heardWhileClosed = await heardByWorker();
  check(
    (await openPanels()).length === 0 && same(await keptNow(), keptWhileClosed),
    'with the panel closed, H and U pressed in the page do nothing: nothing is kept and nothing is taken back',
    heardBeforeClosed && heardWhileClosed ? `the page still passed them on: the background worker heard ${JSON.stringify(heardWhileClosed.slice(heardBeforeClosed.length))}, which it does nothing with` : 'what the background worker heard of them could not be read'
  );
  await runToolbarAction();
  check((await panelIsOpen(true)) && !!back && !!(await panelShows(back)), 'back on the video, the toolbar action opens the panel again, showing it', JSON.stringify(await shownByPanel()));

  // Markdown export, 2 of 2: with no Transcript on show. This panel was opened afresh on the talk,
  // and nothing answers for YouTube any more, so unless YouTube sends captions it has no Transcript,
  // while everything saved for the talk is as the first part left it.
  console.log('\n      Markdown export with no Transcript on show (YouTube answering for itself again)');
  const withoutTranscript = await until(async () => {
    const now = await transcriptInPanel();
    return now && now.title === first.title && (now.count > 0 || (now.line && now.line !== WAITING_LINE)) ? now : null;
  }, 150000);
  const shownWithout = withoutTranscript ?? (await transcriptInPanel());
  if (shownWithout?.count > 0) {
    note('NOT SHOWN: the export with no Transcript on show. YouTube sent captions this time, and the panel shows them', brief(shownWithout));
  } else {
    const handAgain = await mouseInPanel(devtools, helper, tabId);
    const stripWithout = await exportNow();
    await handAgain.click({ id: 'include-transcript' });
    const stripAfterClick = await exportNow();
    check(
      stripWithout?.shown && stripWithout.canTick === false && stripWithout.ticked === false && stripAfterClick?.ticked === false,
      `with no Transcript on show (the panel says "${shownWithout?.line}"), "Include the full transcript" cannot be ticked: a real click on it changes nothing`,
      JSON.stringify({ before: stripWithout, tickedAfterTheClick: stripAfterClick?.ticked })
    );
    const clipboardWas = await pasteIn(clipboardReader);
    const copiedWithout = await copyByClicking(handAgain);
    check(
      copiedWithout.said === 'Copied' && clipboardWas !== SAVED_AS_MARKDOWN && copiedWithout.pasted === SAVED_AS_MARKDOWN,
      'and a real click on "Copy as Markdown" still copies everything saved for the video, from what is kept: the same text as with the Transcript on show',
      `the clipboard held the ${clipboardWas.length} characters copied before; now\n${copiedWithout.pasted}`.replaceAll('\n', '\n        | ')
    );
  }

  await watch.goto(OTHER_SITE);
  check((await tabHasPanel(false)) && (await panelIsOpen(false)), `at ${OTHER_SITE}, the panel has closed`, JSON.stringify({ tab: await panelOptions(), open: await openPanels() }));

  await watch.goBack({ waitUntil: 'domcontentloaded' });
  const returned = await until(() => shownByYouTube(watch), 30000);
  await tabHasPanel(true);
  await runToolbarAction();
  check((await panelIsOpen(true)) && !!returned && !!(await panelShows(returned)), 'back on the video with the Back button, the toolbar action opens the panel again, showing it', JSON.stringify(await shownByPanel()));

  // This panel is a new one and the record is not answering, so the fetch fails once more: the
  // panel lists what is saved, as the one before it did.
  const failedOnOpening = await followList((now) => now.line === FAILED_LINE, TALK_LIST);
  check(
    same(listed(failedOnOpening.last), TALK_LIST) && failedOnOpening.last.lines === 0,
    'opened again beside the video, with the fetch failing again, the panel lists what is saved once more',
    JSON.stringify(listed(failedOnOpening.last ?? (await savedNow())))
  );

  // --------------------------------------------------- a reload tries again
  // A failed fetch is tried again when the watch page is reloaded, and by nothing else while the
  // panel stays open on the video. The panel here has just failed to fetch the talk's Transcript,
  // and the watch page is reloaded four times:
  //   1     with YouTube answering for itself: the fetch is made again, and fails again
  //   2, 3  with the record answering, the second as soon as the first has the panel waiting:
  //         one fetch, not two, and the Transcript arrives
  //   4     with the Transcript on show: it stays, and nothing is fetched
  // What is counted is the extension's own requests to YouTube for the talk's captions. A fetch
  // makes one, once the player has its token, so two fetches side by side would make two.
  console.log('\n      A reload of the watch page tries a failed Transcript again');
  const askedForTalk = () => answersFor(TALK, 'the extension');
  /** Waits for the extension's requests for the talk's captions to number this many, then 3 s more for any that should not follow. Gives how many there are then. */
  const askedBecomes = async (wanted) => {
    await until(async () => askedForTalk().length >= wanted, 10000);
    await pause(3000);
    return askedForTalk().length;
  };
  const answered = (answer) => (answer ? `${answer.from} answered HTTP ${answer.status} with ${answer.characters} characters` : 'no answer was seen');
  const askedBeforeReload = askedForTalk().length;

  // 1. A reload of the watch page must not cost the tab its panel, even for a moment.
  await markPanel();
  let lostPanel = false;
  const watching = setInterval(async () => {
    const options = await panelOptions().catch(() => null);
    if (options && !options.enabled) lostPanel = true;
  }, 50);
  await watch.reload({ waitUntil: 'commit' });
  const waitingAgain = await listBecomes((now) => now.line === WAITING_LINE, 15000);
  const failedAgain = waitingAgain ? await followList((now) => now.line === FAILED_LINE, TALK_LIST) : { last: null, waiting: [] };
  const reloaded = await until(() => shownByYouTube(watch), 30000);
  const afterReload = reloaded && (await panelShows(reloaded));
  clearInterval(watching);
  check(!lostPanel && afterReload?.marked === true, 'through a reload of the watch page the panel stays open, and shows the video again', JSON.stringify(afterReload ?? (await shownByPanel())));
  const askedAfterReload = await askedBecomes(askedBeforeReload + 1);
  check(
    !!waitingAgain && failedAgain.last?.line === FAILED_LINE,
    `after a failed fetch, that reload starts the fetch again: the panel shows "${WAITING_LINE}" and then, YouTube having sent nothing once more, "${FAILED_LINE}"`,
    `the panel was the same one, not loaded afresh; to the new request ${answered(askedForTalk().at(-1))}`
  );
  check(
    waitingAgain?.underTheLine === true && same(listed(waitingAgain), TALK_LIST) && failedAgain.waiting.length > 0 && failedAgain.last?.underTheLine === true && same(listed(failedAgain.last), TALK_LIST),
    'what is saved for the video stays listed through it: under the waiting line, and under the failure after it',
    `${failedAgain.waiting.length} readings of the panel while it waited, each with ${JSON.stringify(listed(waitingAgain))} under the line`
  );
  check(
    askedAfterReload === askedBeforeReload + 1,
    'one reload is one try: the extension asked YouTube for the captions once more, and no more',
    `${askedBeforeReload} requests for this video's captions before the reload, ${askedAfterReload} after it and 3 s on`
  );

  // The page names the same video again for another reason than a load: its title goes and arrives
  // again. The block in which YouTube describes the video is put out of the page script's sight and back.
  const linesMeanwhile = [];
  const readingLine = setInterval(async () => {
    const now = await savedNow().catch(() => null);
    if (now) linesMeanwhile.push(now.line);
  }, 100);
  await watch.evaluate(() => (document.querySelector('#microformat').id = 'microformat-away'));
  const untitled = await until(async () => (await shownByPanel())?.title === '', 5000);
  await watch.evaluate(() => (document.querySelector('#microformat-away').id = 'microformat'));
  const titledAgain = await panelShows(first);
  const askedAfterNaming = await askedBecomes(askedAfterReload);
  clearInterval(readingLine);
  check(
    !!untitled && !!titledAgain && askedAfterNaming === askedAfterReload && linesMeanwhile.length > 10 && linesMeanwhile.every((line) => line === FAILED_LINE),
    'only a reload tries again: the page naming the same video for another reason, its title gone and arrived again with no load, starts no fetch',
    `the panel showed no title and then "${titledAgain?.title}" again; ${linesMeanwhile.length} readings of its line through that, every one "${FAILED_LINE}"; the extension's requests: still ${askedAfterNaming}`
  );

  // 2 and 3. The record answers again. The page is reloaded, and reloaded once more as soon as
  // the panel is seen waiting: the try the first reload started is still under way then, since the
  // player of a page just loaded has no token yet and nothing has been asked of YouTube.
  await context.route(isCaptions, answerFromTheRecord);
  await watch.reload({ waitUntil: 'commit' });
  const waitingForRecord = await listBecomes((now) => now.line === WAITING_LINE, 15000);
  const tokenAlready = !hasNoToken(await captionsByPageScript());
  await watch.reload({ waitUntil: 'commit' });
  const arrivedByReload = await followList((now) => now.lines === 321, TALK_LIST);
  const askedAfterTwo = await askedBecomes(askedAfterNaming + 1);
  const notesByReload = await notesBecome((now) => now.notes.length === 2, 5000);
  const marksByReload = await highlightsInPanel(helper, tabId);
  const coloursByReload = await coloursInPanel(helper, tabId);
  check(
    !!waitingForRecord && !!arrivedByReload.last && arrivedByReload.waiting.length > 0 && arrivedByReload.last.shown === false && arrivedByReload.last.line === null,
    'with the record answering again, a reload brings the Transcript: the waiting line with the list under it, and then the 321 lines in their place',
    `${arrivedByReload.waiting.length} readings of the panel while it waited; to the request ${answered(askedForTalk().at(-1))}`
  );
  check(
    same(marksByReload?.lines, LEFT) && coloursByReload?.marks.length === 2 && coloursByReload.marks.every((mark) => mark.background === PURPLE) && same(drawn(notesByReload), NOTES_LEFT),
    'and what was listed shows in the Transcript: the Highlight on its words in its colour, its Note after it, and the Note at its Moment',
    JSON.stringify({ marks: marksByReload?.lines, notes: drawn(notesByReload ?? (await notesNow())) })
  );
  check(
    askedAfterTwo === askedAfterNaming + 1,
    'a reload while a fetch is under way starts no second one beside it: for those two reloads the extension asked YouTube once',
    `${askedAfterNaming} requests before the two reloads, ${askedAfterTwo} after them and 3 s on; when the page was loaded the second time the panel had been waiting for a moment and the player ${tokenAlready ? 'ALREADY had its token, so this run does not show it' : 'had no token yet'}`
  );

  // 4. With the Transcript on show. The panel is read ten times a second through the reload, and
  // until the player has its token again, since no request could go out before that.
  const shownThrough = [];
  const readingTranscript = setInterval(async () => {
    const now = await transcriptInPanel().catch(() => null);
    if (now) shownThrough.push(now.count || now.line);
  }, 100);
  await watch.reload({ waitUntil: 'commit' });
  const tokenWithTranscript = await until(async () => !hasNoToken(await captionsByPageScript()), 300000);
  const askedAfterKeeping = await askedBecomes(askedAfterTwo);
  clearInterval(readingTranscript);
  check(
    !!tokenWithTranscript && shownThrough.length > 10 && shownThrough.every((each) => each === 321) && askedAfterKeeping === askedAfterTwo && same((await highlightsInPanel(helper, tabId))?.lines, LEFT),
    'a reload with the Transcript on show keeps it: its 321 lines never left the panel, and nothing was fetched again',
    `${shownThrough.length} readings of the panel through the reload and until the player had its token again, ${shownThrough.filter((each) => each !== 321).length} of them without the 321 lines; the extension's requests: ${askedAfterTwo} before and ${askedAfterKeeping} after`
  );

  // ----------------------------------- typing a Note from the video's page
  // After N is pressed with the keyboard in the video's page, the box opens in the panel and the
  // keyboard stays with the page: a hand found that (ticket 21). So here every key of a Note is sent
  // to the watch page, as a finger's would be, and the box is read in the panel. The page was loaded
  // a moment ago, by the last reload above, so the video plays; the talk's Transcript is on show.
  //
  // What YouTube is left of a key is told two ways. A listener of the check's own, on the document
  // on a key's way down, is the next stop after the extension's listener on the window: it hears
  // every key the extension let through, going down and coming up, and none that it kept. And
  // YouTube's player is read before and after: K pauses and plays, M mutes, F goes fullscreen.
  console.log("\n      Typing a Note with the keys sent to the watch page, where a finger's keys stay after N is pressed there");
  panelSession = null; // the panel has been opened again since the check's keys and mouse were joined to it
  const recordBeforeTyping = await keptRecord();
  await watch.evaluate(() => {
    window.keysGot = [];
    for (const [type, way] of [['keydown', 'down'], ['keyup', 'up']]) {
      document.addEventListener(type, (event) => window.keysGot.push(`${event.key} ${way}${event.defaultPrevented ? ', cancelled' : ''}`), true);
    }
  });
  const keysGot = () => watch.evaluate(() => window.keysGot.splice(0));
  const typeInPage = (text) => watch.keyboard.type(text);
  const pressNamedInPage = (name) => watch.keyboard.press(name);
  /** N pressed in the page, and the box seen open. The keys that follow wait a moment more, for the panel's connection to reach the page. */
  const openNoteFromPage = async (wanted = boxIsOpen) => {
    await pressInPage('n');
    const opened = await notesBecome(wanted);
    await pause(150);
    return opened;
  };
  const readsOfYouTube = (now) => `${now.paused ? 'paused' : 'playing'}, ${now.muted ? 'muted' : 'not muted'}, ${now.fullscreen ? 'fullscreen' : 'not fullscreen'}, at ${now.time?.toFixed(1)} s`;
  const allButTheTime = ({ time: _time, ...rest }) => rest;

  // "Pause the video while I write a Note" was left ticked. It is unticked for this part, so that the
  // video plays on under the Note, and ticked again at the end.
  await clickInPanel(await placeInPanel({ id: 'pause-while-writing' }));
  const untickedForTyping = await notesBecome((now) => !now.pauseTicked);

  // N, then K, the space bar, M and F: four of YouTube's own keys. Each turns something on and
  // off, so two of the same would undo each other, and what was read afterwards would look
  // untouched. So each is typed once, and the player is read 0.6 s after every one of them.
  const beganForTyping = await videoPlaying();
  const focusForTyping = await focusThePlayer();
  const youTubeBeforeTyping = await youTubeNow();
  await keysGot();
  const openedFromPage = await openNoteFromPage();
  const gotOfN = await keysGot();
  const afterEachTyped = [];
  for (const key of ['k', ' ', 'm', 'f']) {
    await typeInPage(key);
    await pause(600);
    afterEachTyped.push(await youTubeNow());
  }
  const typedFromPage = await notesBecome((now) => now.written === 'k mf', 2000);
  const gotOfTyping = await keysGot();
  check(
    !!untickedForTyping && openedFromPage?.written === '' && same(gotOfN, ['n down', 'n up']) && !!typedFromPage && typedFromPage.box === openedFromPage.box,
    'after N pressed in the page, "k mf" typed in the page appears in the Note box, in order and with no click; the N that opened the box is not in it, and was left to YouTube as before',
    `focus on "${focusForTyping}"; YouTube's player was ${beganForTyping.seen}; the box said "${openedFromPage?.box}" and then read ${JSON.stringify((await notesNow())?.written)}`
  );
  check(
    same(gotOfTyping, []),
    "none of those four keys went on into the page: its next listener after the extension's heard none of them going down, and none coming up",
    JSON.stringify(gotOfTyping)
  );
  await checkWhilePlaying(
    youTubeBeforeTyping.paused === false && youTubeBeforeTyping.muted === false && youTubeBeforeTyping.fullscreen === false && afterEachTyped.every((now) => same(allButTheTime(now), allButTheTime(youTubeBeforeTyping))) && afterEachTyped.at(-1).time > youTubeBeforeTyping.time + 1.5,
    'and YouTube did nothing with any of them: 0.6 s after each of the four, the video was still playing, not muted and not fullscreen',
    `before: ${readsOfYouTube(youTubeBeforeTyping)}; after K, the space bar, M and F: ${afterEachTyped.map(readsOfYouTube).join('; ')}; speed, volume, theater, captions, miniplayer and address as they were`
  );

  // Backspace, Shift with Enter, and an h, a u and an n: H would make a Highlight, U would take
  // back the last change, and N would start the Note afresh.
  await typeInPage('xy');
  await pressNamedInPage('Backspace');
  const afterBackspace = await notesBecome((now) => now.written === 'k mfx', 2000);
  await pressNamedInPage('Shift+Enter');
  await typeInPage('Huh, nun.');
  const twoLines = await notesBecome((now) => now.written === 'k mfx\nHuh, nun.', 2000);
  check(
    !!afterBackspace && !!twoLines && same((await highlightsInPanel(helper, tabId))?.lines, LEFT) && sameWhateverTheOrder(await keptRecord(), recordBeforeTyping),
    'Backspace pressed in the page takes off the last character, Shift with Enter starts a new line, and an h, a u and an n typed there are letters of the Note: no Highlight is made, nothing is taken back, and the Note is not started afresh',
    `"xy" and Backspace left ${JSON.stringify(afterBackspace?.written)}; then ${JSON.stringify((await notesNow())?.written)}`
  );

  // With the keyboard in the box itself, as after a click in it, the typing is the browser's own.
  // These keys go to the side panel's target, where the field has the keyboard.
  await typeInPanel(' Twice? No.');
  const WRITTEN_BOTH_WAYS = 'k mfx\nHuh, nun. Twice? No.';
  const typedInBoth = await notesBecome((now) => now.written === WRITTEN_BOTH_WAYS, 2000);
  check(
    !!typedInBoth,
    'with the keyboard in the Note box itself the typing is the browser\'s own: what is typed there follows what came from the page, and nothing is typed twice',
    JSON.stringify((await notesNow())?.written)
  );

  // Ctrl, Alt and Command, each with a key that types. Then YouTube's own search box.
  await keysGot();
  for (const held of ['Control', 'Alt', 'Meta']) await pressNamedInPage(`${held}+y`);
  await pause(400);
  const gotWithHeld = await keysGot();
  const writtenAfterHeld = (await notesNow())?.written;
  check(
    gotWithHeld.filter((each) => each === 'y down').length === 3 && gotWithHeld.filter((each) => each === 'y up').length === 3 && writtenAfterHeld === WRITTEN_BOTH_WAYS,
    'a key pressed with Ctrl, Alt or Command is left alone: it goes on into the page, not cancelled, and nothing is typed in the box',
    `the page's next listener heard ${JSON.stringify(gotWithHeld)}`
  );
  const inSearchBoxWhileWriting = await watch.focus(searchBox, { timeout: 5000 }).then(() => true, () => false);
  await typeInPage('uk');
  await pause(600);
  const searchedWhileWriting = await watch.evaluate((box) => ({ value: document.querySelector(box)?.value, focusOn: document.activeElement?.name || document.activeElement?.tagName }), searchBox);
  const gotInSearchBox = await keysGot();
  check(
    inSearchBoxWhileWriting && searchedWhileWriting.value === 'uk' && searchedWhileWriting.focusOn === 'search_query' && (await notesNow())?.written === WRITTEN_BOTH_WAYS && gotInSearchBox.includes('u down') && gotInSearchBox.includes('k down'),
    "typing in YouTube's search box is never taken, even while the Note is being written: it goes into the search box, and the Note is as it was",
    `the search box reads ${JSON.stringify(searchedWhileWriting.value)}, with focus on "${searchedWhileWriting.focusOn}"; the Note box still reads ${JSON.stringify((await notesNow())?.written)}`
  );
  await watch.evaluate((box) => {
    const search = document.querySelector(box);
    if (search) search.value = '';
    search?.dispatchEvent(new Event('input', { bubbles: true }));
  }, searchBox);
  await focusThePlayer();

  // Enter, pressed in the page, saves.
  await keysGot();
  await pressNamedInPage('Enter');
  const savedFromPage = await notesBecome((now) => now.notes.length === 3 && now.box === 'offer');
  const keptFromPage = ((await keptRecord())?.notes ?? []).find((each) => each.text === WRITTEN_BOTH_WAYS);
  const gotOfEnter = await keysGot();
  check(
    !!savedFromPage && savedFromPage.notes.some((each) => each.text === WRITTEN_BOTH_WAYS && each.on === 'a Moment') && !!keptFromPage && same(gotOfEnter, []),
    'Enter pressed in the page saves the Note as it stands, both lines of it, and the box shuts; that Enter did not go on into the page either, down or up',
    `kept: ${JSON.stringify(keptFromPage)}; the page's next listener heard ${JSON.stringify(gotOfEnter)}`
  );

  // The Note is saved: the page keeps nothing now. K, M and F, twice each, so that each is undone.
  const afterEachKey = [];
  for (const key of ['k', 'k', 'm', 'm', 'f', 'f']) {
    await pressNamedInPage(key);
    await pause(600);
    afterEachKey.push(await youTubeNow());
  }
  const gotAfterSaving = await keysGot();
  check(
    same(gotAfterSaving, ['k', 'k', 'm', 'm', 'f', 'f'].flatMap((key) => [`${key} down`, `${key} up`])),
    'once the Note is saved the page stops taking keys: K, M and F, pressed twice each, all go on into the page, down and up, and none is cancelled',
    JSON.stringify(gotAfterSaving)
  );
  await checkWhilePlaying(
    afterEachKey[0].paused === true && afterEachKey[1].paused === false && afterEachKey[2].muted === true && afterEachKey[3].muted === false && afterEachKey[4].fullscreen === true && afterEachKey[5].fullscreen === false,
    "and YouTube's own keys work again: K paused the video and played it, M muted and unmuted it, F went fullscreen and came back",
    afterEachKey.map(readsOfYouTube).join('; ')
  );

  // H, N and U as before. U takes back the Note just saved; N opens the box again; Escape, pressed in the page, cancels.
  await focusThePlayer();
  await keysGot();
  await pressInPage('u');
  const takenBackFromPage = await notesBecome((now) => now.notes.length === 2);
  const openedAgainFromPage = await openNoteFromPage();
  await typeInPage('never mind');
  await notesBecome((now) => now.written === 'never mind', 2000);
  await pressNamedInPage('Escape');
  const cancelledFromPage = await notesBecome((now) => now.box === 'offer');
  const gotOfUNEscape = await keysGot();
  check(
    same(drawn(takenBackFromPage), NOTES_LEFT) && openedAgainFromPage?.written === '' && !!cancelledFromPage && cancelledFromPage.notes.length === 2 && sameWhateverTheOrder(await keptRecord(), recordBeforeTyping) && same(gotOfUNEscape, ['u down', 'u up', 'n down', 'n up']),
    'U and N pressed in the page do what they did, and are left to YouTube as before: U takes that Note back and N opens the box again, empty. Escape pressed in the page cancels the Note, and nothing of it is kept',
    `the page's next listener heard ${JSON.stringify(gotOfUNEscape)}: the U and the N, and nothing of what was typed or of the Escape`
  );

  // How soon after N the typing is the Note's. The page starts handing keys over when the panel's
  // connection reaches it, a moment after the N: here ten letters follow the N as fast as the
  // protocol sends them, with no wait for the box. None of them is a key of YouTube's or of the panel's.
  const nAtOnce = Date.now();
  await pressInPage('n');
  await watch.keyboard.type('xyzqxyzqxy');
  const typedIn = Date.now() - nAtOnce;
  await notesBecome(boxIsOpen, 2000);
  await pause(400);
  const typedAtOnce = (await notesNow())?.written ?? '';
  const gotAtOnce = (await keysGot()).filter((each) => each.endsWith(' down') && !each.startsWith('n ')).length;
  note(
    `typed with no wait after N, ten letters in the ${typedIn} ms after it: ${typedAtOnce.length} are in the box, and ${gotAtOnce} went on into the page, before the panel's connection was there`,
    `the box reads ${JSON.stringify(typedAtOnce)}. A letter that early is YouTube's, as every letter was before this was built`
  );
  await pressNamedInPage('Escape');
  await notesBecome((now) => now.box === 'offer');

  // The panel goes in the middle of a Note, twice over. First its page is loaded afresh under the
  // Note: the page that held the connection is gone with no word, as when a panel dies. The K
  // that follows must be YouTube's.
  await openNoteFromPage();
  await typeInPage('k');
  const beforeItWent = await notesBecome((now) => now.written === 'k', 2000);
  const playingBeforeItWent = await youTubeNow();
  await keysGot();
  await helper.evaluate((tabId) => chrome.extension.getViews().find((view) => view !== window && view.location.search === `?tabId=${tabId}`).location.reload(), tabId);
  const loadedAfresh = await until(async () => ((await notesNow())?.box === 'offer' ? true : null), 10000);
  panelSession = null;
  await pressNamedInPage('k');
  const pausedByK = await until(async () => ((await youTubeNow()).paused ? true : null), 3000);
  const gotAfterItWent = await keysGot();
  await pressNamedInPage('k');
  const playedByK = await until(async () => ((await youTubeNow()).paused === false ? true : null), 3000);
  check(
    !!beforeItWent && !!loadedAfresh && same(gotAfterItWent, ['k down', 'k up']),
    "a panel that goes in the middle of a Note does not leave the page taking keys: its page was loaded afresh with a Note open and a K in it, and the next K went on into the page, down and up",
    `the Note box read ${JSON.stringify(beforeItWent?.written)} before; the page's next listener then heard ${JSON.stringify(gotAfterItWent)}`
  );
  await checkWhilePlaying(
    playingBeforeItWent.paused === false && !!pausedByK && !!playedByK,
    'and that K was YouTube\'s: it paused the video, which the K typed into the Note had not, and K again played it',
    `the video was ${readsOfYouTube(playingBeforeItWent)} with the K in the Note; it is ${readsOfYouTube(await youTubeNow())} now`
  );

  // Then the panel is closed with a Note open, as its own close button closes it.
  await openNoteFromPage();
  await typeInPage('m');
  const beforeItClosed = await notesBecome((now) => now.written === 'm', 2000);
  const youTubeBeforeItClosed = await youTubeNow();
  await keysGot();
  await helper.evaluate((tabId) => chrome.sidePanel.close({ tabId }), tabId);
  const closedOnANote = await panelIsOpen(false);
  await pressNamedInPage('m');
  const mutedByM = await until(async () => ((await youTubeNow()).muted ? true : null), 3000);
  const gotAfterItClosed = await keysGot();
  await pressNamedInPage('m');
  const unmutedByM = await until(async () => ((await youTubeNow()).muted === false ? true : null), 3000);
  check(
    !!beforeItClosed && !!closedOnANote && same(gotAfterItClosed, ['m down', 'm up']),
    'nor does a panel that is closed in the middle of a Note: closed with an M in the box, and the next M went on into the page, down and up',
    `the Note box read ${JSON.stringify(beforeItClosed?.written)} before; panels open after: ${JSON.stringify(await openPanels())}; the page's next listener then heard ${JSON.stringify(gotAfterItClosed)}`
  );
  await checkWhilePlaying(
    youTubeBeforeItClosed.muted === false && !!mutedByM && !!unmutedByM,
    "and that M was YouTube's: it muted the video, which the M typed into the Note had not, and M again unmuted it",
    `the video was ${readsOfYouTube(youTubeBeforeItClosed)} with the M in the Note; it is ${readsOfYouTube(await youTubeNow())} now`
  );

  // The panel is opened again, and its Transcript comes from the record once more.
  await runToolbarAction();
  await panelIsOpen(true);
  panelSession = null;
  const transcriptForTyping = await until(async () => ((await transcriptInPanel())?.count === 321 ? true : null), 300000);

  // H and then N, both pressed in the page: the Note goes on the Highlight just made, in that
  // Highlight's own box. The video stands at 72.5 s, where H takes line 12.
  const stoodForTyping = await standAt(72.5);
  await focusThePlayer();
  const hFromPage = Date.now();
  await pressInPage('h');
  const madeFromPage = await marksBecome([...LEFT, m(L12)]);
  const openedOnMade = await openNoteFromPage((now) => now.onHighlight !== null);
  const nAfterH = Date.now() - hFromPage;
  await keysGot();
  await typeInPage('I like a book.');
  const typedOnMade = await notesBecome((now) => now.onHighlight === 'I like a book.', 2000);
  await pause(600);
  const stoodWhileTypingOnMade = await youTubeNow();
  const gotOnMade = await keysGot();
  check(
    !!transcriptForTyping && !!stoodForTyping && !!madeFromPage && openedOnMade?.onHighlight === '' && openedOnMade.box === null && (await highlightsInPanel(helper, tabId))?.open === L12 && !!typedOnMade && same(gotOnMade, []) && nAfterH < 5000,
    'the same holds for a Note on the Highlight just made: N pressed in the page within its 5 s opens that Highlight\'s box, and what is typed in the page appears in its Note field, with none of it going on into the page',
    `N within ${(nAfterH / 1000).toFixed(1)} s of the H; the box is open on ${JSON.stringify((await highlightsInPanel(helper, tabId))?.open)} and its Note field reads ${JSON.stringify((await notesNow())?.onHighlight)}; the video is ${readsOfYouTube(stoodWhileTypingOnMade)}, with an I, an L and a K typed`
  );
  await pressNamedInPage('Enter');
  const savedOnMade = await notesBecome((now) => now.notes.length === 3 && now.onHighlight === null);
  const keptOnMade = ((await keptRecord())?.highlights ?? []).find((each) => each.words === L12);
  check(
    same(drawn(savedOnMade), [NOTES_LEFT[0], [L12, '1:10', 'I like a book.', 'a Highlight'], NOTES_LEFT[1]]) && keptOnMade?.note?.text === 'I like a book.',
    'and Enter pressed in the page saves it on that Highlight',
    JSON.stringify({ notes: drawn(savedOnMade ?? (await notesNow())), kept: keptOnMade?.note })
  );

  // U twice, in the page, takes back that Note and then the Highlight. The checkbox is ticked again.
  await pressInPage('u');
  await notesBecome((now) => now.notes.length === 2);
  await pressInPage('u');
  const tidiedAfterTyping = await marksBecome(LEFT);
  await clickInPanel(await placeInPanel({ id: 'pause-while-writing' }));
  const tickedAfterTyping = await notesBecome((now) => now.pauseTicked);
  check(
    !!tidiedAfterTyping && same(drawn(await notesNow()), NOTES_LEFT) && sameWhateverTheOrder(await keptRecord(), recordBeforeTyping) && !!tickedAfterTyping && same((await keptNow()).settings, { pauseWhileWriting: true }),
    'U pressed twice in the page takes back that Note and then the Highlight, so the video is kept exactly as it was before this part, and the pause checkbox is ticked again',
    JSON.stringify({ marks: (await highlightsInPanel(helper, tabId))?.lines, notes: drawn(await notesNow()), settings: (await keptNow()).settings })
  );
  await context.unroute(isCaptions, answerFromTheRecord);

  const atEnd = await asLoaded(extensions);
  check(noErrors(atEnd), 'after all that, chrome://extensions still lists no errors', JSON.stringify(atEnd));
  // The script in the page's own world is the page's as far as Chrome's list goes, so its errors are looked for here.
  check(thrownInPage.length === 0, "and the extension's script in the page's own world threw nothing", thrownInPage.join('\n        '));

  // ---------------------- the same id from another folder, and what it stored
  await helper.evaluate(() => chrome.storage.local.set({ 'check-in-browser': 'kept' }));
  await context.close();
  const moved = join(scratch, 'moved somewhere else');
  cpSync(dist, moved, { recursive: true });
  context = await launch(moved);
  const afterMove = await asLoaded(await openExtensionsPage(context));
  check(afterMove?.id === ID && afterMove.folder === moved, 'loaded from another folder, it has the same id', JSON.stringify({ id: afterMove?.id, folder: afterMove?.folder }));
  const helperAgain = await openHelperPage(context);
  const kept = await helperAgain.evaluate(() => chrome.storage.local.get('check-in-browser'));
  check(kept['check-in-browser'] === 'kept', 'and what it stored before the move is still there', JSON.stringify(kept));

  // ------------- the browser closed and opened again: the video's Highlights
  // The same profile in a browser started afresh, so the tab, the panel and
  // the extension's worker are all new. The Transcript is from the record again.
  console.log('\n      The video opened again after the browser was closed (the Transcript is from the record)');
  await context.route(isCaptions, answerFromTheRecord);
  const watchAgain = await context.newPage();
  await watchAgain.goto(WATCH_PAGE, { waitUntil: 'domcontentloaded' });
  const tabAgain = await until(() =>
    helperAgain.evaluate(async () => {
      for (const tab of await chrome.tabs.query({})) {
        if (await chrome.tabs.sendMessage(tab.id, { type: 'which-video' }).catch(() => null)) return tab.id;
      }
      return null;
    })
  );
  await until(async () => (await helperAgain.evaluate((tabId) => chrome.sidePanel.getOptions({ tabId }), tabAgain)).enabled);
  const devtoolsAgain = await context.browser().newBrowserCDPSession();
  await watchAgain.bringToFront();
  const tabsAgain = await devtoolsAgain.send('Target.getTargets', { filter: [{ type: 'tab' }] });
  await devtoolsAgain.send('Extensions.triggerAction', { id: ID, targetId: tabsAgain.targetInfos.find((target) => target.url === watchAgain.url()).targetId });
  // As long as it takes: an advert before the video holds the token back.
  const reopened = await until(async () => {
    const now = await highlightsInPanel(helperAgain, tabAgain);
    return now?.count === 321 && now.lines.length ? now : null;
  }, 300000);
  check(
    same(reopened?.lines, LEFT) && reopened.open === null,
    'opening the video again, and the panel beside it, shows the Highlight that was left, on the same words',
    JSON.stringify(reopened?.lines ?? (await highlightsInPanel(helperAgain, tabAgain)))
  );
  check(reopened?.ids.length === 1, 'and the Highlight that was removed is still gone', JSON.stringify(reopened?.ids));
  const reopenedColours = await coloursInPanel(helperAgain, tabAgain);
  check(
    reopenedColours?.marks.length === 2 && reopenedColours.marks.every((mark) => mark.colour === 'purple' && mark.background === PURPLE),
    'and it is the colour it was left in, purple',
    JSON.stringify(reopenedColours?.marks.map((mark) => [mark.words, mark.colour, mark.background]))
  );
  const reopenedNotes = await until(async () => {
    const now = await notesInPanel(helperAgain, tabAgain);
    return now?.notes.length === 2 ? now : null;
  }, 5000);
  check(
    same(drawn(reopenedNotes), NOTES_LEFT) && reopenedNotes.notes[0].colour === 'purple' && reopenedNotes.box === 'offer',
    'and its Notes are there, each at its place: the one on the Highlight after its second line, and the one at a Moment between the sentences around it',
    JSON.stringify(reopenedNotes?.notes ?? (await notesInPanel(helperAgain, tabAgain))?.notes)
  );
  check(reopenedNotes?.pauseTicked === true, 'and "Pause the video while I write a Note" is still ticked', JSON.stringify(reopenedNotes?.pauseTicked));
} catch (error) {
  check(false, 'the check ran to the end', String(error?.stack ?? error));
} finally {
  await context?.close().catch(() => {});
  rmSync(scratch, { recursive: true, force: true });
}

console.log(
  `\n${failures ? `${failures} FAILED` : 'All passed'}. Left for a person at a real Chrome: the click on the toolbar icon itself` +
    "\n(here the DevTools protocol runs the icon's action), a drag with a hand (here the protocol's mouse, in the" +
    '\nreal side panel), a key under a finger (here the protocol\'s keys, sent to the panel and to the page), whether' +
    '\nthe 1.2 s catch the sentence that was meant, typing a Note with a finger after N is pressed in the video (here' +
    "\nthe protocol's keys were sent to the watch page, which is where a hand found a finger's to go), how the export reads pasted into a" +
    "\nnotes app (here it was pasted into a plain text field, from this browser's own clipboard), how the panel looks, Chrome proper," +
    '\nhow the following feels over more of a video than this browser plays, and a real advert (the one above was pretended).' +
    `\nThe Transcript fetched from YouTube itself: ${realFetch}.` +
    (realFetch.includes('the panel shows') ? '' : '\nThat fetch was NOT shown working here. Every Transcript in the panel above came from the record.') +
    (notShown.length ? `\nFollowing playback: NOT SHOWN, because YouTube's player had stopped by then:\n  - ${notShown.join('\n  - ')}` : '')
);
process.exit(failures ? 1 : 0);
