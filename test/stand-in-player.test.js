// The player answers which video, the current time and whether it is playing,
// and it seeks, pauses and plays. These tests pin what the core may count on.
// The real player is asked the same on a watch page by `npm run check:browser`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { standInPlayer } from './stand-in-player.js';

const talk = { id: 'youtube:iG9CE55wbtY', title: 'How to read a transcript', channel: 'Leo Reads' };

test('the player answers the current time in seconds', async () => {
  const player = standInPlayer({ video: talk, currentTime: 12.5 });

  assert.equal(await player.currentTime(), 12.5);
});

test('seeking to a time moves the current time there', async () => {
  const player = standInPlayer({ video: talk, currentTime: 12.5 });

  await player.seekTo(90);

  assert.equal(await player.currentTime(), 90);
});

test('on a page with no video the player names none, has no current time, and seeking changes nothing', async () => {
  const player = standInPlayer({ video: talk, currentTime: 12.5 });

  player.goTo(null);
  await player.seekTo(90);

  assert.equal(await player.video(), null);
  assert.equal(await player.currentTime(), null);
});

test('while an advert plays the player still names the video, cannot say the current time, and ignores a seek', async () => {
  const player = standInPlayer({ video: talk, currentTime: 12.5 });

  player.advert(true);
  await player.seekTo(90);

  assert.deepEqual(await player.video(), talk);
  assert.equal(await player.currentTime(), null);

  player.advert(false);

  assert.equal(await player.currentTime(), 12.5);
});

test('the player says whether the video is playing, and pauses it and plays it again where it stopped', async () => {
  const player = standInPlayer({ video: talk, currentTime: 12.5 });
  assert.equal(await player.playing(), true);

  await player.pause();
  assert.equal(await player.playing(), false);
  assert.equal(await player.currentTime(), 12.5);

  await player.play();
  assert.equal(await player.playing(), true);
});

test('on a page with no video nothing is playing, and while an advert plays the video is not: it can be neither paused nor played', async () => {
  const player = standInPlayer({ video: talk, currentTime: 12.5 });

  player.advert(true);
  assert.equal(await player.playing(), false);
  await player.pause();
  player.advert(false);
  assert.equal(await player.playing(), true, 'the pause during the advert was ignored');

  await player.pause();
  player.advert(true);
  await player.play();
  player.advert(false);
  assert.equal(await player.playing(), false, 'and so was the play');

  player.goTo(null);
  assert.equal(await player.playing(), false);
});
