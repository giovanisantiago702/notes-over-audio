// Links to a YouTube video, and to a time in one. The export writes them
// (src/core/markdown.js), and this is the one place that knows what they look like.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { linkToVideo } from '../src/extension/youtube-links.js';

test("a link to a YouTube video is its watch page's address", () => {
  assert.equal(linkToVideo('youtube:iG9CE55wbtY'), 'https://www.youtube.com/watch?v=iG9CE55wbtY');
  // An id may hold a hyphen and an underscore, and both stay as they are.
  assert.equal(linkToVideo('youtube:aqz-KE_bpKQ'), 'https://www.youtube.com/watch?v=aqz-KE_bpKQ');
});

test('a link to a time in it starts the video at the last whole second before that time', () => {
  assert.equal(linkToVideo('youtube:iG9CE55wbtY', 70.27), 'https://www.youtube.com/watch?v=iG9CE55wbtY&t=70s');
  // Never rounded up: the link lands at the Moment or just before it, as the time shown beside it says.
  assert.equal(linkToVideo('youtube:iG9CE55wbtY', 88.999), 'https://www.youtube.com/watch?v=iG9CE55wbtY&t=88s');
  assert.equal(linkToVideo('youtube:iG9CE55wbtY', 3723.5), 'https://www.youtube.com/watch?v=iG9CE55wbtY&t=3723s');
  assert.equal(linkToVideo('youtube:iG9CE55wbtY', 0), 'https://www.youtube.com/watch?v=iG9CE55wbtY&t=0s');
});

test('a video that is not on YouTube has no link here', () => {
  assert.equal(linkToVideo('elsewhere:iG9CE55wbtY', 70), null);
  assert.equal(linkToVideo('youtube:'), null);
});
