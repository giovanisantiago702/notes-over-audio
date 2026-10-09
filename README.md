# Notes Over Audio 0.3

A Chrome extension that puts the words spoken in a YouTube video beside the video, and lets you mark them as you would a page. Highlight what was said, write a note at the point where you thought of it, and find both on the same words when you open the video again.

It runs in Chrome's side panel, on `www.youtube.com`. There is no account and no AI in it, and nothing you mark or write leaves your computer.

## What it does

- **Shows the Transcript.** The video's captions, one sentence to a line, each with its time. The sentence being spoken is marked, and the panel scrolls to keep it in view.
- **Jumps.** Click a sentence and the video goes to the start of it.
- **Highlights.** Select words in the panel, or press H while you watch to keep the sentence that was just said.
- **Notes.** Press N and type. A Note is attached to a Highlight, or to a Moment, which is a single point in the video's time.
- **Three colours** for a Highlight: yellow, green and purple. They mean whatever you decide they mean.
- **Undo**, with U.
- **Keeps it all.** Open the video again on another day, and every Highlight and Note is where you left it.
- **Copies it out.** "Copy as Markdown" puts a video's Highlights and Notes on the clipboard, each with its time as a link, with or without the whole Transcript.

## Install

It is not in the Chrome Web Store yet, so it is loaded by hand.

1. Download the zip from [the latest release](https://github.com/giovanisantiago702/notes-over-audio/releases/latest) and unzip it. You get one folder, named for the extension and its version. Put it somewhere it can stay: Chrome keeps no copy of the extension. It runs it from that folder.
2. Open `chrome://extensions` and switch on "Developer mode", at the top right. Leave it on: with it off, Chrome switches the extension off.
3. Click "Load unpacked" and choose that folder, the one with `manifest.json` directly inside it.
4. Pin "Notes Over Audio" from the puzzle-piece menu beside the address bar, so that its icon stays in the toolbar.
5. Reload any YouTube tab that was already open. The extension starts only in pages loaded after it was installed.

It needs Chrome 116 or later, on a computer.

From a clone of this repository, nothing needs building. Choose `src` at "Load unpacked": it is the extension as Chrome loads it.

## Use

Open a video's own page, the kind with `youtube.com/watch` in its address, and click the extension's icon. A panel opens at the side and says "Getting the transcript…" until the Transcript arrives. If adverts play before the video, it arrives when they are over.

While the video plays, the panel follows it. Scroll the panel yourself and it stops, and "Back to now" returns to the sentence being spoken. Going to another video in the same tab keeps the panel open. Leaving YouTube's video pages closes it.

| Key | What it does |
| --- | --- |
| H | Makes a Highlight of the sentence just said. Pressed again within 3 seconds, it adds the sentence before. |
| N | Opens a Note. Enter saves it, Esc cancels, and Shift with Enter starts a new line. |
| U | Undoes the last change to a Highlight or a Note. |

The keys are plain letters, with no Ctrl, Alt or Command. They work whether the last click was in the video or in the panel. They are left alone while you type in a text box, such as YouTube's search, and they do nothing while the panel is closed.

### Highlights

- H takes the sentence that was being said a little over a second before the key, because by the time you press, the words you wanted are over. Sounds written in brackets, such as (Laughter), are passed over.
- A selection can run across several sentences, and a word that is half selected is taken whole.
- H never makes longer a Highlight that was made by selecting.
- Click a Highlight and a box opens at the bottom of the panel. It holds the Highlight's words, a field for a Note, the three colours, "Remove highlight" and "Close".

### Notes

- For 5 seconds after a Highlight is made, N writes the Note on that Highlight. At any other time, the Note goes at the Moment N was pressed.
- Only Enter saves. Esc, "Close", or opening another Note or a Highlight throws away what was typed, without asking.
- Typing, Backspace, Enter and Esc work straight away. For anything more, such as moving the cursor or pasting, click in the box first.
- A saved Note shows between the lines of the Transcript, with its time. Click the time to jump there, or the × to delete the Note.
- "Pause the video while I write a Note" is a checkbox at the bottom of the panel. It is not ticked to begin with, and the choice is remembered.

### Undo

U goes back one change at a time. It does not undo a change of colour, and there is no redo. What can be undone is forgotten when the panel closes or the tab goes to another video.

### Copy as Markdown

"Copy as Markdown", at the top of the panel, copies the title, the channel and a link, then each Highlight and Note in the order they come in the video. Tick "Include the full transcript" first and it copies the whole Transcript, with the Highlights in bold and the Notes where they fall. It copies one video at a time, and not the colours.

### Without a Transcript

The Transcript is made from the video's captions: the uploader's own when there are some in the language spoken, otherwise the ones YouTube makes automatically. In its place the panel can say one of three things:

- **"Getting the transcript…"** It is waiting, and goes on waiting while adverts play. After a minute and a half with no advert playing, it gives up.
- **"The transcript could not be fetched."** Reload the page, and it tries again.
- **"This video has no transcript."** The video has no captions. There are no words to select and H does nothing, but N still writes a Note at a Moment.

In all three, whatever is already saved for the video is listed under that line, in the order it comes in the video. When the Transcript does arrive, the same marks show in it.

## Where your marks are kept

Everything is stored on your computer, inside Chrome, in the profile the extension was loaded into. It is on no server and in no account, so another computer, another browser or another Chrome profile will not have it.

The one thing the extension asks the network for is the video's captions, which it asks of YouTube, from the YouTube page you are on.

**Removing the extension deletes everything it stored, for good.** That is the "Remove" button on its card at `chrome://extensions`. "Copy as Markdown" is the only way out, one video at a time, and nothing reads it back in. Loading a newer copy over the old one keeps what was saved, and so does switching "Developer mode" off and on again.

## What it is not

- No account, no sign-in, and nothing kept in step between computers.
- No AI: no summaries, no chat. The words are YouTube's captions as they are.
- YouTube only, on ordinary video pages. Not Shorts, not YouTube Music, not videos embedded in other sites.
- Chrome only, on a computer. Other browsers have not been tried.
- No list of the videos you have marked, and no search.
- Not tried yet: videos in languages other than English, live streams, and very long videos.

## Development

Plain JavaScript modules. No TypeScript, no bundler, and nothing to install for the tests or the build.

| Command | What it does |
| --- | --- |
| `npm test` | Runs the tests, with Node's own test runner. |
| `npm run build` | Copies `src/` to `dist/`. |
| `npm run zip` | Writes `zip/notes-over-audio-<version>.zip`: the built folder, with this README inside it. |
| `npm run zip:store` | Writes `zip/notes-over-audio-<version>-store.zip`, the zip the Chrome Web Store takes: the manifest at its top, with no `key` in it, and no README. |
| `npm run check:browser` | Loads the build in Playwright's Chromium and checks it on real YouTube pages. |
| `node scripts/icons.js` | Draws the icon again, into `src/icons/`. |

The tests need Node 22 or later, and the system's own `zip` and `unzip`, which macOS has. The browser check needs `pnpm install` first, Playwright's Chromium, and the network. It takes some minutes, so it is not part of `npm test`.

Some of the tests read the captions of two real videos, as YouTube sent them. Those captions are not in this repository, and without them those tests are skipped and the browser check does not start. `test/real-captions.js` names the three files, which go in `test/captions/`.

Where things are:

- `src/core/` decides everything the panel shows. Nothing of Chrome or YouTube is in it: no `chrome.*`, no DOM, no YouTube address. It is tested in plain Node, with a stand-in for the player and one for the store.
- `src/extension/` is the code that faces Chrome: the side panel's page, the two scripts that run in YouTube's page, the service worker and the real store.

Three things the tests hold in place:

- The extension's id is fixed by `key` in the manifest, so what is saved survives loading the extension from another folder.
- The permissions are `sidePanel`, `storage` and content scripts on `https://www.youtube.com/*`, and no more.
- A phrase this README puts in double quotes has to be a phrase on the screen. Rename a button, and `npm test` fails until the README names the new one.

## Feedback

Open an issue. What this version is out to learn is whether marks come back: when you opened a video again on a later day, were your Highlights and Notes there, and on the right words? Anything that broke, or did not do what this page says, is wanted too, however small.

## Licence

MIT, in `LICENSE`.
