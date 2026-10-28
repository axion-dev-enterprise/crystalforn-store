'use strict';

const { performance } = require('node:perf_hooks');
const { catalogImportBodies } = require('../services/sync-worker/dist/catalog-import-batches.js');

const MAX_BODY_BYTES = 1_500_000;
const DEFAULT_COUNTS = [20_000, 40_000];
const MIB = 1024 * 1024;

function syntheticProduct(index) {
  return {
    item_id: `synthetic-${String(index).padStart(6, '0')}`,
    seller_id: `seller-${index % 1_200}`,
    catalog_game_hint: ['fortnite', 'steam', 'roblox', 'valorant', 'lol'][index % 5],
    title: `Synthetic listing ${index} · inventory sample`,
    price: 12.34 + (index % 900) / 100,
    currency: 'USD',
    attributes: {
      inventory: {
        level: 1 + index % 300,
        skins_count: index % 450,
        featured_skins: Array.from({ length: 8 }, (_, item) => ({
          name: `Synthetic cosmetic ${index}-${item}`,
          rarity: ['common', 'rare', 'epic', 'legendary'][item % 4],
        })),
        games: Array.from({ length: 10 }, (_, item) => ({
          title: `Synthetic game ${index}-${item}`,
          playtime_forever: (index + item) % 40_000,
        })),
      },
      fixture_marker: 'synthetic-only-no-provider-data',
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(count) {
  if (typeof global.gc === 'function') global.gc();
  const rssStart = process.memoryUsage().rss;
  const heapStart = process.memoryUsage().heapUsed;
  const fixtureStart = performance.now();
  const items = Array.from({ length: count }, (_, index) => syntheticProduct(index + 1));
  const fixtureMs = performance.now() - fixtureStart;
  const rssAfterFixture = process.memoryUsage().rss;

  const batchStart = performance.now();
  const bodies = catalogImportBodies(items, MAX_BODY_BYTES);
  const batchMs = performance.now() - batchStart;
  const validationStart = performance.now();
  let counted = 0;
  let serializedBytes = 0;
  let largestBodyBytes = 0;
  let largestBatchItems = 0;
  for (const body of bodies) {
    const bytes = Buffer.byteLength(body);
    assert(bytes <= MAX_BODY_BYTES, `batch_exceeds_byte_limit:${bytes}`);
    const batchItems = JSON.parse(body).items;
    assert(batchItems.length <= 500, `batch_exceeds_item_limit:${batchItems.length}`);
    counted += batchItems.length;
    serializedBytes += bytes;
    largestBodyBytes = Math.max(largestBodyBytes, bytes);
    largestBatchItems = Math.max(largestBatchItems, batchItems.length);
  }
  const rssAfterBatching = process.memoryUsage().rss;
  const heapAfter = process.memoryUsage().heapUsed;
  const validationMs = performance.now() - validationStart;
  assert(counted === count, `record_count_mismatch:${counted}:${count}`);
  const durationMs = fixtureMs + batchMs + validationMs;

  console.log(JSON.stringify({
    records: count,
    batches: bodies.length,
    durationMs: Number(durationMs.toFixed(1)),
    fixtureMs: Number(fixtureMs.toFixed(1)),
    batchingMs: Number(batchMs.toFixed(1)),
    validationMs: Number(validationMs.toFixed(1)),
    recordsPerSecond: Math.round(count / (durationMs / 1000)),
    serializedMiB: Number((serializedBytes / MIB).toFixed(2)),
    largestBodyMiB: Number((largestBodyBytes / MIB).toFixed(2)),
    largestBatchItems,
    rssStartMiB: Number((rssStart / MIB).toFixed(1)),
    rssAfterFixtureMiB: Number((rssAfterFixture / MIB).toFixed(1)),
    rssAfterBatchingMiB: Number((rssAfterBatching / MIB).toFixed(1)),
    heapDeltaMiB: Number(((heapAfter - heapStart) / MIB).toFixed(1)),
    scope: 'synthetic serialization and batch limits only; no LZT, database, network, or supplier throughput',
  }));
}

const countArgument = process.argv.find((argument) => argument.startsWith('--count='));
const counts = countArgument ? [Number(countArgument.slice('--count='.length))] : DEFAULT_COUNTS;
for (const count of counts) {
  assert(Number.isSafeInteger(count) && count > 0, `invalid_record_count:${count}`);
  run(count);
}
