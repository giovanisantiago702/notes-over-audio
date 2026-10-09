// The Markdown export: a video's Highlights and Notes as text that reads well
// pasted anywhere, with or without the Transcript around them. It is written
// here and copied to the clipboard on the panel's page.

import { sentenceSpokenAt } from './following.js';
import { placeHighlight } from './highlights.js';
import { clockTime, entriesOf, shownNote } from './notes.js';

/**
 * Where a video is, as a link: to a time in it, in seconds, or with no time
 * to the video itself. The core never looks inside a video's id, so whoever
 * knows the player's addresses makes the link. It may give nothing, and then
 * a time is written with no link.
 * @callback LinkTo
 * @param {string} videoId
 * @param {number} [seconds]
 * @returns {string | null | undefined}
 */

// What is exported is somebody's words: a title, what was said, what the person
// wrote. None of it is Markdown, so a character that would mean something in
// Markdown gets a backslash before it, which tells Markdown to show it as it is.
// An underscore between two letters or digits means nothing, as in a web address,
// and an ampersand means something only where it starts a character's name, as in "&amp;".
const MEANS_SOMETHING = /[\\`*[\]<~|]|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])|&(?=#?\w+;)/gu;
/** Words as Markdown shows them unchanged, anywhere in a line. */
const asWritten = (words) => words.replace(MEANS_SOMETHING, '\\$&');
/**
 * Words as Markdown shows them unchanged where they start a line: there a
 * "#", ">", "-", "+" or "=" and a number with a stop after it would start a
 * heading, a quote, a list or a rule.
 */
const asLine = (words) => asWritten(words).replace(/^[#>+\-=]/, '\\$&').replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2');
/** A name on one line, a title or a channel, with one space wherever it has any. */
const onOneLine = (name) => name.replace(/\s+/g, ' ').trim();

// Two spaces at the end of a line break the line and keep the paragraph, in every kind of Markdown.
const LINE_BREAK = '  \n';
// With the full Transcript, how long a paragraph of it runs before the next sentence starts another.
const PARAGRAPH_MS = 30000;

/**
 * What a Note says, as its paragraphs, each as its lines. A new line in a Note
 * is a line, and an empty line ends a paragraph. The space around a line is
 * left off: Markdown would not show it, and at the start of a line it can mean something.
 * @param {string} text
 * @returns {string[][]}
 */
const paragraphsOf = (text) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length);
/** What a Note says as paragraphs of Markdown, each line of each as it was written. */
const asParagraphs = (text) => paragraphsOf(text).map((lines) => lines.map(asLine).join(LINE_BREAK));

/**
 * A video's Highlights and Notes as Markdown. It starts with the video's
 * title, channel and link. Then, in one of two forms:
 * - everything saved for the video in the order it comes in the video (see `whatIsSaved`);
 * - with `withTranscript`, the whole Transcript, with the Highlights in bold and the Notes where
 *   they fall (see `theTranscript`). With no Transcript on show this is the first form all the same.
 * Colour is not exported, nor when anything was made.
 * @param {object} shown  What the panel shows (see `createPanel` in ./panel.js): its `video`, `transcript`, `highlights` and `notes`.
 * @param {{ withTranscript?: boolean, linkTo: LinkTo }} options
 * @returns {string}  It ends with a new line.
 */
export function markdownOf({ video, transcript, highlights, notes }, { withTranscript = false, linkTo }) {
  // A space, a bracket or a backslash in a link's address would end the link early, so each is written as an address writes it.
  const link = (seconds) => linkTo(video.id, seconds)?.replace(/[\s<>\\]/g, encodeURIComponent).replace(/[()]/g, (bracket) => (bracket === '(' ? '%28' : '%29'));
  /** A time in the video as a clock shows it, linked to that time when there is a way to. */
  const time = (seconds) => (link(seconds) ? `[${clockTime(seconds)}](${link(seconds)})` : clockTime(seconds));

  // The head: the video's title, then its channel and its link. What is not known is left out.
  const [title, channel] = [onOneLine(video.title), onOneLine(video.channel)];
  const blocks = [
    // In a heading a "#" at the end would be taken for the heading's own, so every one is written as it is.
    title && `# ${asWritten(title).replaceAll('#', '\\#')}`,
    [asLine(channel), link() && `<${link()}>`].filter(Boolean).join(' · '),
  ].filter(Boolean);

  const full = withTranscript && transcript?.status === 'ready';
  blocks.push(...(full ? theTranscript({ transcript, highlights, notes }, time) : whatIsSaved({ highlights, notes }, time)));
  return `${blocks.join('\n\n')}\n`;
}

/**
 * Everything saved for a video, in the order it comes in the video. Each
 * starts with its time, on a line of its own. Under it a Highlight is its
 * saved words as a quote, and then its Note if it has one; a Note at a Moment
 * is what it says.
 * @returns {string[]}  The blocks of Markdown, which an empty line goes between.
 */
function whatIsSaved({ highlights, notes }, time) {
  const blocks = [];
  for (const entry of entriesOf(highlights, notes)) {
    blocks.push(time(entry.time));
    if (entry.highlight) blocks.push(`> ${asLine(entry.highlight.words)}`);
    const note = shownNote(entry);
    if (note) blocks.push(...asParagraphs(note.text));
  }
  return blocks;
}

/**
 * The whole Transcript, as paragraphs that each start with their time, with
 * each Highlight in bold where it shows on this Transcript, and each Note
 * where it falls, as a quote between two paragraphs. The bold is on the
 * Transcript's own words, which need not be the Highlight's saved ones.
 * @returns {string[]}  The blocks of Markdown, which an empty line goes between.
 */
function theTranscript({ transcript, highlights, notes }, time) {
  const { words, sentences } = transcript;
  const marks = highlights.map((highlight) => placeHighlight(transcript, highlight)).filter(Boolean);
  /** Whether one Highlight holds every word from one place to another. */
  const marked = (first, last = first) => marks.some((mark) => mark.first <= first && last <= mark.last);

  /** The words from one place to another as they read, in bold wherever a Highlight shows. */
  const written = (first, last) => {
    let text = marked(first) ? '**' : '';
    for (let place = first; place <= last; place += 1) {
      // The space between two words is bold with them when one Highlight holds both. Otherwise
      // the bold ends with the word before, and starts again with this one if it is marked too.
      if (place > first) text += marked(place - 1, place) ? ' ' : `${marked(place - 1) ? '**' : ''} ${marked(place) ? '**' : ''}`;
      text += asWritten(words[place].text);
    }
    return marked(last) ? `${text}**` : text;
  };

  // What stands between the paragraphs, by the line of the Transcript it comes after, with -1 for
  // before the first. Each is a quote that starts with its time. A Note stands where the panel draws
  // it: after the last line its Highlight marks, or after the line being spoken at its Moment. A
  // Highlight that shows nowhere on this Transcript has no words here to be bold, so it stands
  // by its time too, as its saved words in bold, with its Note under them.
  const between = new Map();
  for (const entry of entriesOf(highlights, notes)) {
    const mark = entry.highlight && placeHighlight(transcript, entry.highlight);
    const note = shownNote(entry);
    if (mark && !note) continue; // a Highlight that shows is the bold, and that is all of it
    const line = mark ? sentences.findLastIndex((sentence) => sentence.first <= mark.last) : sentenceSpokenAt(sentences, entry.time);
    const paragraphs = [...(entry.highlight && !mark ? [`**${asWritten(entry.highlight.words)}**`] : []), ...(note ? asParagraphs(note.text) : [])];
    const quoted = `${time(entry.time)} ${paragraphs.join('\n\n')}`.split('\n').map((each) => (each ? `> ${each}` : '>'));
    between.set(line, [...(between.get(line) ?? []), quoted.join('\n')]);
  }

  // The sentences run on as paragraphs, and a paragraph starts with the time its first sentence does.
  // A word in a cue has no time of its own, so there the time is its cue's: a link to it lands
  // at the words or a little before them, never after.
  const startOf = (sentence) => (transcript.timing === 'cue' ? transcript.pieces[words[sentence.first].piece].start : sentence.start);
  const blocks = [...(between.get(-1) ?? [])];
  let paragraph = null; // the one being gathered, as its first sentence and its last
  const endParagraph = () => {
    if (paragraph) blocks.push(`${time(startOf(paragraph.first))} ${written(paragraph.first.first, paragraph.last.last)}`);
    paragraph = null;
  };
  sentences.forEach((sentence, line) => {
    // Another speaker starts a new paragraph, and so does the first sentence to start half a minute after the paragraph did.
    const ranLong = paragraph && Math.round((startOf(sentence) - startOf(paragraph.first)) * 1000) >= PARAGRAPH_MS;
    if (sentence.newSpeaker || ranLong) endParagraph();
    paragraph = { first: paragraph?.first ?? sentence, last: sentence };
    // What stands after this line ends the paragraph, and what is said next starts another.
    if (between.has(line)) endParagraph();
    blocks.push(...(between.get(line) ?? []));
  });
  endParagraph();
  return blocks;
}
