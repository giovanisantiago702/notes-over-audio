// What the panel's side knows about YouTube's captions: which of a video's
// captions to take, how long to wait for them, and how they are written (the
// format YouTube calls json3). They leave here as a Transcript, and nothing of
// YouTube's goes further in (see src/core/transcript.js).
//
// It is a module, so it is tested in Node, against a stand-in for the page.
// The reading of YouTube's page itself is in youtube-page.js and
// youtube-player.js, which are plain scripts and are not.

/**
 * Turns one set of captions, as YouTube sent it, into a Transcript.
 * @param {string} body  The captions, as text.
 * @param {{ language: string, auto: boolean }} which  Which of the video's captions they are.
 * @returns {import('../core/transcript.js').Transcript}
 */
export function transcriptFromCaptions(body, { language, auto }) {
  // A caption is a list of parts. The lines that only break a row ("aAppend") and the ones with no text are not speech.
  const captions = (JSON.parse(body).events ?? []).filter((caption) => caption.segs && !caption.aAppend);
  // Auto-generated captions time every part, a word or two, by its offset
  // into the caption. The uploader's captions time the caption as a whole.
  const timing = captions.some((caption) => caption.segs.some((part) => 'tOffsetMs' in part)) ? 'word' : 'cue';
  const pieces = [];
  for (const caption of captions) {
    if (timing === 'word') {
      for (const part of caption.segs) {
        const piece = { text: part.utf8 ?? '', start: (caption.tStartMs + (part.tOffsetMs ?? 0)) / 1000 };
        if (part.isSpeakerChange) piece.newSpeaker = true;
        if (piece.text.trim()) pieces.push(piece);
      }
    } else {
      const piece = {
        text: caption.segs.map((part) => part.utf8 ?? '').join(''),
        start: caption.tStartMs / 1000,
        end: (caption.tStartMs + (caption.dDurationMs ?? 0)) / 1000,
      };
      if (piece.text.trim()) pieces.push(piece);
    }
  }
  pieces.sort((a, b) => a.start - b.start); // pieces at the same time keep their order
  return { language, source: auto ? 'auto-generated' : 'uploader', timing, pieces };
}

// YouTube answers a request for captions with nothing unless it carries a
// token the player makes for itself, and the player may take a while to make
// it. So the page is asked again this often until its player has the token.
const ASK_AGAIN_MS = 500;

// How long to wait for the token before saying the Transcript could not be
// fetched: 90 s, not counting the time an advert plays.
//
// What has been seen (2026-10-07). With no advert the token is there within
// a few seconds of the page loading, and about a second after moving to
// another video. With adverts before the video it comes as the last one
// ends: 55 s and 73 s in a tab in front, and 40 s in a background tab, where
// the advert never played. An advert can outlast any limit, which is why its
// time is not counted. The 90 s is then a little over twice the longest wait
// seen, in case the page does not say that an advert is why.
const WAIT_FOR_TOKEN_MS = 90_000;

/**
 * Makes the function the core is given to fetch a video's Transcript: null
 * for a video with no captions, and a failure when the token does not come or
 * YouTube answers with nothing.
 * @param {object} given
 * @param {(message: object) => Promise<any>} given.askPage  Asks the page script in the panel's tab (youtube-page.js).
 * @param {(ms: number) => Promise<void>} [given.pause]      Waits. Tests give their own pause and clock, so that no test waits.
 * @param {() => number} [given.now]                         The time in milliseconds.
 * @returns {import('../core/panel.js').FetchTranscript}
 */
export function createTranscriptFetcher({ askPage, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = Date.now }) {
  return async function fetchTranscript(video) {
    let waitingSince = now();
    for (;;) {
      // No answer: the page's player has not caught up with the address yet.
      const page = await askPage({ type: 'which-captions' });
      if (page) {
        if (page.video !== video.id) throw new Error('The page is on another video.');
        if (page.advert) waitingSince = now();
        if (!page.captions.length) return null;
        const index = choose(page.captions);
        if (page.captions[index].hasToken) {
          const answer = await askPage({ type: 'fetch-captions', video: video.id, index });
          // Asked once. An empty answer to a request that carries the token is YouTube's refusal.
          if (!answer?.body) throw new Error(`YouTube answered with nothing${answer?.error ? `: ${answer.error}` : answer ? ` (HTTP ${answer.status})` : ''}.`);
          return transcriptFromCaptions(answer.body, page.captions[index]);
        }
      }
      if (now() - waitingSince >= WAIT_FOR_TOKEN_MS) throw new Error(`The player gave no token in ${WAIT_FOR_TOKEN_MS / 1000} s.`);
      await pause(ASK_AGAIN_MS);
    }
  };
}

/**
 * Which of a video's captions become its Transcript: the uploader's when they
 * are in the language the video is spoken in, otherwise the auto-generated.
 * @param {{ language: string, auto: boolean, shownByDefault: boolean }[]} captions  As the page lists them, at least one.
 * @returns {number} Its place in the list.
 */
function choose(captions) {
  const fromTheUploader = (wanted) => captions.findIndex((each) => !each.auto && wanted(each));
  const autoGenerated = (wanted) => captions.findIndex((each) => each.auto && wanted(each));
  const any = () => true;
  // Nothing names the spoken language, so the player's own choice is the best guess.
  if (autoGenerated(any) < 0) return Math.max(0, fromTheUploader((each) => each.shownByDefault));

  // A video's one set of auto-generated captions is in the spoken language, so
  // it names it. A video dubbed into other languages has a set for every dubbed
  // audio track as well, and the first of those names nothing. There the
  // captions the player shows by default name it, whoever made them.
  const several = captions.filter((each) => each.auto).length > 1;
  const shown = captions.find((each) => each.shownByDefault);
  const spoken = (several && shown ? shown : captions[autoGenerated(any)]).language;
  const base = (language) => language.split('-')[0].toLowerCase(); // "en-GB" is English
  const exactly = (each) => each.language === spoken;
  const regionally = (each) => base(each.language) === base(spoken);
  return [fromTheUploader(exactly), fromTheUploader(regionally), autoGenerated(exactly), autoGenerated(regionally), autoGenerated(any)].find((index) => index >= 0);
}
