'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { catalogImportBodies } = require('../dist/catalog-import-batches.js');
const { planLztCursorTransition } = require('../dist/catalog-pagination.js');
const { readLztCheckpoint } = require('../dist/catalog-checkpoint.js');
const { inspectCatalogPageProgress } = require('../dist/catalog-page-progress.js');
const { validateLztPagePayload } = require('../dist/lzt-page-contract.js');
const { providerRetryDelayMs } = require('../dist/provider-retry.js');

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

test('detects the same page even when item order changes', () => {
  const firstPage = inspectCatalogPageProgress([{ item_id: 'demo-a' }, { item_id: 'demo-b' }], 1, new Set(), []);
  assert.ok(firstPage.fingerprint);

  const reorderedPage = inspectCatalogPageProgress(
    [{ item_id: 'demo-b' }, { item_id: 'demo-a' }],
    2,
    new Set(firstPage.pageIds),
    [firstPage.fingerprint],
  );
  assert.equal(reorderedPage.repeatedPage, true);
  assert.equal(reorderedPage.stalled, true);
});

test('allows a page with overlapping records when at least one new item advances the scan', () => {
  const progress = inspectCatalogPageProgress(
    [{ item_id: 'demo-a' }, { item_id: 'demo-b' }, { item_id: 'demo-c' }],
    2,
    new Set(['demo-a', 'demo-b']),
    [],
  );
  assert.deepEqual(progress.newIds, ['demo-c']);
  assert.equal(progress.stalled, false);
});

test('marks a later page without usable or new item IDs as stalled', () => {
  assert.equal(inspectCatalogPageProgress([{}, null], 1, new Set(), []).stalled, false);
  const progress = inspectCatalogPageProgress([{}, { item_id: ' demo-a ' }], 3, new Set(['demo-a']), []);
  assert.equal(progress.fingerprint, cursorHash('demo-a'));
  assert.equal(progress.stalled, true);
});

test('accepts cursor continuation when the provider page counter stays at one', () => {
  assert.equal(validateLztPagePayload({
    items: [{ item_id: 'demo-a' }],
    totalItems: 120,
    hasNextPage: true,
    nextCursor: 'opaque-fixture-cursor',
    perPage: 40,
    page: 1,
  }, 1), null);
  assert.equal(validateLztPagePayload({
    items: [{ item_id: 'demo-b' }],
    totalItems: 120,
    hasNextPage: true,
    nextCursor: 'opaque-fixture-cursor-2',
    perPage: 40,
    page: 1,
  }, 2), null);
  assert.equal(validateLztPagePayload({ items: [], totalItems: 120, hasNextPage: false, page: 3 }, 3), null);
});

test('rejects category payloads with missing or malformed pagination metadata', () => {
  const invalidPayloads = [
    null,
    [],
    { items: [], totalItems: 3, hasNextPage: 'true' },
    { items: [], totalItems: 3, hasNextPage: true },
    { items: [], totalItems: 3, hasNextPage: true, nextCursor: ' '.repeat(2) },
    { items: [], totalItems: 3, hasNextPage: true, nextCursor: 'x'.repeat(4097) },
    { items: [], totalItems: 3, hasNextPage: true, nextCursor: 'cursor', page: 2 },
    { items: [], totalItems: 3, hasNextPage: false, page: 0 },
    { items: [], totalItems: -1, hasNextPage: false },
    { items: [], totalItems: 3, perPage: 0 },
    { items: [], nextCursor: 'cursor' },
    { totalItems: 3, hasNextPage: false },
  ];

  for (const payload of invalidPayloads) {
    assert.equal(validateLztPagePayload(payload, 1), 'invalid_contract');
  }
});

test('requires explicit continuation state after resuming beyond the first page', () => {
  assert.equal(validateLztPagePayload({ items: [], totalItems: 10 }, 2), 'invalid_contract');
  assert.equal(validateLztPagePayload({ items: [], totalItems: 10, hasNextPage: false }, 2), null);
});

test('honors numeric and HTTP-date Retry-After values without going below the local interval', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  assert.equal(providerRetryDelayMs('5', 30_000, now), 30_000);
  assert.equal(providerRetryDelayMs('120', 30_000, now), 120_000);
  assert.equal(providerRetryDelayMs(new Date(now + 90_000).toUTCString(), 30_000, now), 90_000);
});

test('uses a safe backoff for missing, malformed, expired, and excessively large Retry-After values', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  const fallback = 60_000;
  assert.equal(providerRetryDelayMs(null, 30_000, now), fallback);
  assert.equal(providerRetryDelayMs('not-a-date', 30_000, now), fallback);
  assert.equal(providerRetryDelayMs(new Date(now - 1000).toUTCString(), 30_000, now), fallback);
  assert.equal(providerRetryDelayMs('999999999999', 30_000, now), 2_147_483_647);
});
