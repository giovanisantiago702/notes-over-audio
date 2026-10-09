// The store answers two things: what is kept under a key, and keep these.
// These tests pin what the core may count on. The real store, the extension's
// own local storage, is asked the same two in the real side panel by
// `npm run check:browser`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { standInStore } from './stand-in-store.js';

test('the store gives back what it was given to keep, by key, and nothing for a key it was never given', async () => {
  const store = standInStore();

  await store.set({ formatVersion: 1, 'video:youtube:iG9CE55wbtY': { title: 'A talk', highlights: [] } });

  assert.equal(await store.get('formatVersion'), 1);
  assert.deepEqual(await store.get('video:youtube:iG9CE55wbtY'), { title: 'A talk', highlights: [] });
  assert.equal(await store.get('video:youtube:rddfPNBNAJs'), undefined);
});

test('keeping under some keys leaves what is kept under the others', async () => {
  const store = standInStore();
  await store.set({ one: 1, two: 2 });

  await store.set({ two: 'two' });

  assert.deepEqual(store.everything(), { one: 1, two: 'two' });
});

test('the store keeps a copy: changing what was given, or what it gave back, changes nothing kept', async () => {
  const store = standInStore();
  const given = { highlights: [{ words: 'Good morning.' }] };
  await store.set({ video: given });

  given.highlights.push({ words: 'never saved' });
  (await store.get('video')).highlights.length = 0;

  assert.deepEqual(await store.get('video'), { highlights: [{ words: 'Good morning.' }] });
});
