// Links to a YouTube video. The core names a video only by its id, such as
// "youtube:iG9CE55wbtY", and never looks inside it; this is the file that knows
// what YouTube's address for that video is, and for a time in it. The Markdown
// export is given it to make its links with (../core/markdown.js).

/**
 * How the id of a YouTube video starts, as the extension names it. The two
 * page scripts make such ids and cannot import, so each writes this again,
 * and test/build.test.js holds the three together.
 */
export const YOUTUBE = 'youtube:';

/**
 * The address of a YouTube video's watch page, which with a time starts the
 * video there. The time is cut to whole seconds, never rounded up, so the
 * link lands at the time or just before it.
 * @param {string} videoId    The video's id, as the page script names it: "youtube:" and YouTube's own id.
 * @param {number} [seconds]  A time in the video.
 * @returns {string | null}   Null for a video that is not YouTube's.
 */
export function linkToVideo(videoId, seconds) {
  const id = videoId.startsWith(YOUTUBE) ? videoId.slice(YOUTUBE.length) : '';
  if (!id) return null;
  const video = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  return seconds == null ? video : `${video}&t=${Math.max(0, Math.floor(seconds))}s`;
}
