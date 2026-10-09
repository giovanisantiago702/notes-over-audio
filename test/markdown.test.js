// The Markdown export, as text: what a video's Highlights and Notes read like
// once they are out of the panel, with and without the Transcript around them.
// Every one of these goes through the panel, so what is exported is what the
// panel shows.

import assert from 'node:assert/strict';

import { markdownOf } from '../src/core/markdown.js';
import { morning, panelOn, pressNAt, saying, select, talk, withNotes } from './open-panel.js';
import { fromTheUploader, test } from './real-captions.js';

// A link as some player's address might be: the video, and then a place in it. The core only passes on what it is given.
const linkTo = (videoId, seconds) => `https://example.test/${videoId}${seconds == null ? '' : `#${seconds}`}`;
const LINK = 'https://example.test/youtube:iG9CE55wbtY';
/** What the export button would copy from the panel as it stands. */
const exported = (open, options = {}) => markdownOf(open.now(), { linkTo, ...options });
/** The lines of a text written here with a line of its own for each. */
const text = (...lines) => `${lines.join('\n')}\n`;

// `morning()` says "Good morning." from 10 s, "How are you?" from 12 s, "It's been great." from 14 s
// and "I've been blown away." from 20 s.
test("the export starts with the video's title, channel and link, and a Highlight is its time, linked, over its saved words as a quote", async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'How are you?');

  assert.equal(
    exported(open),
    text(
      '# Do schools kill creativity?',
      '',
      `TED · <${LINK}>`,
      '',
      `[0:12](${LINK}#12)`,
      '',
      '> How are you?'
    )
  );
});

/** Writes a Note on the Highlight made by selecting `phrase`, which N opens for the 5 s after it is made. */
async function selectWithNote(open, phrase, note) {
  await select(open, phrase);
  await open.panel.keyPressed('n');
  await open.panel.saveNote(note);
  open.clock.pass(9); // and after those 5 s the next N is at a Moment again
}
/** Writes a Note at a Moment. */
async function noteAt(open, seconds, note) {
  await pressNAt(open, seconds);
  await open.panel.saveNote(note);
}

test("everything saved comes in the order it comes in the video: a Highlight's Note follows its quote, and a Note at a Moment stands at its own time", async () => {
  const open = await panelOn(talk, morning());
  await selectWithNote(open, "It's been great.", 'He means the conference.');
  await noteAt(open, 12.9, 'A long pause here.');
  await select(open, 'Good morning.');

  assert.equal(
    exported(open),
    text(
      '# Do schools kill creativity?',
      '',
      `TED · <${LINK}>`,
      '',
      `[0:10](${LINK}#10)`,
      '',
      '> Good morning.',
      '',
      `[0:12](${LINK}#12.9)`,
      '',
      'A long pause here.',
      '',
      `[0:14](${LINK}#14)`,
      '',
      "> It's been great.",
      '',
      'He means the conference.'
    )
  );
});

/** The export without the three lines every one starts with, and without the line left empty after them. */
const afterTheHead = (markdown) => markdown.split('\n').slice(4).join('\n');

test('a Note of several lines keeps them: a new line is a line break, and an empty line starts a new paragraph', async () => {
  const open = await panelOn(talk, morning());
  await noteAt(open, 12.9, 'First line.\nSecond line.   \n\n\n  A new thought.');

  // Two spaces at the end of a line are how Markdown breaks a line without ending the paragraph.
  assert.equal(afterTheHead(exported(open)), text(`[0:12](${LINK}#12.9)`, '', 'First line.  ', 'Second line.', '', 'A new thought.'));
});

// ------------------------------------------- characters that mean something
// A backslash before a character tells Markdown to show it as it is. What is expected below was written
// by hand from the CommonMark rules; that each one reads back as the words it came from was seen once,
// in a CommonMark reader, and is recorded in the ticket.
test('what a Note says is exported as the characters it was written in, whatever they mean in Markdown', async () => {
  const open = await panelOn(talk, morning());
  await noteAt(open, 12.9, 'Use *stars*, _under_ and `ticks`; see [this](x), <b>now</b>, ~~gone~~, a|b, C:\\dir, &amp; AT&T, snake_case.');

  assert.equal(
    afterTheHead(exported(open)).split('\n')[2],
    'Use \\*stars\\*, \\_under\\_ and \\`ticks\\`; see \\[this\\](x), \\<b>now\\</b>, \\~\\~gone\\~\\~, a\\|b, C:\\\\dir, \\&amp; AT&T, snake_case.'
  );
});

test('a line of a Note that begins the way a heading, a quote, a list or a rule does is exported as the line it is', async () => {
  const open = await panelOn(talk, morning());
  const lines = ['# one', '> two', '- three', '+ four', '1. five', '12) six', '===', '---', '10 green bottles', '    seven', '#eight'];
  await noteAt(open, 12.9, lines.join('\n'));

  assert.deepEqual(afterTheHead(exported(open)).split('\n').slice(2, -1), [
    '\\# one  ',
    '\\> two  ',
    '\\- three  ',
    '\\+ four  ',
    '1\\. five  ',
    '12\\) six  ',
    '\\===  ',
    '\\---  ',
    '10 green bottles  ',
    'seven  ',
    '\\#eight',
  ]);
});

test("the video's title and channel and a Highlight's words are exported as they are written too", async () => {
  const video = { id: talk.id, title: 'C# in *depth*  [live] #', channel: 'A_B <dev>' };
  const open = await panelOn(video, saying([10, '1. First, *really* [Music] no.'], [14, 'Then more.']));
  await select(open, '1. First, *really* [Music] no.');

  assert.equal(
    exported(open),
    text(
      '# C\\# in \\*depth\\* \\[live\\] \\#',
      '',
      `A_B \\<dev> · <${LINK}>`, // an underscore between two letters means nothing
      '',
      `[0:10](${LINK}#10)`,
      '',
      '> 1\\. First, \\*really\\* \\[Music\\] no.'
    )
  );
});

test('a link is written so that no character of its own can end it early', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'How are you?');

  const markdown = exported(open, { linkTo: (videoId, seconds) => `https://example.test/a video (${seconds ?? 'whole'})<x>` });

  assert.equal(markdown.split('\n')[2], 'TED · <https://example.test/a%20video%20%28whole%29%3Cx%3E>');
  assert.equal(markdown.split('\n')[4], '[0:12](https://example.test/a%20video%20%2812%29%3Cx%3E)');
});

test('what there is no way to say is left out: a link nobody can make, and a title and channel the page has not said yet', async () => {
  const open = await panelOn({ ...talk, title: '', channel: '' }, morning());
  await select(open, 'How are you?');

  assert.equal(exported(open), text(`<${LINK}>`, '', `[0:12](${LINK}#12)`, '', '> How are you?'));
  assert.equal(exported(open, { linkTo: () => null }), text('0:12', '', '> How are you?'));
  assert.equal(exported(await panelOn(talk, morning()), { linkTo: () => null }), text('# Do schools kill creativity?', '', 'TED'));
});

// ------------------------------------------------ with the full Transcript
/** What the button would copy with "Include the full transcript" ticked, after the head. */
const withTranscript = (open, options = {}) => afterTheHead(exported(open, { withTranscript: true, ...options }));

test('with the full Transcript, the export is the Transcript as paragraphs that start with their time, and a Highlight is in bold where it shows', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'How are you?');

  assert.equal(
    exported(open, { withTranscript: true }),
    text(
      '# Do schools kill creativity?',
      '',
      `TED · <${LINK}>`,
      '',
      `[0:10](${LINK}#10) Good morning. **How are you?** It's been great. I've been blown away.`
    )
  );
});

test('a paragraph of the Transcript runs for half a minute: the first sentence to start that long after it did starts the next', async () => {
  const open = await panelOn(talk, saying([0, 'One.'], [10, 'Two.'], [20, '(Laughter)'], [29.9, 'Three.'], [30, 'Four.'], [45, 'Five.'], [59.9, 'Six.'], [61, 'Seven.']));

  assert.equal(
    withTranscript(open),
    text(`[0:00](${LINK}#0) One. Two. (Laughter) Three.`, '', `[0:30](${LINK}#30) Four. Five. Six.`, '', `[1:01](${LINK}#61) Seven.`)
  );
});

test('another speaker starts a new paragraph', async () => {
  // Captions mark a change of speaker with ">>".
  const open = await panelOn(talk, saying([0, 'Welcome back.'], [2, '>> Thank you.'], [4, 'Glad to be here.'], [6, '>> So.']));

  assert.equal(withTranscript(open), text(`[0:00](${LINK}#0) Welcome back.`, '', `[0:02](${LINK}#2.5) Thank you. Glad to be here.`, '', `[0:06](${LINK}#6.5) So.`));
});

test('with the full Transcript, each Note stands where the panel draws it, as a quote that starts with its time, and a new paragraph starts after it', async () => {
  const open = await panelOn(talk, morning());
  await selectWithNote(open, 'How are you?', 'He means us.');
  await noteAt(open, 15.9, 'A pause.\nA long one.\n\nThen on.');
  await noteAt(open, 3, 'Before a word.');

  // Where the panel draws them: a Highlight's Note after the last line its Highlight marks, a Note
  // at a Moment after the line being spoken then, and one before anything is said above the first line.
  assert.deepEqual(withNotes(open.now()), [
    '    ↳ 3 s: Before a word.',
    'Good morning.',
    '«How are you?»',
    '    ↳ 12 s: He means us.',
    "It's been great.",
    '    ↳ 15.9 s: A pause.\nA long one.\n\nThen on.',
    "I've been blown away.",
  ]);
  assert.equal(
    withTranscript(open),
    text(
      `> [0:03](${LINK}#3) Before a word.`,
      '',
      `[0:10](${LINK}#10) Good morning. **How are you?**`,
      '',
      `> [0:12](${LINK}#12) He means us.`,
      '',
      `[0:14](${LINK}#14) It's been great.`,
      '',
      `> [0:15](${LINK}#15.9) A pause.  `,
      '> A long one.',
      '>',
      '> Then on.',
      '',
      `[0:20](${LINK}#20) I've been blown away.`
    )
  );
});

test('with the full Transcript, the Note on a Highlight that runs over two lines comes after the second of them', async () => {
  const open = await panelOn(talk, morning());
  await selectWithNote(open, "you? It's", 'Both at once.');

  assert.equal(
    withTranscript(open),
    text(`[0:10](${LINK}#10) Good morning. How are **you? It's** been great.`, '', `> [0:13](${LINK}#13) Both at once.`, '', `[0:20](${LINK}#20) I've been blown away.`)
  );
});

test('a Highlight that crosses a sentence is bold across it, and where a paragraph ends inside it the bold ends there and starts again', async () => {
  const inOneParagraph = await panelOn(talk, morning());
  await select(inOneParagraph, "you? It's been");
  assert.equal(withTranscript(inOneParagraph), text(`[0:10](${LINK}#10) Good morning. How are **you? It's been** great. I've been blown away.`));

  const acrossTwo = await panelOn(talk, saying([0, 'One two.'], [30, 'Three four.']));
  await select(acrossTwo, 'two. Three');
  assert.equal(withTranscript(acrossTwo), text(`[0:00](${LINK}#0) One **two.**`, '', `[0:30](${LINK}#30) **Three** four.`));

  const aroundANote = await panelOn(talk, morning());
  await select(aroundANote, "How are you? It's been great.");
  aroundANote.clock.pass(9);
  await noteAt(aroundANote, 13.5, 'Mid-thought.');
  assert.equal(
    withTranscript(aroundANote),
    text(
      `[0:10](${LINK}#10) Good morning. **How are you?**`,
      '',
      `> [0:13](${LINK}#13.5) Mid-thought.`,
      '',
      `[0:14](${LINK}#14) **It's been great.** I've been blown away.`
    )
  );
});

test('Highlights that share words are one stretch of bold, and two that only touch stay two', async () => {
  const open = await panelOn(talk, morning());
  await select(open, 'Good morning. How');
  await select(open, 'How are you?');
  await select(open, "It's been");
  await select(open, 'great.');
  await select(open, 'blown');
  await select(open, "I've been blown away."); // one inside another

  assert.equal(withTranscript(open), text(`[0:10](${LINK}#10) **Good morning. How are you?** **It's been** **great.** **I've been blown away.**`));
});

test('with the full Transcript, what was said is exported as it is written too, in bold and out of it', async () => {
  const open = await panelOn(talk, saying([0, '[Music]'], [2, 'Rated *five* stars_ by <them>.'], [6, '1. First.']));
  await select(open, '*five* stars_');

  assert.equal(withTranscript(open), text(`[0:00](${LINK}#0) \\[Music\\] Rated **\\*five\\* stars\\_** by \\<them>. 1. First.`));
});

test('colour is not exported: a Highlight reads the same in any of the three', async () => {
  const open = await panelOn(talk, morning());
  await selectWithNote(open, 'How are you?', 'He means us.');
  const inYellow = [exported(open), exported(open, { withTranscript: true })];

  await open.panel.colourHighlight(open.now().highlights[0].id, 'purple');

  assert.equal(open.now().highlights[0].colour, 'purple');
  assert.deepEqual([exported(open), exported(open, { withTranscript: true })], inYellow);
  assert.doesNotMatch(inYellow.join(''), /yellow|purple|colour/i);
});

// ------------------------------------------- when the video is opened again
/** A panel opened again on what an earlier one saved, with another Transcript, or with none. */
const reopened = (earlier, transcript) => panelOn(talk, transcript, { store: earlier.store });

test('with no Transcript on show the export is still everything saved, and asking for the full Transcript changes nothing', async () => {
  const first = await panelOn(talk, morning());
  await selectWithNote(first, 'How are you?', 'He means us.');
  await noteAt(first, 15.9, 'A pause.');
  const saved = text(
    '# Do schools kill creativity?',
    '',
    `TED · <${LINK}>`,
    '',
    `[0:12](${LINK}#12)`,
    '',
    '> How are you?',
    '',
    'He means us.',
    '',
    `[0:15](${LINK}#15.9)`,
    '',
    'A pause.'
  );
  assert.equal(exported(first), saved);

  const withNone = await reopened(first, null);
  const notFetched = await reopened(first, () => Promise.reject(new Error('no answer')));
  const notYet = await reopened(first, () => new Promise(() => {}));

  assert.deepEqual([withNone, notFetched, notYet].map((open) => open.now().transcript.status), ['none', 'failed', 'getting']);
  for (const open of [withNone, notFetched, notYet]) {
    assert.equal(exported(open), saved);
    assert.equal(exported(open, { withTranscript: true }), saved);
  }
});

test("a Highlight's saved words are its quote whatever the Transcript on show writes, and with the full Transcript the bold is on that Transcript's own words", async () => {
  const first = await panelOn(talk, morning());
  await select(first, 'How are you?');

  // The same video with other captions: no capitals and no punctuation.
  const open = await reopened(first, saying([10, 'good morning'], [12, 'how are you'], [14, 'its been great'], [20, 'ive been blown away']));

  assert.equal(afterTheHead(exported(open)), text(`[0:12](${LINK}#12)`, '', '> How are you?'));
  assert.equal(withTranscript(open), text(`[0:10](${LINK}#10) good morning **how are you** its been great ive been blown away`));
});

test('with the full Transcript, a Highlight that shows nowhere on it is written where it falls: its time, its saved words in bold, and its Note', async () => {
  const first = await panelOn(talk, saying([10, 'Good morning.'], [12, 'How *are* you?'], [14, "It's been great."], [20, "I've been blown away."]));
  await selectWithNote(first, 'How *are* you?', 'He means us.');
  await select(first, 'blown away.');

  // The same video with captions in which nothing is said from 12 s to 14 s, or after 20.5 s.
  const open = await reopened(first, saying([10, 'Good morning.'], [14, "It's been great."], [20, "I've"]));

  assert.deepEqual(open.now().marks, new Map(), 'neither Highlight marks a line of this Transcript');
  assert.equal(
    withTranscript(open),
    text(
      `[0:10](${LINK}#10) Good morning.`,
      '',
      `> [0:12](${LINK}#12) **How \\*are\\* you?**`,
      '>',
      '> He means us.',
      '',
      `[0:14](${LINK}#14) It's been great. I've`,
      '',
      `> [0:21](${LINK}#21) **blown away.**`
    )
  );
});

// ---------------------------------------------------------- on real captions
test("on the uploader's captions of a real talk, which time a whole caption at once, a paragraph's time is the start of the caption its first word is in", async () => {
  const open = await panelOn(talk, fromTheUploader());
  await select(open, 'the whole thing. In fact,');
  await selectWithNote(open, 'I have an interest in education.', 'Everybody has one. You too?');
  await noteAt(open, 88.5, 'Education, again.');
  // The caption from 95.345 s reads "And you're never asked back, curiously. That's strange to me.", and this falls between its two sentences.
  await noteAt(open, 96.5, 'Odd.');

  // Written out by hand from the captions as YouTube sent them: the talk starts at 27.103 s, and the
  // captions that start the later paragraphs start at 61.158 s, 71.916 s, 89.69 s, 95.345 s and 125.559 s.
  const blocks = withTranscript(open).split('\n\n');
  assert.deepEqual(blocks.slice(0, 8), [
    `[0:27](${LINK}#27.103) Good morning. How are you? (Audience) Good. It's been great, hasn't it? I've been blown away by **the whole thing. In fact,** I'm leaving. (Laughter) ` +
      'There have been three themes running through the conference, which are relevant to what I want to talk about. ' +
      "One is the extraordinary evidence of human creativity in all of the presentations that we've had and in all of the people here; just the variety of it and the range of it.",
    `[1:01](${LINK}#61.158) The second is that it's put us in a place where we have no idea what's going to happen in terms of the future. No idea how this may play out. **I have an interest in education.**`,
    `> [1:10](${LINK}#70.27) Everybody has one. You too?`,
    `[1:11](${LINK}#71.916) Actually, what I find is, everybody has an interest in education. Don't you? I find this very interesting. ` +
      "If you're at a dinner party, and you say you work in education -- actually, you're not often at dinner parties, frankly. (Laughter)",
    `> [1:28](${LINK}#88.5) Education, again.`,
    `[1:29](${LINK}#89.69) If you work in education, you're not asked. (Laughter) And you're never asked back, curiously.`,
    `> [1:36](${LINK}#96.5) Odd.`,
    `[1:35](${LINK}#95.345) That's strange to me. But if you are, and you say to somebody, you know, they say, "What do you do?" and you say you work in education, you can see the blood run from their face. ` +
      `They're like, "Oh my God. Why me?" (Laughter) "My one night out all week." (Laughter) ` +
      "But if you ask about their education, they pin you to the wall, because it's one of those things that goes deep with people, am I right? Like religion and money and other things.",
  ]);
  assert.ok(blocks[8].startsWith(`[2:05](${LINK}#125.559) So I have a big interest in education,`), blocks[8]);
});
