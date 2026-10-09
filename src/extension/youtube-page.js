// The YouTube half of the player. Chrome runs this in every www.youtube.com
// page, and it is the file that knows YouTube's page: its addresses, its
// markup, its video element. It answers what the panel's half asks
// (tab-player.js): which video, the time, whether it is playing, and to seek,
// pause or play. It says when the page's video changes, and passes on the two
// questions about the video's captions (youtube-captions.js asks them,
// youtube-player.js answers them). It passes on the panel's keys pressed with
// the keyboard in this page, and while a Note is being written it hands the
// typing to the panel and keeps it from YouTube.
//
// Chrome loads it as a plain script, not a module, so it cannot import. Keep
// it to reading the page; anything worth a test belongs in a module. What it
// does with keys, and what it says and when, is tested by running this file
// itself in a stand-in for the page (test/stand-in-page.js).

(() => {
  // Four things here are written again in youtube-player.js, because neither
  // script can import: how the watched video's id is read, how a video's id
  // starts, and the two events the scripts talk by. The start of an id is
  // also in youtube-links.js. test/build.test.js holds the copies together.

  /** The id in the address on a watch page, and null on any other page. */
  const watchedId = () => (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null);
  // A video's id, as the extension names it, is this and then YouTube's own id.
  const YOUTUBE = 'youtube:';

  // YouTube describes a watch page's video in a block of JSON. The block names
  // the video it describes, which matters: for about a second after moving to
  // another video, the page still holds the block of the one before.
  let descriptionText = null;
  let description = null;
  const describedVideo = () => {
    const text = document.querySelector('#microformat script[type="application/ld+json"]')?.textContent ?? null;
    if (text !== descriptionText) {
      descriptionText = text;
      try {
        description = JSON.parse(text);
      } catch {
        description = null;
      }
    }
    return description;
  };
  const describes = (described, id) => {
    try {
      return new URL(described['@id']).searchParams.get('v') === id;
    } catch {
      return false;
    }
  };

  /** Which video the page is on, or null. Title and channel are empty until the page describes this video. */
  const whichVideo = () => {
    const id = watchedId();
    if (!id) return null;
    const described = describedVideo();
    const known = !!described && describes(described, id);
    const author = known ? described.author : '';
    return {
      id: `${YOUTUBE}${id}`,
      title: known ? String(described.name ?? '') : '',
      channel: String((typeof author === 'object' ? author?.name : author) ?? ''),
    };
  };

  // YouTube plays its adverts in the video's own element, so while one plays
  // the element's time is the advert's, and there is no answer to give.
  const advertPlaying = () => !!document.querySelector('.html5-video-player.ad-showing');
  const videoElement = () => {
    if (!watchedId() || advertPlaying()) return null;
    return document.querySelector('video.html5-main-video');
  };

  // The video's captions are held by YouTube's player, on objects only a
  // script in the page's own world can see. youtube-player.js is that script.
  // It has no chrome.*, so a question goes to it as an event on the document
  // and its answer comes back as another, both carrying text.
  const ASKED = 'notes-over-audio:asked';
  const ANSWERED = 'notes-over-audio:answered';
  const waiting = new Map();
  let asked = 0;
  document.addEventListener(ANSWERED, (event) => {
    const { n, answer } = JSON.parse(event.detail);
    waiting.get(n)?.(answer);
  });
  const askPlayer = (question) =>
    new Promise((resolve) => {
      const n = (asked += 1);
      // No answer at all means that script is not there; it gives up on YouTube after 20 s by itself.
      const givenUp = setTimeout(() => waiting.get(n)?.(null), 30000);
      waiting.set(n, (answer) => {
        clearTimeout(givenUp);
        waiting.delete(n);
        resolve(answer);
      });
      document.dispatchEvent(new CustomEvent(ASKED, { detail: JSON.stringify({ ...question, n }) }));
    });

  chrome.runtime.onMessage.addListener((message, _sender, answer) => {
    if (message.type === 'which-video') {
      answer(whichVideo());
    } else if (message.type === 'current-time') {
      answer(videoElement()?.currentTime ?? null);
    } else if (message.type === 'seek-to') {
      const element = videoElement();
      if (element) element.currentTime = message.seconds;
      answer(null);
    } else if (message.type === 'is-playing') {
      // Whether the video itself is playing. During an advert it is not: the advert is.
      const element = videoElement();
      answer(!!element && !element.paused && !element.ended);
    } else if (message.type === 'pause') {
      videoElement()?.pause();
      answer(null);
    } else if (message.type === 'play') {
      // The browser may refuse to play, and says so through a promise; nothing here can do more about it.
      videoElement()?.play()?.catch(() => {});
      answer(null);
    } else if (message.type === 'which-captions') {
      // Which captions the video has, and whether the player's token has
      // arrived for them. Null while the player has not caught up with the address.
      askPlayer(message).then((captions) => answer(captions && { ...captions, advert: advertPlaying() }));
      return true; // the answer comes later
    } else if (message.type === 'fetch-captions') {
      // One set of captions as YouTube sends it: { status, body }.
      askPlayer(message).then(answer);
      return true;
    }
  });

  // The panel's keys, pressed with keyboard focus in this page. What a key
  // does is decided in the core, which runs in the panel's page, so the key is
  // passed on to it; with no panel open beside this tab, nothing takes it up.
  // The key itself is left alone: nothing here stops it, and YouTube gets it
  // as it would have. The list is the core's (`keys` in ../core/panel.js),
  // written again because this script cannot import.
  const KEYS = ['h', 'n', 'u'];
  // A key typed into a text field, such as YouTube's search box or a comment, is the text's.
  const typingIn = (element) => !!element?.isContentEditable || !!element?.closest?.('input, textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"]');

  // Typing a Note. N opens the Note's box in the panel, but the keyboard stays
  // here, in the page, and nothing an extension can do moves it. So while a
  // Note is being written the keys that type are handed to the panel, which
  // types them into the box, and they are kept from YouTube, where K, M, F and
  // the space bar are keys of its own.
  //
  // A key has to be kept at the moment it is pressed, with no time to ask
  // anyone, so this script must already know that a Note is being written. It
  // knows it by one thing: the panel holds a connection open to it for exactly
  // that long (panel-typing.js). The panel closes it when the Note's box
  // shuts, and Chrome closes it when the panel goes, however it goes. With no
  // connection, and with one that turns out to be gone, a key is the page's
  // own: a key is only ever kept when the panel has just been handed it.
  const WRITING = 'writing-a-note';
  let writing = null; // the panel's connection, for as long as a Note is being written
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== WRITING) return;
    writing = port;
    port.onDisconnect.addListener(() => {
      if (writing === port) writing = null;
    });
  });
  // The keys that do something to a Note being written: one that types a
  // character, whose name is that character, and these three. Every other key
  // is left alone, an arrow say, or one that only starts an accent. The list
  // is the core's (TYPING_KEYS in ../core/typing.js), written again as KEYS is.
  const TYPING_KEYS = ['Backspace', 'Enter', 'Escape'];
  const types = (event) => !event.isComposing && ([...String(event.key)].length === 1 || TYPING_KEYS.includes(event.key));
  /** Hands a key to the panel. False when the panel does not have it: the connection turned out to be gone. */
  const handOver = (event) => {
    try {
      writing.postMessage({ key: event.key, shift: event.shiftKey });
      return true;
    } catch {
      writing = null;
      return false;
    }
  };
  /** Keeps a key from YouTube, and from doing what it does by itself in the page, such as pressing the button that has focus. */
  const keep = (event) => {
    event.preventDefault();
    // Not only its way onward: YouTube may listen at this same stop, and this script was here first.
    event.stopImmediatePropagation();
  };
  // The keys handed over and not let go yet, by their place on the keyboard.
  // YouTube acts on some keys as they come up, the space bar for one, so a key
  // that was kept on its way down is kept on its way up, even when the Note
  // has ended in between, as it has for the Enter that saved it. And a key
  // that went down before the Note began, the N that opened it, is not in
  // here: it is YouTube's all the way, and is not typed however long it is held.
  const down = new Set();
  const placeOf = (event) => event.code || event.key;
  window.addEventListener('keyup', (event) => down.delete(placeOf(event)) && keep(event), true);
  // When the keyboard leaves the page, a key that is down comes up somewhere else.
  window.addEventListener('blur', () => down.clear());

  window.addEventListener(
    'keydown',
    (event) => {
      // With Ctrl, Alt or Command a key is another key, and none of this script's.
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (typingIn(event.composedPath()[0])) return;
      if (writing && types(event) && (!event.repeat || down.has(placeOf(event))) && handOver(event)) {
        down.add(placeOf(event));
        return keep(event);
      }
      const key = String(event.key).toLowerCase();
      // A key held down counts once.
      if (!KEYS.includes(key) || event.repeat || !watchedId()) return;
      try {
        chrome.runtime.sendMessage({ type: 'key-pressed', key }).catch(() => {});
      } catch {
        // the extension was reloaded under this page
      }
    },
    true // heard on the way down, before anything in the page can keep it from being heard
  );

  // YouTube moves between videos without loading a new page, so the page is
  // read four times a second and the extension is told whenever the answer
  // differs: a new video, its title arriving, or no video any more.
  //
  // Chrome runs this script once for every load of the page, a reload
  // included, so the first thing it says is said by a page loaded afresh, and
  // it says so: `loaded: true`. Nothing it says later carries that, whatever
  // the reason it names the same video again. A panel that stayed open through
  // the load takes it as its cue to try a failed Transcript again.
  let told;
  const tellIfChanged = () => {
    const video = whichVideo();
    const text = JSON.stringify(video);
    if (text === told) return;
    const loaded = told === undefined;
    told = text;
    try {
      chrome.runtime.sendMessage({ type: 'video-changed', video, ...(loaded && { loaded }) }).catch(() => {});
    } catch {
      clearInterval(reading); // the extension was reloaded under this page
    }
  };
  const reading = setInterval(tellIfChanged, 250);
  tellIfChanged();
})();
