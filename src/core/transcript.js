// The Transcript as the core holds it, and how it is cut into sentences. The
// sentence rule is the one Giovani saw in the prototype, and it cuts
// the three real sets of captions in test/captions exactly as the prototype does.

/**
 * A Transcript: the words spoken in a video, as an ordered list of timed
 * pieces of text. Nothing in it says where it was fetched from or how.
 * @typedef {object} Transcript
 * @property {string} language                       Such as "en".
 * @property {'uploader' | 'auto-generated'} source  Where it came from. With `language` it says which of the video's Transcripts this is.
 * @property {'word' | 'cue'} timing                 "word": a piece is a word or two with its own time. "cue": a piece is a whole caption, timed as one.
 * @property {Piece[]} pieces                        In the order they are spoken.
 */

/**
 * @typedef {object} Piece
 * @property {string} text           One or more words, as written. It may hold line breaks and a ">>" for a change of speaker.
 * @property {number} start          Seconds into the video.
 * @property {number} [end]          Seconds. Only a cue has one: a word-timed piece is known by its start alone.
 * @property {boolean} [newSpeaker]  Someone else starts speaking with this piece.
 */

/**
 * A Transcript cut into sentences: every word, and where each sentence starts and ends among them.
 * @typedef {object} Cut
 * @property {Word[]} words
 * @property {Sentence[]} sentences
 */

/**
 * @typedef {object} Word
 * @property {string} text         As written, with its punctuation: "seated."
 * @property {number} start        Seconds. On a word-timed Transcript, its own time. On a cue-timed one a word has
 *                                 no time of its own: this is a place inside its cue, good for following playback
 *                                 and no more, and never for telling a pause. The times to trust there are the
 *                                 cue's, `pieces[word.piece]`. No word starts before the word before it.
 * @property {number} piece        Which piece of the Transcript it came from, counted from 0.
 * @property {boolean} sound       A bracketed sound such as [Music] or (Laughter), not something said.
 * @property {boolean} newSpeaker  Someone else starts speaking with this word.
 */

/**
 * @typedef {object} Sentence
 * @property {number} first        Its first word's place in `words`.
 * @property {number} last         Its last word's place in `words`.
 * @property {number} start        Seconds: its first word's start.
 * @property {string} text         Its words with one space between them.
 * @property {boolean} sound       It is one bracketed sound and nothing else.
 * @property {boolean} newSpeaker  Someone else starts speaking with it.
 */

// A word is a run of anything but spaces, and a bracketed sound is one word
// however many it is written as: "[clears throat]", "(Laughter)".
const WORD = /\[[^\]]*\]|\([^)]*\)|\S+/g;
const isSound = (text) => /^\[[^\]]*\][.,;:!?]?$/.test(text) || /^\([A-Z][\w'’]*( [\w'’]+){0,2}\)[.,;:!?]?$/.test(text);
const ENDS = /[.!?]["'”’)\]]*$/;
const ABBREVIATION = /^([A-Z]|[Mm]rs?|[Mm]s|[Dd]r|[Ss]t|[Jj]r|[Ss]r|[Pp]rof|[Gg]en|[Ss]en|[Rr]ep|[Gg]ov|[Ll]t|[Cc]ol|vs)\.$/;
const endsSentence = (text) => ENDS.test(text) && !ABBREVIATION.test(text);

// With no punctuation, a pause this long stands in for a full stop, and a run
// of more words than this is cut at its longest pause.
const PAUSE_MS = 700;
const LONGEST_RUN = 26;

/**
 * Where the words of each cue of a cue-timed Transcript are placed in time:
 * the stretch of time its text is spread over, from the cue's start, and how
 * much text comes before it in that stretch.
 *
 * A cue's stretch runs to its end, as the captions give it, or to the start
 * of the next cue when that comes first: cues can overlap, and a cue's words
 * give way to the next cue's when that cue comes on. Cues that come on
 * together share one stretch and are placed in it one after the other, and a
 * cue listed after one that starts later is placed with that one. So no word
 * is placed before the word before it, whatever the cues: the sentences of a
 * Transcript start in the order they come, which is what finding the one
 * being spoken counts on (./following.js).
 * @param {Piece[]} pieces
 * @returns {{ startMs: number, lengthMs: number, before: number, characters: number }[]}  One for each piece.
 *   `before` and `characters` count characters of text: those of the cues placed ahead of it in its stretch, and of all the cues in it.
 */
function stretchesOf(pieces) {
  const ms = (seconds) => Math.round(seconds * 1000);
  const stretches = [];
  for (let first = 0; first < pieces.length; ) {
    const startMs = ms(pieces[first].start);
    let last = first;
    while (last + 1 < pieces.length && ms(pieces[last + 1].start) <= startMs) last += 1;
    const together = pieces.slice(first, last + 1);
    const endMs = Math.max(...together.map((piece) => ms(piece.end ?? piece.start)));
    const untilMs = last + 1 < pieces.length ? Math.min(endMs, ms(pieces[last + 1].start)) : endMs;
    const characters = Math.max(1, together.reduce((sum, piece) => sum + piece.text.length, 0));
    let before = 0;
    for (const piece of together) {
      stretches.push({ startMs, lengthMs: Math.max(0, untilMs - startMs), before, characters });
      before += piece.text.length;
    }
    first = last + 1;
  }
  return stretches;
}

/**
 * Cuts a Transcript into sentences. With punctuation a sentence ends at a
 * full stop, question mark or exclamation mark. Without it, at a pause of
 * 0.7 s, and a run of more than 26 words is cut at its longest pause. On a
 * cue-timed Transcript the only pauses are between one cue and the next, so
 * without punctuation no sentence ends inside a cue. A change of speaker or
 * a bracketed sound ends a sentence either way.
 * @param {Transcript} transcript
 * @returns {Cut}
 */
export function cutIntoSentences(transcript) {
  const cueTimed = transcript.timing === 'cue';
  const words = [];
  const ms = []; // each word's time in whole milliseconds, so that a pause of 0.7 s compares as 0.7 s
  let newSpeaker = false; // waits for the next word
  // A word in a cue has no time of its own, so it is placed in time by how far along the text it stands.
  const placed = cueTimed ? stretchesOf(transcript.pieces) : null;
  transcript.pieces.forEach((piece, index) => {
    const { startMs, lengthMs, before, characters } = placed?.[index] ?? { startMs: Math.round(piece.start * 1000), lengthMs: 0, before: 0, characters: 1 };
    if (piece.newSpeaker) newSpeaker = true;
    for (const found of piece.text.matchAll(WORD)) {
      // Captions mark a change of speaker with ">>", which is not a word.
      if (found[0].startsWith('>>')) newSpeaker = true;
      const text = found[0].replace(/^>>/, '');
      if (!text) continue;
      const wordMs = Math.round(startMs + lengthMs * ((before + found.index) / characters));
      ms.push(wordMs);
      words.push({ text, start: wordMs / 1000, piece: index, sound: isSound(text), newSpeaker });
      newSpeaker = false;
    }
  });
  // Old auto-generated captions have a stray full stop or two, so a Transcript
  // counts as punctuated only when more than one word in fifty ends with a stop.
  const punctuated = words.filter((word) => ENDS.test(word.text)).length / Math.max(1, words.length) > 0.02;

  // The pause after a word, in milliseconds: how long until the next word. On
  // a cue-timed Transcript the captions show a pause in one place only, where
  // one cue ends and the next starts. A word's time inside its cue is worked
  // out from the text, and a pause read off those times was never made. So
  // there the pause after a cue's last word is the time from its cue's end to
  // the next cue's start, none where the two overlap, and after any other
  // word no pause is known, which is the -1.
  const cueOf = (i) => transcript.pieces[words[i].piece];
  const betweenCues = (cue, next) => Math.max(0, Math.round(next.start * 1000) - Math.round((cue.end ?? cue.start) * 1000));
  const sameCue = (i) => words[i].piece === words[i + 1].piece;
  const pauseAfter = cueTimed ? (i) => (sameCue(i) ? -1 : betweenCues(cueOf(i), cueOf(i + 1))) : (i) => ms[i + 1] - ms[i];

  const sentences = [];
  const add = (first, last) => {
    sentences.push({
      first,
      last,
      start: words[first].start,
      text: words.slice(first, last + 1).map((each) => each.text).join(' '),
      sound: first === last && words[first].sound,
      newSpeaker: words[first].newSpeaker,
    });
  };
  // A run of words with no punctuation, cut at its longest pause for as long
  // as it is too long. The cut is never within the first five words or the last five.
  //
  // On a cue-timed Transcript that is a cut between two cues. A run with no
  // two cues to cut between, one cue of forty words say, stays whole. And
  // captions that run on have the same gap between every two cues, often
  // none, so the longest pause is many pauses alike. Of those the cut is at
  // the one nearest the middle of the run, which halves it; the first of them
  // would take one cue off the front each time and leave a long last line.
  // On a word-timed Transcript the first of them is taken, as the prototype does.
  const addRun = (first, last) => {
    let longest = -1;
    let at = -1;
    /** How far a cut after a word is from halving the run, in words. */
    const offCentre = (i) => Math.abs(2 * i + 1 - first - last);
    if (last - first + 1 > LONGEST_RUN) {
      for (let i = first + 4; i <= last - 5; i += 1) {
        const pause = pauseAfter(i);
        const nearerTheMiddle = cueTimed && pause >= 0 && pause === longest && offCentre(i) < offCentre(at);
        if (pause > longest || nearerTheMiddle) [longest, at] = [pause, i];
      }
    }
    if (at < 0) return add(first, last);
    addRun(first, at);
    addRun(at + 1, last);
  };

  let first = 0;
  words.forEach((word, i) => {
    const next = words[i + 1];
    // Whatever the punctuation, a sound stands alone and a new speaker starts a sentence.
    const edge = !next || word.sound || next.sound || next.newSpeaker;
    if (punctuated) {
      if (!edge && !endsSentence(word.text)) return;
      add(first, i);
    } else {
      if (!edge && pauseAfter(i) < PAUSE_MS) return;
      addRun(first, i);
    }
    first = i + 1;
  });
  return { words, sentences };
}
