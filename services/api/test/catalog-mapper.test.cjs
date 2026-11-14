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

test('maps Riot inventory arrays nested in the live API response', () => {
  const valorant = normalizeProduct({
    item_id: 'synthetic-personal-valorant-001',
    item_origin: 'personal',
    catalog_game_hint: 'valorant',
    price: 1500,
    price_currency: 'RUB',
    riot_valorant_level: 84,
    riot_valorant_skin_count: 31,
    valorantRankTitle: 'Gold 2',
    valorantInventory: {
      WeaponSkins: ['Prime Vandal', 'Reaver Sheriff'],
      Agent: ['Jett', 'Sova'],
      Buddy: ['Exemplo de chaveiro'],
    },
  });
  assert.ok(valorant);
  assert.deepEqual(valorant.attributes.inventory.weapon_skins, ['Prime Vandal', 'Reaver Sheriff']);
  assert.deepEqual(valorant.attributes.inventory.agents, ['Jett', 'Sova']);
  assert.deepEqual(valorant.attributes.inventory.buddies, ['Exemplo de chaveiro']);
  assert.equal(valorant.attributes.inventory.level, 84);
  assert.equal(valorant.attributes.inventory.rank, 'Ouro II');

  const lol = normalizeProduct({
    item_id: 'synthetic-personal-lol-001',
    item_origin: 'personal',
    catalog_game_hint: 'lol',
    price: 900,
    price_currency: 'RUB',
    riot_lol_level: 172,
    riot_lol_skin_count: 65,
    riot_lol_rank: 'Silver II',
    lolInventory: {
      Champion: ['Lux', 'Ahri', 'Jinx'],
      Skin: { 'synthetic-champion-id': 2 },
    },
  });
  assert.ok(lol);
  assert.deepEqual(lol.attributes.inventory.champions, ['Lux', 'Ahri', 'Jinx']);
  assert.equal(lol.attributes.inventory.skins, undefined);
  assert.equal(lol.attributes.inventory.level, 172);
  assert.equal(lol.attributes.inventory.rank, 'Prata II');
});

test('reads Steam games from the nested full-games list returned by LZT', () => {
  const steam = normalizeProduct({
    item_id: 'synthetic-personal-steam-001',
    item_origin: 'personal',
    catalog_game_hint: 'steam',
    price: 1200,
    price_currency: 'RUB',
    steam_level: 25,
    steam_game_count: 3,
    steam_full_games: {
      list: {
        '730': { appid: 730, title: 'Counter-Strike 2', playtime_forever: 600 },
        '570': { appid: 570, title: 'Dota 2', playtime_forever: 120 },
      },
      total: 3,
    },
  });
  assert.ok(steam);
  assert.deepEqual([...steam.attributes.inventory.game_names].sort(), ['Counter-Strike 2', 'Dota 2'].sort());
  assert.equal(steam.attributes.inventory.games.length, 2);
  assert.equal(steam.title.includes(steam.attributes.inventory.game_names[0]), true);
});
