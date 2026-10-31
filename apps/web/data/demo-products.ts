export type DemoProduct = {
  id: string;
  game: string;
  generated_title: string;
  price_brl_cents: number;
  attributes: Record<string, unknown>;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'demo-fortnite-01', game: 'fortnite', generated_title: 'Fortnite · 82 skins · Travis Scott · PSN/Xbox/PC vinculável · 90 dias offline', price_brl_cents: 8990, attributes: { days_offline: 90, email_type: 'native', change_email: 'yes', battle_pass: { has_bp: true, bp_level: 120 }, platforms_linked: { psn_linkable: 'yes', xbox_linkable: 'yes', pc: 'yes' }, inventory: { skins_count: 82, featured_skins: ['Travis Scott', 'Renegade Raider'], pickaxes_count: 45, dances_count: 60, gliders_count: 30, vbucks_balance: 1500 } } },
  { id: 'demo-fortnite-02', game: 'fortnite', generated_title: 'Fortnite · coleção de 86 skins', price_brl_cents: 14990, attributes: { days_offline: 120, inventory: { skins_count: 86, skin_names: ['Midas', 'Lynx', 'Raven'], pickaxe_names: ['Reaper'], emote_names: ['Scenario'], glider_names: ['Founder’s Umbrella'], pickaxes_count: 31, vbucks_balance: 2500 } } },
  { id: 'demo-valorant-01', game: 'valorant', generated_title: 'Valorant · Platina II · nível 137', price_brl_cents: 11990, attributes: { days_offline: 60, inventory: { rank: 'Platina II', level: 137, skins_count: 24, agents: ['Jett', 'Sova', 'Sage'], weapon_skins: ['Prime Vandal', 'Reaver Sheriff'] } } },
  { id: 'demo-valorant-02', game: 'valorant', generated_title: 'Valorant · Diamante I · nível 208', price_brl_cents: 21990, attributes: { days_offline: 90, inventory: { rank: 'Diamante I', level: 208, skins_count: 41, agents: ['Omen', 'Raze', 'Killjoy'], weapon_skins: ['Sovereign Ghost', 'RGX Vandal'] } } },
  { id: 'demo-valorant-03', game: 'valorant', generated_title: 'Valorant · Ascendente I · 18 skins · 850 VP · 30 dias offline · nível 85', price_brl_cents: 14990, attributes: { days_offline: 30, inventory: { rank: 'Ascendente I', level: 85, valorant_level_min: 85, skins_count: 18, knife: true, valorant_knife_min: 2, vp_min: 850, rp_min: 120, featured_skins: ['Vandal Vingança do Vandal', 'Phantom Glitchpop'], agents: ['Jett', 'Reyna', 'Chamber'] } } },
  { id: 'demo-lol-01', game: 'lol', generated_title: 'League of Legends · Ouro II · nível 76', price_brl_cents: 10990, attributes: { days_offline: 52, inventory: { rank: 'Ouro II', lol_rank: 'Ouro II', level: 76, skins_count: 33, skins: ['Ahri Guardiã Estelar', 'Lux Elementalista'], champions: ['Ahri', 'Lux', 'Jinx'] } } },
  { id: 'demo-lol-02', game: 'lol', generated_title: 'League of Legends · Esmeralda III · nível 184', price_brl_cents: 18990, attributes: { days_offline: 101, inventory: { rank: 'Esmeralda', lol_rank: 'Esmeralda III', level: 184, skins_count: 68, skins: ['Ezreal Pulsefire', 'Kai’Sa K/DA'], champions: ['Ezreal', 'Kai’Sa', 'Viego'] } } },
  { id: 'demo-lol-03', game: 'lol', generated_title: 'League of Legends · Diamante II · 42 skins · 12.500 Essência azul · 45 dias offline · nível 150', price_brl_cents: 15990, attributes: { days_offline: 45, inventory: { rank: 'Diamante II', lol_rank: 'Diamante II', level: 150, lol_level: 150, skins_count: 42, lol_smin: 42, champion_min: 110, blue_min: 12500, orange_min: 2100, mythic_min: 15, featured_skins: ['Lux Elementalista', 'DJ Sona'], champions: ['Lux', 'Sona', 'Jinx'] } } },
  { id: 'demo-roblox-01', game: 'roblox', generated_title: 'Roblox · nível 82 · 16 itens', price_brl_cents: 6990, attributes: { days_offline: 35, inventory: { level: 82, items_count: 16, robux_balance: 800, featured_items: ['Chapéu de cristal', 'Mochila orbital'], featured_fruits: ['Fruta solar', 'Fruta de vento'], gamepasses: ['Passe VIP fictício', 'Acesso extra fictício'] } } },
  { id: 'demo-roblox-02', game: 'roblox', generated_title: 'Roblox · nível 146 · 32 itens', price_brl_cents: 12990, attributes: { days_offline: 75, inventory: { level: 146, items_count: 32, robux_balance: 2100, featured_items: ['Coroa prisma', 'Asas cibernéticas'], featured_fruits: ['Fruta lunar', 'Fruta vulcânica'] } } },
  { id: 'demo-steam-01', game: 'steam', generated_title: 'Steam · biblioteca com 38 jogos', price_brl_cents: 7990, attributes: { days_offline: 40, inventory: { level: 21, games_count: 38, game_names: ['Portal 2', 'Hades', 'Stardew Valley'], games: [{ title: 'Portal 2', playtime_forever: 4500 }, { title: 'Hades', playtime_forever: 1280 }, { title: 'Stardew Valley', playtime_forever: 0 }], vac_banned: false } } },
  { id: 'demo-steam-02', game: 'steam', generated_title: 'Steam · biblioteca com 112 jogos', price_brl_cents: 18990, attributes: { days_offline: 100, inventory: { level: 54, games_count: 112, game_names: ['Cyberpunk 2077', 'Elden Ring', 'Portal 2'], games: [{ title: 'Cyberpunk 2077', playtime_forever: 3040 }, { title: 'Elden Ring', playtime_forever: 8950 }, { title: 'Portal 2', playtime_forever: 240 }], vac_banned: false } } },
];

export function findDemoProduct(id: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((product) => product.id === id);
}
