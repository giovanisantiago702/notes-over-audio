// H keeps the sentence just spoken. This is the rule for which sentence that
// is, as Giovani saw it in the prototype.

import { sentenceSpokenAt } from './following.js';
import { highlightOf, placeHighlight } from './highlights.js';

// By the time the key is down, the sentence that was meant is a moment past.
// H takes the one that was being said this long before.
const LOOK_BACK_MS = 1200;

/**
 * A bracketed sound such as [Music] is a line of the Transcript and not
 * something said. From a place in `sentences`, this is the nearest place at or
 * before it that holds something said, or -1.
 */
function saidAtOrBefore(sentences, place) {
  while (place >= 0 && sentences[place].sound) place -= 1;
  return place;
}

/**
 * Which sentence H takes at a time: the one that was being said 1.2 s
 * earlier, or, when that is a bracketed sound, what was last said before it.
 * @param {import('./transcript.js').Sentence[]} sentences  In the order they are spoken.
 * @param {number} seconds  The video's time when H was pressed.
 * @returns {number}  The sentence's place in `sentences`, or -1 when there is none to take.
 */
export function sentenceJustSpoken(sentences, seconds) {
  // In whole milliseconds, as the captions time their words.
  return saidAtOrBefore(sentences, sentenceSpokenAt(sentences, (Math.round(seconds * 1000) - LOOK_BACK_MS) / 1000));
}

/**
 * A Highlight grown back by one sentence: from the start of what was said
 * before the sentence its first word is in, to where it ended already. It is
 * the same Highlight, with its id and when it was made. `highlightOf` works
 * out afresh what it works out for any Highlight, and whatever else this one
 * carries, such as a colour, stays.
 * @param {import('./panel.js').ShownTranscript} transcript  A Transcript that is ready.
 * @param {import('./highlights.js').Highlight} highlight
 * @returns {import('./highlights.js').Highlight | null}  Null when nothing was said before it, or it shows nowhere on this Transcript.
 */
export function reachBack(transcript, highlight) {
  const { sentences } = transcript;
  const placed = placeHighlight(transcript, highlight);
  if (!placed) return null;
  const before = saidAtOrBefore(sentences, sentences.findLastIndex((sentence) => sentence.first <= placed.first) - 1);
  if (before < 0) return null;
  // What `highlightOf` works out is left behind, `occurrence` too, which it gives only where there is one to give.
  const { start, end, words, transcript: madeOn, occurrence, ...rest } = highlight;
  return { ...rest, ...highlightOf(transcript, sentences[before].first, placed.last, { id: highlight.id, made: new Date(highlight.made) }) };
}

/**
 * What H does. The panel (./panel.js) builds it, and gives it what it needs of
 * the panel's own.
 * @param {object} given
 * @param {import('./panel.js').Player} given.player
 * @param {ReturnType<import('./just-made.js').createJustMade>} given.justMade
 * @param {() => { transcript: import('./panel.js').ShownTranscript | null, highlights: import('./highlights.js').Highlight[] }} given.onShow
 *   What the panel has on show now.
 * @param {(was: import('./highlights.js').Highlight | null, next: import('./highlights.js').Highlight) => Promise<void>} given.change
 *   Keeps a Highlight of the video on show in place of the one it was, if it was one, and shows it. The
 *   Highlight is then the one just made, as one that H made or grew, which H again grows.
 * @returns {() => Promise<void>}  Call it when H is pressed.
 */
export function createKeepJustSpoken({ player, justMade, onShow, change }) {
  return async function keepJustSpoken() {
    const { transcript, highlights } = onShow();
    if (transcript?.status !== 'ready') return;

    // H again: the Highlight H just made, or just grew, reaches one sentence further back. One just
    // made by selecting does not: H never stretches what the person chose by hand, and goes on to
    // take the sentence just spoken, as it does when nothing was just made.
    const growing = highlights.find((highlight) => highlight.id === justMade.toGrow());
    if (growing) {
      const grown = reachBack(transcript, growing);
      if (grown) await change(growing, grown);
      return;
    }

    // The player cannot say the time while an advert plays, and then there is no sentence to take.
    const seconds = await player.currentTime();
    if (seconds == null || onShow().transcript !== transcript) return;
    const sentence = transcript.sentences[sentenceJustSpoken(transcript.sentences, seconds)];
    if (!sentence) return;
    // A sentence that is already a Highlight, from its first word to its last, gets no second one.
    // That Highlight is taken up instead: it is the one just made, so N writes its Note on it. H
    // again does not grow it. How a Highlight was made is not kept, so nothing says a hand did not
    // select this one, and one that a hand selected is never stretched.
    const already = onShow().highlights.find((highlight) => {
      const placed = placeHighlight(transcript, highlight);
      return placed?.first === sentence.first && placed.last === sentence.last;
    });
    if (already) justMade.made(already.id);
    else await change(null, highlightOf(transcript, sentence.first, sentence.last));
  };
}
