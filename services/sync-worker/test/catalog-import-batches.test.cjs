'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { catalogImportBodies } = require('../dist/catalog-import-batches.js');

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
