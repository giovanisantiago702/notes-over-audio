// Following playback, on the panel's page: the tint on the line being spoken,
// the scrolling that holds that line at a fixed height, "back to now", and the
// click on a line that jumps the video there. Which sentence is being spoken,
// and whether the panel is following, are decided in the core
// (../core/following.js). This file puts that on the page and tells the core
// what the user did.
//
// It works on whole lines. What is inside a line, its words and the Highlights
// on them, belongs to others; nothing here changes it.

import { createFollowing } from '../core/following.js';

// The top of the line being spoken is held this far down the panel, as a share
// of the panel's height: a little below the middle, so that more of what was
// just said is in view than of what comes next.
const HELD_AT = 0.58;

// How often the player is asked the time. The question goes from the panel
// straight to the page (tab-player.js); the background worker never hears it.
const ASK_EVERY_MS = 250;

/**
 * @param {object} given
 * @param {import('../core/panel.js').Player} given.player
 * @param {HTMLElement} given.transcript  Where the lines are: the `.sentence` elements, one per sentence, in order.
 * @param {HTMLElement} given.backToNow   The control that resumes the following. Shown only while the following is stopped.
 * @returns {{ transcriptShown: (transcript: object | null) => void, jumpToTime: (seconds: number) => Promise<void>, linesMoved: () => void }}
 *   Call `transcriptShown` with what the panel has where the Transcript goes, every time the panel is shown anything.
 */
export function followPlayback({ player, transcript, backToNow }) {
  const lines = transcript.getElementsByClassName('sentence'); // live: always the lines on the page now
  let shown = { spoken: -1, following: true };

  // The tint is a class on the line's own element.
  let tinted = null;
  const tintSpokenLine = () => {
    const line = lines[shown.spoken] ?? null;
    if (line === tinted) return;
    tinted?.classList.remove('spoken');
    line?.classList.add('spoken');
    tinted = line;
  };

  // The panel's own scrolling, as the stretch of the page it covers: from where
  // it was to where the line is held. A scroll event inside that stretch is
  // the panel's doing. Anywhere else, the user scrolled.
  let from = 0;
  let to = 0;
  const NEAR = 2; // px
  const holdSpokenLine = () => {
    const line = lines[shown.spoken];
    const lowest = document.documentElement.scrollHeight - innerHeight;
    const top = line ? Math.max(0, Math.min(lowest, line.getBoundingClientRect().top + scrollY - innerHeight * HELD_AT)) : 0;
    [from, to] = [scrollY, top];
    // From one line to the next the page glides. A long way, it goes at once.
    scrollTo({ top, behavior: Math.abs(top - scrollY) > innerHeight ? 'instant' : 'smooth' });
  };

  const following = createFollowing({
    player,
    show(followed) {
      shown = followed;
      tintSpokenLine();
      backToNow.hidden = followed.following;
      if (followed.following) holdSpokenLine();
    },
  });

  addEventListener(
    'scroll',
    () => {
      if (scrollY < Math.min(from, to) - NEAR || scrollY > Math.max(from, to) + NEAR) following.scrolledByHand();
      else if (Math.abs(scrollY - to) <= NEAR) from = to; // arrived: from here on, any other place is the user's doing
    },
    { passive: true }
  );
  // The wheel and a finger are the user's whatever the page is doing.
  addEventListener('wheel', () => following.scrolledByHand(), { passive: true });
  addEventListener('touchmove', () => following.scrolledByHand(), { passive: true });
  backToNow.addEventListener('click', () => following.backToNow());

  // A click on a line jumps the video to the start of its sentence. Two things
  // that end with a click on a line are not that: letting go after selecting
  // words, and a click on a Highlight, which is the Highlight's own. Whether
  // the mouse-up ended a selection is read here, first of all, because whoever
  // makes the Highlight may clear the selection before the click arrives.
  let endedSelection = false;
  addEventListener('mouseup', () => (endedSelection = !getSelection().isCollapsed), true);
  transcript.addEventListener('click', (event) => {
    if (endedSelection || event.target.closest('mark[data-highlight]')) return;
    const line = event.target.closest('.sentence');
    if (line) following.jumpTo(Array.prototype.indexOf.call(lines, line));
  });

  // Asked again only once the last answer is in, so a slow page is never asked twice at once.
  const keepUp = async () => {
    await following.catchUp().catch(() => {});
    tintSpokenLine(); // again, in case the lines were built anew under the same Transcript
    setTimeout(keepUp, ASK_EVERY_MS);
  };
  keepUp();

  return {
    transcriptShown: (onShow) => following.transcriptShown(onShow),
    /** Moves the video to a time, in seconds, as a click on a Note's time asks. The following resumes. */
    jumpToTime: (seconds) => following.jumpToTime(seconds),
    /**
     * Something was put between the lines or taken from there, a Note say, so
     * the lines below it have moved. While the panel is following, the line
     * being spoken is held again where it belongs, and where the page goes
     * for that is the panel's own scrolling, not the user's.
     */
    linesMoved() {
      if (shown.following) holdSpokenLine();
    },
  };
}
