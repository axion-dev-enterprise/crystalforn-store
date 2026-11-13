'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { catalogImportBodies } = require('../dist/catalog-import-batches.js');
const { planLztCursorTransition } = require('../dist/catalog-pagination.js');
const { readLztCheckpoint } = require('../dist/catalog-checkpoint.js');

const cursorHash = (cursor) => createHash('sha256').update(cursor).digest('hex');

test('returns no import request for an empty catalog page', () => {
  assert.deepEqual(catalogImportBodies([], 1024), []);
});

test('preserves order and splits batches at the 500 item limit', () => {
  const items = Array.from({ length: 501 }, (_, index) => ({ item_id: `demo-${index}` }));
  const bodies = catalogImportBodies(items, 1_000_000);
  const decoded = bodies.map((body) => JSON.parse(body));

  assert.deepEqual(decoded.map(({ items: batch }) => batch.length), [500, 1]);
  assert.deepEqual(decoded.flatMap(({ items: batch }) => batch), items);
});

test('splits by UTF-8 byte size and keeps every request within the configured limit', () => {
  const items = [{ title: 'conta fictícia — skin rara' }, { title: 'jogador fictício — nível alto' }];
  const maxBytes = Math.max(...items.map((item) => Buffer.byteLength(JSON.stringify({ items: [item] }))));
  const bodies = catalogImportBodies(items, maxBytes);

  assert.equal(bodies.length, 2);
  assert.ok(bodies.every((body) => Buffer.byteLength(body) <= maxBytes));
  assert.deepEqual(bodies.flatMap((body) => JSON.parse(body).items), items);
});

test('rejects a single item that exceeds the request byte limit', () => {
  const item = { title: 'fixture oversized' };
  const maxBytes = Buffer.byteLength(JSON.stringify({ items: [item] })) - 1;

  assert.throws(
    () => catalogImportBodies([item], maxBytes),
    { message: 'catalog_item_exceeds_import_request_limit' },
  );
});

test('rejects values that JSON cannot serialize as an item', () => {
  assert.throws(
    () => catalogImportBodies([undefined], 1024),
    { message: 'catalog_item_not_serializable' },
  );
});

test('marks a page complete without requiring a next cursor', () => {
  assert.deepEqual(planLztCursorTransition(false, undefined, 'cursor-a', [], 10), { kind: 'complete' });
});

test('requires a non-empty bounded cursor when another page exists', () => {
  assert.deepEqual(planLztCursorTransition(true, '  ', null, [], 10), {
    kind: 'error',
    errorCode: 'pagination_cursor_missing',
  });
  assert.deepEqual(planLztCursorTransition(true, 'x'.repeat(4097), null, [], 10), {
    kind: 'error',
    errorCode: 'pagination_cursor_missing',
  });
});

test('rejects an immediate cursor loop', () => {
  assert.deepEqual(planLztCursorTransition(true, 'cursor-a', 'cursor-a', [], 10), {
    kind: 'error',
    errorCode: 'pagination_repeated_cursor',
  });
});

test('rejects a cursor seen earlier in the scan', () => {
  const firstTransition = planLztCursorTransition(true, 'cursor-a', null, [], 10);
  assert.equal(firstTransition.kind, 'continue');
  if (firstTransition.kind !== 'continue') return;

  const secondTransition = planLztCursorTransition(true, 'cursor-b', firstTransition.nextCursor, firstTransition.cursorHashes, 10);
  assert.equal(secondTransition.kind, 'continue');
  if (secondTransition.kind !== 'continue') return;

  assert.deepEqual(
    planLztCursorTransition(true, 'cursor-a', secondTransition.nextCursor, secondTransition.cursorHashes, 10),
    { kind: 'error', errorCode: 'pagination_repeated_cursor' },
  );
});

test('bounds persisted cursor history to the configured scan window', () => {
  const first = planLztCursorTransition(true, 'cursor-a', null, [], 2);
  assert.equal(first.kind, 'continue');
  if (first.kind !== 'continue') return;
  const second = planLztCursorTransition(true, 'cursor-b', first.nextCursor, first.cursorHashes, 2);
  assert.equal(second.kind, 'continue');
  if (second.kind !== 'continue') return;
  const third = planLztCursorTransition(true, 'cursor-c', second.nextCursor, second.cursorHashes, 2);
  assert.equal(third.kind, 'continue');
  if (third.kind !== 'continue') return;

  assert.equal(third.cursorHashes.length, 2);
  assert.deepEqual(third.cursorHashes, [cursorHash('cursor-a'), cursorHash('cursor-b')]);
  assert.deepEqual(
    planLztCursorTransition(true, 'cursor-a', third.nextCursor, third.cursorHashes, 2),
    { kind: 'error', errorCode: 'pagination_repeated_cursor' },
  );

  const fourth = planLztCursorTransition(true, 'cursor-d', third.nextCursor, third.cursorHashes, 2);
  assert.equal(fourth.kind, 'continue');
  if (fourth.kind !== 'continue') return;
  assert.deepEqual(fourth.cursorHashes, [cursorHash('cursor-b'), cursorHash('cursor-c')]);
});

test('restores a valid checkpoint and trims histories to the page limit', () => {
  const fingerprints = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
  assert.deepEqual(readLztCheckpoint({
    nextPage: 8,
    nextCursor: 'opaque-demo-cursor',
    cursorHashes: fingerprints,
    itemsSeen: 1200,
    pageFingerprints: fingerprints,
  }, 2), {
    nextPage: 8,
    nextCursor: 'opaque-demo-cursor',
    cursorHashes: fingerprints.slice(-2),
    itemsSeen: 1200,
    pageFingerprints: fingerprints.slice(-2),
    hasSavedPage: true,
  });
});

test('resets malformed checkpoints before they can resume from an invalid cursor', () => {
  assert.deepEqual(readLztCheckpoint({
    nextPage: 3,
    nextCursor: '',
    cursorHashes: ['not-a-hash'],
    itemsSeen: 99,
    pageFingerprints: ['also-invalid'],
  }, 10), {
    nextPage: 1,
    nextCursor: null,
    cursorHashes: [],
    itemsSeen: 0,
    pageFingerprints: [],
    hasSavedPage: true,
  });
});

test('ignores non-object checkpoint values and invalid item counts', () => {
  assert.deepEqual(readLztCheckpoint('invalid fixture', 10), {
    nextPage: 1,
    nextCursor: null,
    cursorHashes: [],
    itemsSeen: 0,
    pageFingerprints: [],
    hasSavedPage: false,
  });
  assert.equal(readLztCheckpoint({ nextPage: 2, nextCursor: 'cursor', itemsSeen: -1 }, 10).itemsSeen, 0);
});
