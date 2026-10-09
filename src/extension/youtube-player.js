// The part of the page script that has to run in the page's own world.
//
// YouTube answers a request for captions with nothing (HTTP 200, no body)
// unless the request carries a token that YouTube's player makes for itself.
// The player keeps the token in the addresses of its own copies of the
// video's captions, and those copies are objects of the page: an extension's
// ordinary script cannot see them. So this file reads them, and makes the
// request from inside the page. It does nothing else, and it holds no chrome.*:
// youtube-page.js asks it with one event on the document and it answers with
// another, both carrying text.
//
// The recipe is the one that worked by hand in the live check.
//
// Chrome loads it as a plain script, not a module, so it cannot import.

(() => {
  // These four are written again in youtube-page.js, because neither script
  // can import: the two events the scripts talk by, how the watched video's
  // id is read, and how a video's id starts, which is also in
  // youtube-links.js. test/build.test.js holds the copies together.
  const ASKED = 'notes-over-audio:asked';
  const ANSWERED = 'notes-over-audio:answered';
  const YOUTUBE = 'youtube:';

  const watchedId = () => (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null);
  const address = (captions) => new URL(captions.url, location.href);

  /**
   * What the player holds for the video in the address: the captions it lists,
   * and its own copies of them. Null while the player is still on another
   * video, which lasts about a second after moving from one to the next.
   */
  const read = () => {
    const id = watchedId();
    const player = document.querySelector('#movie_player');
    const response = player?.getPlayerResponse?.();
    if (!id || response?.videoDetails?.videoId !== id) return null;
    const list = response.captions?.playerCaptionsTracklistRenderer;
    const listed = list?.captionTracks ?? [];
    const held = (player.getAudioTrack?.()?.captionTracks ?? []).filter((each) => address(each).searchParams.get('v') === id);
    return { id, list, listed, held };
  };

  /** The video's captions, each with whether its address carries the token yet. An empty list: the video has none. */
  const whichCaptions = () => {
    const now = read();
    if (!now) return null;
    if (!now.listed.length) return { video: `${YOUTUBE}${now.id}`, captions: [] };
    if (!now.held.length) return null; // the player lists captions and has not made its copies yet
    // The captions the player would switch on by itself, by their short name such as ".en" or "a.en".
    const audio = now.list.audioTracks?.[now.list.defaultAudioTrackIndex ?? 0] ?? now.list.audioTracks?.[0];
    const usual = now.listed[audio?.defaultCaptionTrackIndex]?.vssId;
    return {
      video: `${YOUTUBE}${now.id}`,
      captions: now.held.map((each) => ({
        language: each.languageCode,
        auto: each.kind === 'asr',
        hasToken: address(each).searchParams.has('pot'),
        shownByDefault: !!usual && each.vssId === usual,
      })),
    };
  };

  /** One set of captions, fetched with the player's token. `index` is its place in the list `whichCaptions` gave. */
  const fetchCaptions = async ({ video, index }) => {
    const now = read();
    const wanted = now && `${YOUTUBE}${now.id}` === video ? now.held[index] : null;
    if (!wanted) return null; // the page has moved on
    const from = address(wanted);
    from.searchParams.set('fmt', 'json3');
    from.searchParams.set('c', 'WEB'); // without it the answer is empty, token or no token
    try {
      const response = await fetch(from, { signal: AbortSignal.timeout(20000) });
      return { status: response.status, body: await response.text() };
    } catch (error) {
      return { error: String(error) };
    }
  };

  document.addEventListener(ASKED, async (event) => {
    const { n, type, ...question } = JSON.parse(event.detail);
    let answer = null;
    try {
      answer = type === 'which-captions' ? whichCaptions() : type === 'fetch-captions' ? await fetchCaptions(question) : null;
    } catch (error) {
      answer = type === 'fetch-captions' ? { error: String(error) } : null; // YouTube's player has changed under this file
    }
    document.dispatchEvent(new CustomEvent(ANSWERED, { detail: JSON.stringify({ n, answer }) }));
  });
})();
