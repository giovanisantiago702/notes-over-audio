// The side panel's page: joins the core to the real player, to YouTube's
// captions and to the page's markup. What the panel shows is decided in the
// core (../core/panel.js); this file only puts it on the page.

import { createPanel } from '../core/panel.js';
import { followPlayback } from './follow-playback.js';
import { localStore } from './local-store.js';
import { exportOnPage } from './panel-export.js';
import { highlightsOnPage } from './panel-highlights.js';
import { listenForKeys } from './panel-keys.js';
import { notesOnPage } from './panel-notes.js';
import { savedOnPage } from './panel-saved.js';
import { connectTo, typingFromPage } from './panel-typing.js';
import { askPageIn, createTabPlayer, onVideoChanged } from './tab-player.js';
import { createTranscriptFetcher } from './youtube-captions.js';
import { linkToVideo } from './youtube-links.js';

// The background worker puts the tab's id in this page's address.
const tabId = Number(new URLSearchParams(location.search).get('tabId'));

const element = (id) => document.getElementById(id);
const make = (tag, className, text) => {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text != null) made.textContent = text;
  return made;
};

/** One sentence, on a line of its own. Every word is an element that keeps its time. */
function sentenceLine(sentence, words) {
  const line = make('p', `sentence${sentence.sound ? ' sound' : ''}${sentence.newSpeaker ? ' new-speaker' : ''}`);
  line.dataset.start = sentence.start;
  for (let i = sentence.first; i <= sentence.last; i += 1) {
    const word = make('span', 'word', words[i].text);
    word.dataset.start = words[i].start;
    if (i > sentence.first) line.append(' ');
    line.append(word);
  }
  return line;
}

// The lines are built again only when the core hands over another Transcript,
// not each time the video's title or anything else on show changes.
let onShow = null;
function showTranscript(transcript) {
  if (transcript === onShow) return;
  onShow = transcript;
  const ready = transcript?.status === 'ready';

  element('transcript-line').hidden = !transcript?.line;
  element('transcript-line').textContent = transcript?.line ?? '';
  element('transcript-line').title = transcript?.reason ?? '';

  element('transcript').hidden = !ready;
  element('transcript').lang = ready ? transcript.language : '';
  element('transcript').dataset.source = ready ? transcript.source : '';
  element('transcript').dataset.timing = ready ? transcript.timing : '';
  element('transcript').replaceChildren(...(ready ? transcript.sentences.map((sentence) => sentenceLine(sentence, transcript.words)) : []));
}

// Highlights: the marks inside the lines, and the box that opens for one.
const highlights = highlightsOnPage({ lines: element('transcript'), box: element('highlight') });

function show(state) {
  const { video, transcript, marks, open } = state;
  element('video').hidden = !video;
  element('no-video').hidden = !!video;
  element('title').textContent = video?.title ?? '';
  element('channel').textContent = video?.channel ?? '';
  showTranscript(transcript);
  highlights.show({ transcript, marks, open });
  following.transcriptShown(transcript);
  notes.show(state);
  // After the Notes: the box a Note is written in is open, and emptied, before a key can come for it.
  typing.show(state);
  saved.show(state);
  exporting.show(state);
}

// The line being spoken, "back to now", and the click on a line that jumps (follow-playback.js).
const following = followPlayback({ player: createTabPlayer(tabId), transcript: element('transcript'), backToNow: element('back-to-now') });

// Notes: the ones drawn between the lines, the box one is written in, and the pause checkbox (panel-notes.js).
const notes = notesOnPage({
  lines: element('transcript'),
  box: element('note-box'),
  highlightBox: element('highlight'),
  pauseOption: element('pause-while-writing'),
  jumpTo: (seconds) => following.jumpToTime(seconds).catch(console.error),
  moved: () => following.linesMoved(),
});

// While a Note is being written, what is typed with the keyboard in the video's page is typed into its box (panel-typing.js).
const typing = typingFromPage({ connect: connectTo(tabId), typed: (key) => notes.typed(key) });

// With no Transcript on show: everything saved for the video, as one list in its place (panel-saved.js).
const saved = savedOnPage({ list: element('saved'), jumpTo: (seconds) => following.jumpToTime(seconds).catch(console.error) });

// The export: the button that copies everything saved as Markdown, and its checkbox (panel-export.js).
const exporting = exportOnPage({ strip: element('export'), linkTo: linkToVideo });

const panel = createPanel({
  player: createTabPlayer(tabId),
  fetchTranscript: createTranscriptFetcher({ askPage: askPageIn(tabId) }),
  store: localStore,
  show,
});
highlights.listenFor(panel);
notes.listenFor(panel);
saved.listenFor(panel);
// H, N and U, pressed in the panel or in the video's page (panel-keys.js).
listenForKeys({ tabId, keys: panel.keys, pressed: (key) => panel.keyPressed(key).catch(console.error) });
// The page names its video whenever that changes. When it is a page loaded afresh that names it,
// a reload included, the core is told so: that is when it tries a failed Transcript again.
onVideoChanged(tabId, ({ loaded }) => (loaded ? panel.pageLoaded() : panel.refresh()));
panel.refresh();
