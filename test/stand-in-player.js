// A player for the core's tests: it answers what the real one answers, from
// memory. See the Player typedef in src/core/panel.js.

export function standInPlayer({ video = null, currentTime = 0 } = {}) {
  let advert = false;
  let playing = true; // a video plays until it is paused
  const onVideo = () => !!video && !advert;
  return {
    video: async () => video,
    currentTime: async () => (onVideo() ? currentTime : null),
    seekTo: async (seconds) => {
      if (onVideo()) currentTime = seconds;
    },
    playing: async () => onVideo() && playing,
    pause: async () => {
      if (onVideo()) playing = false;
    },
    play: async () => {
      if (onVideo()) playing = true;
    },

    // What a test does to it, as a person would to the tab.
    /** Move the tab to another video, or to a page with none (null). */
    goTo(next) {
      video = next;
    },
    /** Let the video play on to a time, or seek there in the player itself. */
    playTo(seconds) {
      currentTime = seconds;
    },
    /** An advert starts (true) or ends (false). While one plays the real player cannot say the time, and ignores a seek, a pause and a play. */
    advert(playing) {
      advert = playing;
    },
  };
}
