export type DemoProduct = {
  id: string;
  game: string;
  generated_title: string;
  price_brl_cents: number;
  attributes: Record<string, unknown>;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'demo-fortnite-01', game: 'fortnite', generated_title: 'Fortnite · inventário com 42 skins', price_brl_cents: 8990, attributes: { days_offline: 45, inventory: { skins_count: 42, skin_names: ['Travis Scott', 'Lynx', 'Peely'], pickaxe_names: ['Driver'], emote_names: ['Dance Moves'], glider_names: ['Discovery'], pickaxes_count: 18, vbucks_balance: 1200 } } },
  { id: 'demo-fortnite-02', game: 'fortnite', generated_title: 'Fortnite · coleção de 86 skins', price_brl_cents: 14990, attributes: { days_offline: 120, inventory: { skins_count: 86, skin_names: ['Midas', 'Lynx', 'Raven'], pickaxe_names: ['Reaper'], emote_names: ['Scenario'], glider_names: ['Founder’s Umbrella'], pickaxes_count: 31, vbucks_balance: 2500 } } },
  { id: 'demo-valorant-01', game: 'valorant', generated_title: 'Valorant · Platina II · nível 137', price_brl_cents: 11990, attributes: { days_offline: 60, inventory: { rank: 'Platina II', level: 137, skins_count: 24, agents: ['Jett', 'Sova', 'Sage'], weapon_skins: ['Prime Vandal', 'Reaver Sheriff'] } } },
  { id: 'demo-valorant-02', game: 'valorant', generated_title: 'Valorant · Diamante I · nível 208', price_brl_cents: 21990, attributes: { days_offline: 90, inventory: { rank: 'Diamante I', level: 208, skins_count: 41, agents: ['Omen', 'Raze', 'Killjoy'], weapon_skins: ['Sovereign Ghost', 'RGX Vandal'] } } },
  { id: 'demo-lol-01', game: 'lol', generated_title: 'League of Legends · Ouro II · nível 76', price_brl_cents: 10990, attributes: { days_offline: 52, inventory: { rank: 'Ouro II', lol_rank: 'Ouro II', level: 76, skins_count: 33, skins: ['Ahri Guardiã Estelar', 'Lux Elementalista'], champions: ['Ahri', 'Lux', 'Jinx'] } } },
  { id: 'demo-lol-02', game: 'lol', generated_title: 'League of Legends · Esmeralda · nível 184', price_brl_cents: 18990, attributes: { days_offline: 101, inventory: { rank: 'Esmeralda', lol_rank: 'Esmeralda III', level: 184, skins_count: 68, skins: ['Ezreal Pulsefire', 'Kai’Sa K/DA'], champions: ['Ezreal', 'Kai’Sa', 'Viego'] } } },
  { id: 'demo-roblox-01', game: 'roblox', generated_title: 'Roblox · nível 82 · 16 itens', price_brl_cents: 6990, attributes: { days_offline: 35, inventory: { level: 82, items_count: 16, robux_balance: 800, featured_items: ['Chapéu de cristal', 'Mochila orbital'], featured_fruits: ['Fruta solar', 'Fruta de vento'], gamepasses: ['Passe VIP fictício', 'Acesso extra fictício'] } } },
  { id: 'demo-roblox-02', game: 'roblox', generated_title: 'Roblox · nível 146 · 32 itens', price_brl_cents: 12990, attributes: { days_offline: 75, inventory: { level: 146, items_count: 32, robux_balance: 2100, featured_items: ['Coroa prisma', 'Asas cibernéticas'], featured_fruits: ['Fruta lunar', 'Fruta vulcânica'] } } },
  { id: 'demo-steam-01', game: 'steam', generated_title: 'Steam · biblioteca com 38 jogos', price_brl_cents: 7990, attributes: { days_offline: 40, inventory: { level: 21, games_count: 38, game_names: ['Portal 2', 'Hades', 'Stardew Valley'], games: [{ title: 'Portal 2', playtime_forever: 4500 }, { title: 'Hades', playtime_forever: 1280 }, { title: 'Stardew Valley', playtime_forever: 0 }], vac_banned: false } } },
  { id: 'demo-steam-02', game: 'steam', generated_title: 'Steam · biblioteca com 112 jogos', price_brl_cents: 18990, attributes: { days_offline: 100, inventory: { level: 54, games_count: 112, game_names: ['Cyberpunk 2077', 'Elden Ring', 'Portal 2'], games: [{ title: 'Cyberpunk 2077', playtime_forever: 3040 }, { title: 'Elden Ring', playtime_forever: 8950 }, { title: 'Portal 2', playtime_forever: 240 }], vac_banned: false } } },
];

export function findDemoProduct(id: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((product) => product.id === id);
}
