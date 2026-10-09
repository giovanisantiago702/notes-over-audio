// How a Transcript is cut into sentences, one per line in the panel. The rule
// is the prototype's.
// These tests use small Transcripts written by hand; the three real sets of
// captions are in real-captions.test.js. One test here uses a real set too,
// altered: the uploader's captions with their full stops taken out.

import assert from 'node:assert/strict';

import { cutIntoSentences } from '../src/core/transcript.js';
import { fromTheUploader, test } from './real-captions.js';

/** A word-timed Transcript: one piece per word, 0.3 s apart unless a word is given its own time as "word@12.5". */
function wordTimed(text) {
  let clock = 0;
  const pieces = text.split(' ').map((written) => {
    const [word, at] = written.split('@');
    clock = at === undefined ? clock + 0.3 : Number(at);
    return { text: word, start: clock };
  });
  return { language: 'en', source: 'auto-generated', timing: 'word', pieces };
}

const lines = (transcript) => cutIntoSentences(transcript).sentences.map((sentence) => sentence.text);

test('a Transcript with punctuation is cut at a full stop, a question mark and an exclamation mark', () => {
  assert.deepEqual(lines(wordTimed('Good morning. How are you? It has been great! In fact, I am leaving.')), [
    'Good morning.',
    'How are you?',
    'It has been great!',
    'In fact, I am leaving.',
  ]);
});

test('a title or an initial with a full stop does not end a sentence', () => {
  assert.deepEqual(lines(wordTimed('Please, Mr. President. Thank you, Dr. J. K. Rowling. Good evening.')), [
    'Please, Mr. President.',
    'Thank you, Dr. J. K. Rowling.',
    'Good evening.',
  ]);
});

test('with no punctuation, a pause of 0.7 s ends a sentence', () => {
  // "you" is said at 1.2 s and "its" at exactly 1.9 s; "it" at 3.3 s and "in" just short of 0.7 s later.
  assert.deepEqual(lines(wordTimed('good@0.3 morning@0.6 how@0.9 are@1.1 you@1.2 its@1.9 been@2.2 great@2.5 hasnt@3.0 it@3.3 in@3.99 fact@4.2')), [
    'good morning how are you',
    'its been great hasnt it in fact',
  ]);
});

/** Words "w1 w2 …" said 0.3 s apart, with a longer pause after the words named in `pauses`, as { 12: 0.6 }. */
function run(count, pauses = {}) {
  let clock = 0;
  const written = [];
  for (let n = 1; n <= count; n += 1) {
    written.push(`w${n}@${clock.toFixed(1)}`);
    clock += pauses[n] ?? 0.3;
  }
  return wordTimed(written.join(' '));
}
const wordCounts = (transcript) => lines(transcript).map((line) => line.split(' ').length);

test('with no punctuation, a run of more than 26 words is cut at its longest pause', () => {
  assert.deepEqual(wordCounts(run(26)), [26]);
  assert.deepEqual(wordCounts(run(30, { 12: 0.6 })), [12, 18]);
  // Each part longer than 26 words is cut again the same way.
  assert.deepEqual(wordCounts(run(60, { 20: 0.6, 45: 0.5 })), [20, 25, 15]);
});

test('a long run is not cut within its first five words or its last five', () => {
  assert.deepEqual(wordCounts(run(30, { 2: 0.6, 20: 0.5, 27: 0.6 })), [20, 10]);
});

test('a bracketed sound such as [Music] ends the sentence before it and stands on a line of its own', () => {
  const withPunctuation = wordTimed('[applause] Thank you. Please (Laughter) remain seated.');
  assert.deepEqual(lines(withPunctuation), ['[applause]', 'Thank you.', 'Please', '(Laughter)', 'remain seated.']);
  assert.deepEqual(
    cutIntoSentences(withPunctuation).sentences.map((sentence) => sentence.sound),
    [true, false, false, true, false]
  );

  assert.deepEqual(lines(wordTimed('good morning [Music] how are you')), ['good morning', '[Music]', 'how are you']);
});

test('a sound written as several words is one sound', () => {
  const transcript = { language: 'en', source: 'auto-generated', timing: 'word', pieces: [
    { text: 'Good', start: 1 },
    { text: ' evening.', start: 1.3 },
    { text: ' [clears throat]', start: 1.9 },
    { text: ' Thank', start: 2.6 },
    { text: ' you.', start: 2.8 },
  ] };

  assert.deepEqual(lines(transcript), ['Good evening.', '[clears throat]', 'Thank you.']);
});

test('a change of speaker ends a sentence, whether a piece says so or the text marks it with >>', () => {
  const transcript = { language: 'en', source: 'auto-generated', timing: 'word', pieces: [
    { text: 'Is', start: 1 },
    { text: 'that', start: 1.2 },
    { text: 'right', start: 1.4 },
    { text: 'Yes,', start: 1.6, newSpeaker: true },
    { text: 'it', start: 1.8 },
    { text: 'is.', start: 2 },
    { text: '>> Thank', start: 2.2 },
    { text: 'you.', start: 2.4 },
    { text: '>>', start: 2.6 },
    { text: 'Good', start: 2.6 },
    { text: 'night.', start: 2.8 },
  ] };

  const { words, sentences } = cutIntoSentences(transcript);

  assert.deepEqual(sentences.map((sentence) => sentence.text), ['Is that right', 'Yes, it is.', 'Thank you.', 'Good night.']);
  assert.deepEqual(sentences.map((sentence) => sentence.newSpeaker), [false, true, true, true]);
  assert.deepEqual(words.filter((word) => word.newSpeaker).map((word) => word.text), ['Yes,', 'Thank', 'Good']);
});

test('on a word-timed Transcript each word keeps its own time, and a sentence starts with its first word', () => {
  const { words, sentences } = cutIntoSentences(wordTimed('Good@27.1 morning.@27.44 How@28.49 are@28.6 you?@28.9'));

  assert.deepEqual(
    words.map((word) => [word.text, word.start]),
    [['Good', 27.1], ['morning.', 27.44], ['How', 28.49], ['are', 28.6], ['you?', 28.9]]
  );
  assert.deepEqual(
    sentences.map((sentence) => ({ text: sentence.text, start: sentence.start, first: sentence.first, last: sentence.last })),
    [
      { text: 'Good morning.', start: 27.1, first: 0, last: 1 },
      { text: 'How are you?', start: 28.49, first: 2, last: 4 },
    ]
  );
});

test('on a cue-timed Transcript a sentence can end inside a cue, and each word remembers its cue', () => {
  const transcript = { language: 'en', source: 'uploader', timing: 'cue', pieces: [
    { text: 'Good morning. How are you?', start: 27.103, end: 29.678 },
    { text: '(Audience) Good.', start: 29.702, end: 31.105 },
    { text: "It's been great,\nhasn't it?", start: 31.129, end: 32.797 },
  ] };

  const { words, sentences } = cutIntoSentences(transcript);

  // A word in a cue has no time of its own. Its start is placed inside the cue
  // by how far along the cue's text it stands: "How" is 14 characters into 26,
  // so 27.103 + 2.575 × 14/26 = 28.490 to the millisecond.
  assert.deepEqual(
    sentences.map((sentence) => [sentence.text, sentence.start]),
    [
      ['Good morning.', 27.103],
      ['How are you?', 28.49],
      ['(Audience)', 29.702],
      ['Good.', 30.667],
      ["It's been great, hasn't it?", 31.129],
    ]
  );
  // The cue's own start and end are the times that can be trusted.
  assert.deepEqual(words.map((word) => word.piece), [0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2]);
});

// --------------------------------------------------------- cues that overlap
const startsOf = (transcript) => cutIntoSentences(transcript).words.map((word) => [word.text, word.start]);

test('where a cue comes on before the one before it has ended, the earlier cue\'s words are placed in the time it had to itself', () => {
  // The first cue is up from 10 to 14 s, and the second comes on at 11 s. So the first has one second
  // to itself, and "How", 14 characters into its 26, is placed at 10 + 1 × 14/26 = 10.538 s. Placed in
  // the whole of its four seconds it would be at 12.154 s, after the "Fine." that follows it.
  const transcript = { language: 'en', source: 'uploader', timing: 'cue', pieces: [
    { text: 'Good morning. How are you?', start: 10, end: 14 },
    { text: 'Fine.', start: 11, end: 13 },
    { text: 'And you?', start: 14, end: 16 },
  ] };

  assert.deepEqual(startsOf(transcript), [['Good', 10], ['morning.', 10.192], ['How', 10.538], ['are', 10.692], ['you?', 10.846], ['Fine.', 11], ['And', 14], ['you?', 15]]);
});

test('cues that come on together are placed one after the other in the time they share', () => {
  // Two cues from 10 to 12 s, 13 characters and 12. "How" comes after the 13 of the first: 10 + 2 × 13/25 = 11.04 s.
  const transcript = { language: 'en', source: 'uploader', timing: 'cue', pieces: [
    { text: 'Good morning.', start: 10, end: 12 },
    { text: 'How are you?', start: 10, end: 12 },
    { text: 'Fine.', start: 12, end: 14 },
  ] };

  assert.deepEqual(startsOf(transcript), [['Good', 10], ['morning.', 10.4], ['How', 11.04], ['are', 11.36], ['you?', 11.68], ['Fine.', 12]]);
});

test('whatever the cues of a cue-timed Transcript, no word starts before the word before it', () => {
  const piecesOf = [
    [[10, 14, 'Good morning. How are you?'], [11, 13, 'Fine.'], [14, 16, 'And you?']],
    [[10, 20, 'I think we should go now. Do you agree?'], [11, 12, 'Yes.'], [13, 14, 'Of course.'], [20, 22, 'Good.']],
    // Listed out of the order they start in, which a Transcript should not be.
    [[10, 12, 'Good morning. How are you?'], [14, 16, 'And you?'], [12, 14, 'Fine. Thank you.'], [16, 18, 'Very well.']],
    // A cue with no length, and one that ends before it starts.
    [[10, 10, 'Good morning. How are you?'], [10, 9, 'Fine.'], [9.5, 12, 'And you?']],
  ];

  for (const said of piecesOf) {
    const starts = startsOf({ language: 'en', source: 'uploader', timing: 'cue', pieces: said.map(([start, end, text]) => ({ start, end, text })) });

    starts.slice(1).forEach(([text, start], i) => assert.ok(start >= starts[i][1], `"${text}" at ${start} s comes after ${starts[i][1]} s`));
  }
});

// ------------------------------------------ cue-timed, with no punctuation
// A word in a cue has no time of its own, so nothing is known of a pause
// inside a cue. What the captions do say is where one cue ends and the next starts.

/** A cue-timed Transcript of the uploader's, each cue a start, an end and its text. */
const cues = (...said) => ({ language: 'en', source: 'uploader', timing: 'cue', pieces: said.map(([start, end, text]) => ({ start, end, text })) });

test('on a cue-timed Transcript with no punctuation, a sentence ends only where one cue ends 0.7 s or more before the next starts', () => {
  // The first cue takes 4 s over five words. Placed by how far along the text each stands, "evidence"
  // comes 1.7 s after "extraordinary" and 1 s before "of": two pauses nobody made.
  const transcript = cues(
    [10, 14, 'one is the extraordinary evidence'],
    [14, 16, 'of human creativity'], // straight on from the cue before
    [16.69, 18, 'in all of us'], // 0.69 s after it, which is short of a pause
    [18.7, 20, 'thank you'] // 0.7 s after it
  );

  assert.deepEqual(lines(transcript), ['one is the extraordinary evidence of human creativity in all of us', 'thank you']);
});

/** Cues of seven words each, "a1 a2 a3 extraordinarily a5 a6 a7", every one 2 s long, starting at the times given. */
const sevenWordCues = (...starts) => cues(...starts.map((start, n) => [start, start + 2, [1, 2, 3, 'extraordinarily', 5, 6, 7].map((word) => (typeof word === 'number' ? 'abcdef'[n] + word : word)).join(' ')]));
const lastWords = (transcript) => lines(transcript).map((line) => line.split(' ').at(-1));

test('on a cue-timed Transcript a run of more than 26 words is cut between two cues: at the longest gap, and where the gaps are alike at the one nearest the middle', () => {
  // Six cues with no time between them, 42 words. Each has a long word in it, and by its place in the
  // text the word after that one comes a second later: the longest pause there is, if those times are believed.
  assert.deepEqual(lastWords(sevenWordCues(0, 2, 4, 6, 8, 10)), ['c7', 'f7']);
  // The second cue ends 0.4 s before the third starts, so the run is cut there. That leaves 28 words in
  // four cues with no time between them, which are cut in the middle.
  assert.deepEqual(lastWords(sevenWordCues(0, 2, 4.4, 6.4, 8.4, 10.4)), ['b7', 'd7', 'f7']);
});

test('a cue of more than 26 words with no punctuation stays one line: there is nowhere in it to cut', () => {
  const long = Array.from({ length: 30 }, (_, n) => (n === 14 ? 'extraordinarily' : `w${n + 1}`)).join(' ');

  assert.deepEqual(wordCounts(cues([0, 12, long])), [30]);
  // With a cue on either side of it, the line ends where the cue does.
  assert.deepEqual(wordCounts(cues([0, 2, 'a1 a2 a3 a4 a5 a6'], [2, 14, long], [14, 16, 'c1 c2 c3 c4 c5 c6'])), [6, 30, 6]);
});

// The talk's real uploader captions with the marks that end a sentence taken out, which is how an
// uploader's captions with no punctuation read. None of the three real sets is like that as it stands.
const withoutStops = (transcript) => ({ ...transcript, pieces: transcript.pieces.map((piece) => ({ ...piece, text: piece.text.replace(/[.!?]/g, '') })) });

test("the talk's real uploader captions with their full stops taken out: a line ends between two cues or at a bracketed sound, and nowhere else", () => {
  const transcript = withoutStops(fromTheUploader());
  const { words, sentences } = cutIntoSentences(transcript);
  const ms = (seconds) => Math.round(seconds * 1000);
  const cueOf = (place) => transcript.pieces[words[place].piece];

  // Read off the captions. Their first cues, with the time from each one's end to the next one's start:
  //   27.103  Good morning How are you                                   24 ms
  //   29.702  (Audience) Good                                            24 ms
  //   31.129  It's been great, hasn't it                                611 ms
  //   33.408  I've been blown away by the whole thing                    24 ms
  //   35.753  In fact, I'm leaving                                       24 ms
  //   37.269  (Laughter)                                               1921 ms
  //   43.096  There have been three themes / running through the conference,   24 ms   (9 words)
  //   46.687  which are relevant / to what I want to talk about          24 ms   (10)
  //   48.997  One is the extraordinary / evidence of human creativity    24 ms   (8)
  //   53.491  in all of the presentations that we've had                 24 ms   (8)
  //   55.928  and in all of the people here;                             24 ms   (7)
  //   57.904  just the variety of it / and the range of it              603 ms   (10)
  //   61.158  The second is that it's put us in a place …
  // No two of those cues are 0.7 s apart but around the laughter, so from 43.096 s the words run on, 129
  // of them, to the next (Laughter). That run is cut at its longest gap, the 603 ms. The 52 words
  // before it are cut where the gaps are all alike, nearest the middle: after 27 words, and those 27
  // again after 9.
  assert.deepEqual(sentences.slice(0, 7).map((sentence) => sentence.text), [
    'Good morning How are you',
    '(Audience)',
    "Good It's been great, hasn't it I've been blown away by the whole thing In fact, I'm leaving",
    '(Laughter)',
    'There have been three themes running through the conference,',
    'which are relevant to what I want to talk about One is the extraordinary evidence of human creativity',
    "in all of the presentations that we've had and in all of the people here; just the variety of it and the range of it",
  ]);

  // No line ends inside a cue, but where a bracketed sound stands in it.
  const endsInsideACue = sentences.filter((sentence, at) => {
    const next = sentences[at + 1];
    return next && words[sentence.last].piece === words[next.first].piece && !sentence.sound && !next.sound;
  });
  assert.deepEqual(endsInsideACue.map((sentence) => sentence.text), []);
  // Where the captions do show a pause, a line ends.
  const runsOnThroughAPause = sentences.filter((sentence) =>
    words.slice(sentence.first, sentence.last).some((word, i) => ms(cueOf(sentence.first + i + 1).start) - ms(cueOf(sentence.first + i).end) >= 700)
  );
  assert.deepEqual(runsOnThroughAPause.map((sentence) => sentence.text), []);
  // A long run is still cut: no cue of these has more than 17 words, so there is always somewhere to cut it.
  assert.equal(Math.max(...sentences.map((sentence) => sentence.last - sentence.first + 1)), 26);
  // And a line of one word is a bracketed sound, or a cue of one word, and never a piece of a clause.
  const oneWord = sentences.filter((sentence) => sentence.first === sentence.last && !sentence.sound);
  assert.deepEqual(oneWord.filter((sentence) => cueOf(sentence.first).text.trim() !== sentence.text).map((sentence) => sentence.text), []);
});
