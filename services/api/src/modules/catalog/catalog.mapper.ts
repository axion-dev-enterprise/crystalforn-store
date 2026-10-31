export const STORE_CATALOG_GAMES = ['fortnite', 'valorant', 'lol', 'roblox', 'steam'] as const;
export type StoreCatalogGame = typeof STORE_CATALOG_GAMES[number];
export type Game = StoreCatalogGame | 'lol' | 'other';
export interface NormalizedProduct {
  itemId: string;
  sellerId: string | null;
  game: Game;
  sourceTitle: string | null;
  title: string;
  sourcePrice: number;
  currency: 'USD' | 'RUB' | 'BRL';
  status: 'available' | 'invalid' | 'banned' | 'sold';
  daysOffline: number | null;
  attributes: Record<string, unknown>;
}
const rarityLabelsPtBr: Record<string, string> = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Rara', epic: 'Épica',
  legendary: 'Lendária', mythic: 'Mítica', icon: 'Série Ícones',
};
function translateRarity(value: string): string { return rarityLabelsPtBr[value.toLowerCase()] ?? value; }

function isPrivateKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'emailtype') return false;
  return ['password', 'credential', 'secret', 'token', 'auth', 'apikey', 'authorization', 'refresh', 'session', 'cookie', 'privatekey', 'recoverycode', 'backupcode', 'otp', 'twofactor', '2fa']
    .some((term) => normalized.includes(term))
    || normalized.includes('email')
    || normalized.includes('login');
}
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isPrivateKey(key))
      .map(([key, child]) => [key, clean(child)]));
  }
  if (typeof value === 'string') return value.slice(0, 500);
  return value;
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : null; }
function numeric(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}
function booleanFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || (typeof value === 'string' && ['yes', 'true', '1'].includes(value.trim().toLowerCase()))) return true;
  if (value === 0 || (typeof value === 'string' && ['no', 'false', '0'].includes(value.trim().toLowerCase()))) return false;
  return null;
}
function valorantRankLabel(value: unknown): string | null {
  const rank = numeric(value);
  const labels = ['Ferro I', 'Ferro II', 'Ferro III', 'Bronze I', 'Bronze II', 'Bronze III', 'Prata I', 'Prata II', 'Prata III', 'Ouro I', 'Ouro II', 'Ouro III', 'Platina I', 'Platina II', 'Platina III', 'Diamante I', 'Diamante II', 'Diamante III', 'Ascendente I', 'Ascendente II', 'Ascendente III', 'Imortal I', 'Imortal II', 'Imortal III', 'Radiante'];
  if (rank !== null) return labels[rank - 3] ?? null;
  return localizedRankLabel(value, 'valorant');
}
function localizedRankLabel(value: unknown, game: 'lol' | 'valorant'): string | null {
  const raw = text(value);
  if (!raw || /[\u0400-\u04FF]/.test(raw)) return null;
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const aliases: Record<string, string> = {
    iron: 'Ferro', ferro: 'Ferro', bronze: 'Bronze', silver: 'Prata', prata: 'Prata', gold: 'Ouro', ouro: 'Ouro',
    platinum: 'Platina', platina: 'Platina', emerald: 'Esmeralda', esmeralda: 'Esmeralda', diamond: 'Diamante', diamante: 'Diamante',
    ascendant: 'Ascendente', ascendente: 'Ascendente', immortal: 'Imortal', imortal: 'Imortal', radiant: 'Radiante', radiante: 'Radiante',
    master: 'Mestre', mestre: 'Mestre', grandmaster: 'Grão-mestre', 'grao mestre': 'Grão-mestre', challenger: 'Desafiante', desafiante: 'Desafiante',
  };
  const match = normalized.match(/^([a-z ]+?)(?:\s+(iv|iii|ii|i|[1-3]))?$/i);
  if (!match) return null;
  const tierKey = match[1].trim();
  const tier = aliases[tierKey];
  if (!tier) return null;
  const validTiers = game === 'valorant'
    ? ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Ascendente', 'Imortal', 'Radiante']
    : ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Esmeralda', 'Diamante', 'Mestre', 'Grão-mestre', 'Desafiante'];
  if (!validTiers.includes(tier)) return null;
  const division = match[2]?.toUpperCase();
  if (!division) return tier;
  if (game === 'valorant') {
    const validDivisions = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Ascendente', 'Imortal'].includes(tier);
    const roman = division.match(/^[1-3]$/) ? ['I', 'II', 'III'][Number(division) - 1] : division;
    return validDivisions && ['I', 'II', 'III'].includes(roman) ? `${tier} ${roman}` : null;
  }
  const divisionalTiers = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Esmeralda', 'Diamante'];
  const roman = division.match(/^[1-4]$/) ? ['I', 'II', 'III', 'IV'][Number(division) - 1] : division;
  if (divisionalTiers.includes(tier)) return ['I', 'II', 'III', 'IV'].includes(roman) ? `${tier} ${roman}` : null;
  return ['Mestre', 'Grão-mestre', 'Desafiante'].includes(tier) && !division ? tier : null;
}
function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const entries = value.flatMap((entry) => {
    if (typeof entry === 'string') return [{ label: entry.slice(0, 100), score: 100 }];
    const skin = record(entry);
    const name = text(skin.title ?? skin.name);
    if (!name) return [];
    const rarity = text(skin.rarity);
    const priority = /mythic|icon|marvel/i.test(rarity ?? '') ? 0 : /legendary/i.test(rarity ?? '') ? 1 : /epic/i.test(rarity ?? '') ? 2 : 3;
    const translatedRarity = rarity ? translateRarity(rarity) : '';
    return [{ label: translatedRarity ? `${name} (${translatedRarity})` : name, score: priority }];
  });
  return entries.sort((left, right) => left.score - right.score).slice(0, 8).map((entry) => entry.label);
}
function firstArray(...values: unknown[]): unknown[] | undefined {
  const arrays = values.filter(Array.isArray) as unknown[][];
  return arrays.find((value) => value.length > 0) ?? arrays[0];
}
function setArray(target: Record<string, unknown>, key: string, ...values: unknown[]): void {
  const value = firstArray(...values);
  if (value) target[key] = value;
}
function normalizeSteamGames(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const game = record(entry);
    const appid = numeric(game.appid ?? game.app_id);
    if (appid === null || !Number.isSafeInteger(appid)) return entry;
    return { ...game, appid };
  });
}
function dynamicTitle(gameLabel: string, details: string[], maxLength = 180): string {
  let title = gameLabel;
  for (const detail of details.filter((value) => Boolean(value) && !/[\u0400-\u04FF]/.test(value))) {
    const candidate = `${title} | ${detail}`;
    if (candidate.length <= maxLength) title = candidate;
  }
  return title === gameLabel ? `${gameLabel} Conta disponível` : title;
}

export function normalizeProduct(item: Record<string, unknown>): NormalizedProduct | null {
  const itemId = String(item.item_id ?? '').trim();
  if (!itemId || itemId.length > 100) return null;
  if (item.item_origin !== undefined && item.item_origin !== 'personal') return null;
  const category = record(item.category);
  const gameRaw = [item.game, item.item_domain, category.category_name, category.category_title, item.title].filter((value) => typeof value === 'string').join(' ').toLowerCase();
  const feedHint = String(item.catalog_game_hint);
  const feedGame: Exclude<Game, 'other'> | null = ['fortnite', 'valorant', 'lol', 'roblox', 'steam'].includes(feedHint) ? feedHint as Exclude<Game, 'other'> : null;
  const hasFortnite = numeric(item.epicgames_fortnite_skin_count) !== null || numeric(item.epicgames_fortnite_level) !== null;
  const hasValorant = numeric(item.riot_valorant_level) !== null || numeric(item.riot_valorant_skin_count) !== null;
  const hasLol = numeric(item.riot_lol_level) !== null || numeric(item.riot_lol_skin_count) !== null;
  const game: Game = feedGame ?? (gameRaw.includes('fortnite') || hasFortnite || (Array.isArray(item.epicgames_game) && item.epicgames_game.some((entry) => String(entry).toLowerCase() === 'fortnite'))
    ? 'fortnite'
    : gameRaw.includes('valorant') || (hasValorant && !hasLol) ? 'valorant'
      : gameRaw.includes('league') || gameRaw.includes('legends') || gameRaw === 'lol' || (hasLol && !hasValorant) ? 'lol'
        : gameRaw.includes('roblox') ? 'roblox'
          : gameRaw.includes('steam') ? 'steam' : 'other');
  if (game === 'other') return null;
  const listedCurrency = String(item.price_currency ?? '').toUpperCase();
  if (listedCurrency && !['RUB', 'USD', 'BRL'].includes(listedCurrency)) return null;
  const price = numeric(
    listedCurrency === 'RUB' ? item.rub_price ?? item.price_rub ?? item.price :
      listedCurrency === 'USD' ? item.price_usd ?? item.price :
        listedCurrency === 'BRL' ? item.price_brl ?? item.price :
          item.price_rub ?? item.rub_price ?? item.price_brl ?? item.price_usd ?? item.price,
  );
  if (price === null || price <= 0) return null;
  const currency: NormalizedProduct['currency'] = listedCurrency === 'USD' || (!listedCurrency && item.price_usd !== undefined && item.price_rub === undefined && item.rub_price === undefined)
    ? 'USD'
    : listedCurrency === 'BRL' || (!listedCurrency && item.price_brl !== undefined && item.price_rub === undefined && item.rub_price === undefined)
      ? 'BRL'
      : 'RUB';
  const statusRaw = String(item.status ?? item.account_status ?? item.item_state ?? '').toLowerCase();
  const status: NormalizedProduct['status'] = /invalid|inv[aá]lido/.test(statusRaw) ? 'invalid' : /banned|banido/.test(statusRaw) ? 'banned' : /sold|vendido|closed|deleted/.test(statusRaw) ? 'sold' : (!statusRaw || statusRaw === 'active' || statusRaw === 'available') ? 'available' : 'invalid';
  const sourceInventory = record(item.inventory);
  const inventory: Record<string, unknown> = { ...sourceInventory };
  if (game === 'valorant') {
    inventory.skins_count ??= inventory.valorant_smin ?? item.riot_valorant_skin_count;
    const rankCandidates = [inventory.rank, item.valorantRankTitle, item.riot_valorant_rank, inventory.rmin, item.rmin];
    const normalizedRank = rankCandidates
      .map((value) => ({ value, label: valorantRankLabel(value) }))
      .find((candidate) => candidate.label !== null);
    const rankRaw = normalizedRank?.value ?? rankCandidates.find((value) => value !== undefined && value !== null);
    if (normalizedRank?.label) inventory.rank = normalizedRank.label;
    else if (rankRaw !== undefined && rankRaw !== null) delete inventory.rank;
    inventory.level ??= inventory.valorant_level_min ?? item.riot_valorant_level;
    inventory.vp_min ??= item.riot_valorant_wallet_vp;
    inventory.region ??= item.valorant_region ?? item.riot_valorant_region;
    setArray(inventory, 'weapon_skins', item.weaponSkin, item.weapon_skins, sourceInventory.weaponSkin, sourceInventory.weapon_skins);
    setArray(inventory, 'agents', item.agent, item.agents, sourceInventory.agent, sourceInventory.agents);
    setArray(inventory, 'buddies', item.buddy, item.buddies, sourceInventory.buddy, sourceInventory.buddies);
  } else if (game === 'lol') {
    inventory.skins_count ??= inventory.lol_smin ?? item.riot_lol_skin_count;
    const rankCandidates = [inventory.lol_rank, inventory.rank, item.riot_lol_rank];
    const normalizedRank = rankCandidates
      .map((value) => ({ value, label: localizedRankLabel(value, 'lol') }))
      .find((candidate) => candidate.label !== null);
    const rankRaw = normalizedRank?.value ?? rankCandidates.find((value) => value !== undefined && value !== null);
    const rank = normalizedRank?.label ?? null;
    if (rank) {
      inventory.rank = rank;
      if (inventory.lol_rank !== undefined) inventory.lol_rank = rank;
    } else if (rankRaw !== undefined && rankRaw !== null) {
      delete inventory.rank;
      delete inventory.lol_rank;
    }
    inventory.level ??= inventory.lol_level ?? item.riot_lol_level;
    inventory.blue_min ??= item.riot_lol_wallet_blue;
    inventory.region ??= item.lol_region ?? item.riot_lol_region;
    setArray(inventory, 'skins', item.skin, item.skins, sourceInventory.skin, sourceInventory.skins);
    setArray(inventory, 'champions', item.champion, item.champions, sourceInventory.champion, sourceInventory.champions);
  } else if (game === 'fortnite') {
    inventory.skins_count ??= item.epicgames_fortnite_skin_count;
    inventory.pickaxes_count ??= item.epicgames_fortnite_pickaxe_count;
    inventory.dances_count ??= item.epicgames_fortnite_dance_count;
    inventory.gliders_count ??= item.epicgames_fortnite_glider_count;
    inventory.level ??= item.epicgames_fortnite_level;
    inventory.vbucks_balance ??= item.epicgames_fortnite_balance;
    inventory.featured_pickaxes ??= item.fortnitePickaxe;
    inventory.featured_dances ??= item.fortniteDance;
    inventory.featured_gliders ??= item.fortniteGliders;
    inventory.battle_pass ??= item.battle_pass;
    inventory.xbox_linkable ??= item.epicgames_fortnite_xbox_linkable;
    inventory.psn_linkable ??= item.epicgames_fortnite_psn_linkable;
    inventory.featured_skins ??= item.fortniteSkins;
    setArray(inventory, 'skins', item.skin, item.skins, sourceInventory.skin, sourceInventory.skins);
    setArray(inventory, 'pickaxes', item.pickaxe, item.pickaxes, sourceInventory.pickaxe, sourceInventory.pickaxes);
    setArray(inventory, 'dances', item.dance, item.dances, sourceInventory.dance, sourceInventory.dances);
    setArray(inventory, 'gliders', item.glider, item.gliders, sourceInventory.glider, sourceInventory.gliders);
  } else if (game === 'roblox') {
    inventory.roblox_id ??= item.roblox_id;
    inventory.username ??= item.roblox_username;
    inventory.country ??= item.roblox_country;
    inventory.level ??= item.roblox_level;
    inventory.items_count ??= item.roblox_items_count;
    inventory.fruits_count ??= item.roblox_fruits_count;
    inventory.robux_balance ??= item.roblox_robux;
    inventory.friends_count ??= item.roblox_friends;
    inventory.followers_count ??= item.roblox_followers;
    inventory.subscription ??= item.roblox_subscription;
    inventory.limited_value ??= item.roblox_limited_price;
    inventory.inventory_value ??= item.roblox_inventory_price;
    setArray(inventory, 'items', item.items, item.item, sourceInventory.items);
    setArray(inventory, 'fruits', item.fruits, item.fruit, sourceInventory.fruits);
    setArray(inventory, 'gamepasses', item.gamepasses, item.gamepass, item.game_passes, sourceInventory.gamepasses, sourceInventory.gamepass, sourceInventory.game_passes);
  } else if (game === 'steam') {
    inventory.level ??= item.steam_level;
    inventory.games_count ??= item.steam_game_count ?? item.steam_games_count ?? item.totalGameCount ?? item.games_count;
    inventory.inventory_value ??= item.steam_inventory_value ?? item.inventory_value;
    inventory.balance ??= item.steam_balance ?? item.balance;
    inventory.vac_banned ??= item.steam_vac_banned ?? item.vac_banned;
    inventory.community_banned ??= item.steam_community_banned ?? item.community_banned ?? item.rt;
    inventory.trade_banned ??= item.steam_trade_banned ?? item.trade_banned ?? item.trade_ban;
    inventory.trade_limited ??= item.steam_trade_limited ?? item.trade_limited ?? item.trade_limit;
    inventory.market_available ??= item.steam_market_available ?? item.market_available ?? item.market;
    inventory.guard_available ??= item.steam_guard_available ?? item.guard_available ?? item.mafile;
    const fullGames = record(item.steam_full_games);
    const fullGameList = Object.values(fullGames).flatMap((group) => Object.values(record(group)).flatMap((value) => {
        const entry = record(value);
        const title = text(entry.title);
        return title ? [{ appid: numeric(entry.appid), title, playtime_forever: numeric(entry.playtime_forever) }] : [];
      }))
      .slice(0, 500);
    setArray(inventory, 'games', normalizeSteamGames(item.steam_games), normalizeSteamGames(item.steam_game), normalizeSteamGames(item.games), normalizeSteamGames(item.game), normalizeSteamGames(sourceInventory.games), normalizeSteamGames(fullGameList));
    setArray(inventory, 'game_names', item.game_names, sourceInventory.game_names, fullGameList.map((entry) => entry.title));
    setArray(inventory, 'gifts', item.gift, item.gifts, sourceInventory.gift, sourceInventory.gifts);
  }
  const platforms = record(item.platforms_linked);
  const activitySource = item.riot_last_activity ?? item.epicgames_last_activity ?? item.steam_last_activity ?? item.account_last_activity ?? item.last_activity;
  const activityTimestamp = numeric(activitySource);
  const activityMillis = activityTimestamp === null ? null : activityTimestamp > 10_000_000_000 ? activityTimestamp : activityTimestamp * 1000;
  const parsedActivityMillis = activityMillis ?? (typeof activitySource === 'string' && activitySource.trim() ? new Date(activitySource).getTime() : null);
  const validActivityMillis = parsedActivityMillis !== null && Number.isFinite(parsedActivityMillis) && parsedActivityMillis < Date.UTC(2100, 0, 1) ? parsedActivityMillis : null;
  const derivedOfflineDays = validActivityMillis === null ? null : Math.max(0, Math.floor((Date.now() - validActivityMillis) / 86_400_000));
  const lastActivityIso = validActivityMillis === null ? null : new Date(validActivityMillis).toISOString();
  const daysOffline = numeric(item.days_offline ?? item.daybreak) ?? derivedOfflineDays;
  const attributes = record(clean({
    inventory,
    platforms_linked: platforms,
    region: item.riot_lol_region ?? item.riot_valorant_region ?? item.lol_region ?? item.valorant_region ?? inventory.region,
    days_offline: daysOffline,
    last_activity: lastActivityIso,
    email_type: item.email_type,
  }));
  const emailChangeable = booleanFlag(item.change_email);
  if (emailChangeable !== null) attributes.change_email = emailChangeable;
  const skins = numeric(inventory.skins_count ?? inventory.lol_smin ?? inventory.valorant_smin);
  const featured = list(inventory.featured_skins);
  const seller = record(item.seller);
  const sellerStats = clean({
    sold_items_count: seller.sold_items_count,
    restore_percent: seller.restore_percents,
    active_items_count: seller.active_items_count,
  });
  const sellerSummary = Object.values(record(sellerStats)).some((value) => value !== undefined) ? sellerStats : null;
  let details: string[];
  if (game === 'fortnite') {
    const pickaxes = numeric(inventory.pickaxes_count);
    const dances = numeric(inventory.dances_count);
    const gliders = numeric(inventory.gliders_count);
    const vbucks = numeric(inventory.vbucks_balance);
    const consoles = [platforms.psn_linkable === 'yes' || numeric(inventory.psn_linkable) === 1 ? 'PSN' : '', platforms.xbox_linkable === 'yes' || numeric(inventory.xbox_linkable) === 1 ? 'Xbox' : '', platforms.pc === 'yes' ? 'PC' : ''].filter(Boolean).join('/');
    const featuredSkin = list(inventory.featured_skins)[0] ?? list(inventory.skins)[0] ?? '';
    details = [
      featuredSkin,
      skins === null ? '' : `${skins.toLocaleString('pt-BR')} skins`,
      consoles ? `${consoles} vinculável` : '',
      vbucks === null ? '' : `${vbucks.toLocaleString('pt-BR')} V-Bucks`,
      numeric(inventory.level) === null ? '' : `nível ${numeric(inventory.level)}`,
      daysOffline === null ? '' : `${daysOffline.toLocaleString('pt-BR')} dias offline`,
      pickaxes === null ? '' : `${pickaxes.toLocaleString('pt-BR')} picaretas`,
      dances === null ? '' : `${dances.toLocaleString('pt-BR')} emotes`,
      gliders === null ? '' : `${gliders.toLocaleString('pt-BR')} asas-delta`,
    ];
  } else if (game === 'valorant' || game === 'lol') {
    const rankRaw = inventory.rank ?? inventory.lol_rank ?? (game === 'valorant' ? item.rmin : item.riot_lol_rank);
    const rank = game === 'valorant' ? valorantRankLabel(rankRaw) : localizedRankLabel(rankRaw, 'lol');
    if (rank) inventory.rank = rank;
    const balance = numeric(game === 'valorant' ? inventory.vp_min : inventory.blue_min);
    const balanceLabel = game === 'valorant' ? 'VP' : 'Essência azul';
    const count = skins === null ? '' : `${skins.toLocaleString('pt-BR')} skins`;
    const featuredItem = list(inventory.featured_skins)[0] ?? list(game === 'valorant' ? inventory.weapon_skins : inventory.skins)[0] ?? featured[0] ?? '';
    details = [rank ?? '', featuredItem, count, balance === null ? '' : `${balance.toLocaleString('pt-BR')} ${balanceLabel}`, numeric(inventory.level) === null ? '' : `nível ${numeric(inventory.level)}`, daysOffline === null ? '' : `${daysOffline} dias offline`];
  } else if (game === 'roblox') {
    const level = numeric(inventory.level);
    const items = numeric(inventory.items_count ?? inventory.fruits_count);
    const robux = numeric(inventory.robux_balance);
    const followers = numeric(inventory.followers_count);
    const friends = numeric(inventory.friends_count);
    const limited = numeric(inventory.limited_value);
    const featuredItem = list(inventory.featured_items)[0] ?? list(inventory.items)[0] ?? list(inventory.featured_fruits)[0] ?? list(inventory.fruits)[0] ?? list(inventory.gamepasses)[0] ?? '';
    details = [featuredItem, level === null ? '' : `nível ${level}`, items === null ? '' : `${items} itens`, robux === null ? '' : `${robux.toLocaleString('pt-BR')} Robux`, daysOffline === null ? '' : `${daysOffline} dias offline`, inventory.subscription === 'none' ? '' : text(inventory.subscription) ?? '', limited === null ? '' : `${limited.toLocaleString('pt-BR')} em itens limitados`, followers === null ? '' : `${followers} seguidores`, friends === null ? '' : `${friends} amigos`];
  } else if (game === 'steam') {
    const games = numeric(inventory.games_count);
    const steamLevel = numeric(inventory.level);
    const value = numeric(inventory.inventory_value);
    const balance = numeric(inventory.balance);
    const vac = inventory.vac_banned === false || inventory.vac_banned === 'no' ? 'Sem VAC' : inventory.vac_banned === true || inventory.vac_banned === 'yes' ? 'VAC ativo' : '';
    const trade = inventory.trade_banned === false || inventory.trade_banned === 'no' ? 'Sem bloqueio de trocas' : inventory.trade_banned === true || inventory.trade_banned === 'yes' ? 'Bloqueio de trocas' : '';
    const featuredGame = list(inventory.game_names)[0] ?? list(inventory.games)[0] ?? '';
    details = [featuredGame, games === null ? '' : `${games} jogos`, steamLevel === null ? '' : `nível ${steamLevel}`, balance === null ? '' : `saldo ${balance.toLocaleString('pt-BR')}`, daysOffline === null ? '' : `${daysOffline} dias offline`, value === null ? '' : `inventário ${value.toLocaleString('pt-BR')}`, vac, trade];
  } else {
    const level = numeric(inventory.level ?? inventory.lol_level ?? inventory.valorant_level_min);
    const items = numeric(inventory.items_count ?? inventory.skins_count);
    details = [level === null ? '' : `nível ${level}`, items === null ? '' : `${items} itens`, daysOffline === null ? '' : `${daysOffline} dias offline`];
  }
  const gameLabel = game === 'lol' ? 'LEAGUE OF LEGENDS' : game.toUpperCase();
  const title = dynamicTitle(gameLabel, details);
  if (sellerSummary) attributes.seller_reputation = sellerSummary;
  return { itemId, sellerId: item.seller_id == null && seller.user_id == null ? null : String(item.seller_id ?? seller.user_id).slice(0, 40), game, sourceTitle: text(item.title), title, sourcePrice: price, currency, status, daysOffline, attributes };
}
