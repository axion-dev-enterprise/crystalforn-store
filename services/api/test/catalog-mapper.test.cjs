const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeProduct } = require('../dist/src/modules/catalog/catalog.mapper.js');

test('normalizes the personal-origin Fortnite fields observed in the LZT API', () => {
  const listing = {
    item_id: 'synthetic-personal-fortnite-001',
    item_origin: 'personal',
    item_state: 'active',
    title: 'Conta Fortnite com título de origem em cirílico',
    price: 1250,
    price_currency: 'RUB',
    epicgames_fortnite_skin_count: 15,
    epicgames_fortnite_pickaxe_count: 14,
    epicgames_fortnite_dance_count: 3,
    epicgames_fortnite_glider_count: 2,
    epicgames_fortnite_balance: 500,
    epicgames_fortnite_level: 42,
    fortniteSkins: [
      { title: 'Travis Scott', rarity: 'mythic' },
      { title: 'Exemplo de coleção', rarity: 'epic' },
    ],
    fortnitePickaxe: [{ title: 'Picareta de exemplo', rarity: 'legendary' }],
    fortniteDance: [{ title: 'Emote de exemplo', rarity: 'rare' }],
    fortniteGliders: [{ title: 'Asa-delta de exemplo', rarity: 'epic' }],
  };

  const product = normalizeProduct(listing);
  assert.ok(product);
  assert.equal(product.game, 'fortnite');
  assert.equal(product.title.includes('Travis Scott'), true);
  assert.equal(/[\u0400-\u04FF]/.test(product.title), false);
  assert.deepEqual(product.attributes.inventory.featured_skins, listing.fortniteSkins);
  assert.deepEqual(product.attributes.inventory.featured_pickaxes, listing.fortnitePickaxe);
  assert.deepEqual(product.attributes.inventory.featured_dances, listing.fortniteDance);
  assert.deepEqual(product.attributes.inventory.featured_gliders, listing.fortniteGliders);
  assert.equal(product.attributes.inventory.skins_count, 15);
  assert.equal(product.attributes.inventory.pickaxes_count, 14);
  assert.equal(product.attributes.inventory.dances_count, 3);
  assert.equal(product.attributes.inventory.gliders_count, 2);
  assert.equal(product.attributes.inventory.level, 42);
  assert.equal(product.attributes.inventory.vbucks_balance, 500);
});

test('rejects LZT listings outside the personal origin before catalog mapping', () => {
  assert.equal(normalizeProduct({
    item_id: 'synthetic-ineligible-001',
    item_origin: 'stealer',
    price: 100,
    price_currency: 'RUB',
    title: 'Fortnite',
  }), null);
});
