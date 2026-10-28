'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { findDemoProduct } from '@/data/demo-products';

type Product = { id: string; provider_item_id: string; game: string; generated_title: string; price_brl_cents: number; attributes: Record<string, unknown>; synced_at?: string | null; seller_feedback_total?: number | null; seller_feedback_positive_percentage?: number | null; demoOnly?: boolean };
type CheckoutResult = { order: { id: string; status: string; total_cents: number }; pix?: { copyPaste?: string; qrCodeBase64?: string | null; expiresAt?: string } };
type InventoryImages = Partial<Record<'skins' | 'pickaxes' | 'dances' | 'gliders' | 'avatar', string>>;
const rarityLabelsPtBr: Record<string, string> = { common: 'Comum', uncommon: 'Incomum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária', mythic: 'Mítica', icon: 'Série Ícones' };
const orderStatusPtBr: Record<string, string> = { pending_payment: 'Aguardando pagamento', paid: 'Pagamento confirmado', delivery_required: 'Entrega em preparação', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Valor devolvido ao saldo da carteira', review: 'Em análise' };
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const gameNames: Record<string, string> = { fortnite: 'Fortnite', valorant: 'Valorant', lol: 'League of Legends', roblox: 'Roblox', steam: 'Steam' };

function gameLabel(game: string): string { return gameNames[game] ?? 'Conta digital'; }
function titleHighlights(title: string, game: string): string[] {
  const gameName = gameLabel(game).toLocaleLowerCase('pt-BR');
  return title.split(/\s*\|\s*|\s+·\s+/)
    .map((part) => part.trim())
    .filter((part) => part && part.toLocaleLowerCase('pt-BR') !== gameName && !/[\u0400-\u04FF]/.test(part))
    .slice(0, 8);
}

function syncedAtLabel(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function isStaleSync(value?: string | null): boolean {
  if (!value) return true;
  const timestamp = new Date(value).getTime();
  return !Number.isFinite(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000;
}

export function ProductDetail({ id, returnTo = '/#catalogo' }: { id: string; returnTo?: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [method, setMethod] = useState<'pix' | 'wallet'>('pix');
  const [gateway, setGateway] = useState<'mercadopago' | 'pushinpay'>('mercadopago');
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [inventoryImages, setInventoryImages] = useState<InventoryImages>({});
  const [inventoryImageMessage, setInventoryImageMessage] = useState('');
  const [inventorySection, setInventorySection] = useState<HTMLElement | null>(null);
  const [visibleInventoryProductId, setVisibleInventoryProductId] = useState('');
  const [termsEnabled, setTermsEnabled] = useState(false);
  const [catalogReadOnly, setCatalogReadOnly] = useState(false);
  const [paymentProviderApproval, setPaymentProviderApproval] = useState<Record<'mercadopago' | 'pushinpay', boolean>>({ mercadopago: false, pushinpay: false });
  const [termsStatusLoading, setTermsStatusLoading] = useState(true);
  useEffect(() => {
    const demo = findDemoProduct(id);
    if (demo) {
      setProduct({ ...demo, provider_item_id: demo.id, demoOnly: true });
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/v1/catalog/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error('Esta conta não está mais disponível.'); setProduct(await response.json() as Product); })
      .catch((reason) => { setProduct(null); setError(reason instanceof Error ? reason.message : 'Erro ao carregar o produto.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    let active = true;
    fetch('/api/v1/legal/terms/status', { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ enabled?: boolean; catalogMode?: string; paymentProviders?: Partial<Record<'mercadopago' | 'pushinpay', boolean>> }>; })
      .then((body) => { if (active) {
        const approvals = { mercadopago: body.paymentProviders?.mercadopago === true, pushinpay: body.paymentProviders?.pushinpay === true };
        setTermsEnabled(body.enabled === true);
        setCatalogReadOnly(body.catalogMode === 'live_read_only');
        setPaymentProviderApproval(approvals);
        setGateway((current) => approvals[current] ? current : approvals.mercadopago ? 'mercadopago' : approvals.pushinpay ? 'pushinpay' : current);
      } })
      .catch(() => { if (active) setTermsEnabled(false); })
      .finally(() => { if (active) setTermsStatusLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!product || !inventorySection) return;
    setVisibleInventoryProductId('');
    if (!('IntersectionObserver' in window)) { setVisibleInventoryProductId(product.id); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleInventoryProductId(product.id);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(inventorySection);
    return () => observer.disconnect();
  }, [inventorySection, product?.id]);
  useEffect(() => {
    if (product?.game !== 'fortnite' || product.demoOnly || visibleInventoryProductId !== product.id) return;
    let active = true;
    void Promise.all((['skins', 'pickaxes', 'dances', 'gliders'] as const).map(async (type) => {
      try {
        const response = await fetch(`/api/v1/catalog/${encodeURIComponent(product.id)}/inventory-image?type=${type}`, { cache: 'force-cache', signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error();
        const body = await response.json() as { imageDataUrl?: string };
        if (!body.imageDataUrl?.startsWith('data:image/png;base64,')) throw new Error();
        return [type, body.imageDataUrl] as const;
      } catch { return null; }
    })).then((results) => {
      if (!active) return;
      const images = Object.fromEntries(results.filter((entry): entry is NonNullable<typeof entry> => entry !== null)) as InventoryImages;
      setInventoryImages(images);
      if (Object.keys(images).length === 0) setInventoryImageMessage('As prévias visuais do fornecedor não estão disponíveis agora; os dados públicos informados continuam abaixo.');
    });
    return () => { active = false; };
  }, [product, visibleInventoryProductId]);
  useEffect(() => {
    if (product?.game !== 'roblox' || product.demoOnly || visibleInventoryProductId !== product.id) return;
    const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
    const userId = inventory?.roblox_id === undefined ? '' : String(inventory.roblox_id);
    if (!/^\d{1,20}$/.test(userId)) return;
    let active = true;
    fetch(`/api/v1/catalog/roblox-avatars?userIds=${encodeURIComponent(userId)}`, { cache: 'force-cache' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ avatars?: Record<string, string> }>; })
      .then((body) => { if (active && body.avatars?.[userId]) setInventoryImages((current) => ({ ...current, avatar: body.avatars![userId] })); })
      .catch(() => { if (active) setInventoryImageMessage('A miniatura pública do perfil Roblox não está disponível agora.'); });
    return () => { active = false; };
  }, [product, visibleInventoryProductId]);
  async function buy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (method === 'pix' && !paymentProviderApproval[gateway]) {
      setError('Este provedor Pix ainda não foi aprovado para a oferta. Escolha o saldo da carteira ou aguarde a liberação.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/v1/checkout', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ productId: id, paymentMethod: method, gateway, couponCode: coupon.trim() || undefined, termsAccepted }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Não foi possível iniciar a compra.');
      setCheckout(body as CheckoutResult);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao iniciar a compra.'); }
    finally { setBusy(false); }
  }
  async function copyPixCode() {
    const code = checkout?.pix?.copyPaste;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('Código Pix copiado.');
    } catch {
      setCopyStatus('Não foi possível copiar. Selecione o código Pix acima e copie manualmente.');
    }
  }
  if (loading) return <section className="shell page-shell"><div className="detail-skeleton" aria-label="Carregando detalhes" aria-busy="true"><span /><span /><span /></div></section>;
  if (!product) return <section className="shell page-shell"><div className="state-panel error-state" role="alert"><div><h1>Produto indisponível</h1><p>{error}</p></div><Link className="button-outline" href={returnTo}>Voltar ao catálogo</Link></div></section>;
  const highlights = titleHighlights(product.generated_title, product.game);
  const updatedAt = syncedAtLabel(product.synced_at);
  return <section className="shell page-shell">
    <Link className="back-link" href={returnTo}>← Voltar ao catálogo</Link>
    <div className="detail-layout">
      <article className="detail-copy">
        <header className="detail-intro">
          <p className="eyebrow">{product.demoOnly ? 'EXEMPLO FICTÍCIO · PRÉVIA' : `${gameLabel(product.game).toUpperCase()} · ANÚNCIO SINCRONIZADO`}</p>
          <h1>{product.generated_title}</h1>
          <p className="detail-lede">{product.demoOnly ? 'Exemplo demonstrativo para revisar a organização dos dados e do inventário.' : 'Explore os dados públicos do inventário e confira quando o anúncio foi sincronizado.'}</p>
          {highlights.length > 0 && <ul className="detail-highlights" aria-label="Destaques do anúncio">{highlights.map((highlight, index) => <li key={`${highlight}-${index}`}>{highlight}</li>)}</ul>}
          {product.demoOnly ? <p className="detail-updated"><span>Demonstração</span><span>Dados fictícios · sem oferta</span></p> : updatedAt ? <p className={`detail-updated${isStaleSync(product.synced_at) ? ' is-stale' : ''}`}><span>{isStaleSync(product.synced_at) ? 'Disponibilidade pode ter mudado' : 'Última sincronização'}</span><time dateTime={product.synced_at ?? undefined}>{updatedAt}</time></p> : <p className="detail-updated is-stale"><span>Data de sincronização indisponível</span><span>Disponibilidade não confirmada</span></p>}
        </header>
        {typeof product.seller_feedback_total === 'number' && product.seller_feedback_total > 0 && typeof product.seller_feedback_positive_percentage === 'number' && <section className="seller-feedback-summary" aria-label="Reputação do vendedor"><p className="eyebrow">AVALIAÇÕES DO VENDEDOR</p><strong>{product.seller_feedback_positive_percentage}% positivas</strong><p>De {product.seller_feedback_total.toLocaleString('pt-BR')} avaliações agregadas pela API do fornecedor.</p></section>}
      </article>
      <aside className="purchase-panel">
        <p className="eyebrow">{product.demoOnly ? 'VALOR ILUSTRATIVO' : 'PREÇO EM REAIS'}</p>
        <strong className="detail-price">{money(Number(product.price_brl_cents))}</strong>
        {checkout ? <div className="checkout-result" role="status">
          <h2>{checkout.pix ? 'Pix criado' : 'Pedido registrado'}</h2>
          {checkout.pix?.copyPaste && <>
            <label htmlFor="pix-code">Pix copia e cola</label>
            <textarea id="pix-code" readOnly value={checkout.pix.copyPaste} rows={4} />
            <button type="button" className="button-outline" onClick={() => void copyPixCode()}>Copiar código Pix</button>
            {copyStatus && <p className="fine-print" role="status" aria-live="polite">{copyStatus}</p>}
            {checkout.pix.qrCodeBase64 && <img className="qr-image" alt="QR Code Pix para este pedido" width={180} height={180} src={`data:image/png;base64,${checkout.pix.qrCodeBase64}`} />}
          </>}
          <p>Pedido {checkout.order.id.slice(0, 8)} · {orderStatusPtBr[checkout.order.status] ?? 'Em processamento'}</p>
          <Link className="button-primary button-wide" href="/cliente">Acompanhar pedido</Link>
        </div> : product.demoOnly ? <div className="terms-blocked" role="status"><h2>Somente demonstração</h2><p>Este exemplo e o valor exibido são fictícios. Nenhuma compra, cobrança ou entrega está disponível.</p></div> : catalogReadOnly ? <div className="terms-blocked" role="status"><h2>Visualização do catálogo</h2><p>Este anúncio está sincronizado com o fornecedor. Compras, cobranças Pix e débitos da carteira permanecem desativados.</p></div> : !termsEnabled ? <div className="terms-blocked" role="status"><h2>{termsStatusLoading ? 'Conferindo condições de compra' : 'Compra temporariamente indisponível'}</h2><p>{termsStatusLoading ? 'Aguarde a confirmação das condições de compra.' : 'O checkout aguarda a aprovação dos Termos de Compra e a liberação documentada do modelo comercial. Nenhuma cobrança ou débito de carteira será iniciado.'}</p><Link className="button-outline" href="/termos">Ver condições de compra</Link></div> : <form className="checkout-form" onSubmit={(event) => void buy(event)}>
          <label htmlFor="coupon">Cupom de desconto <span>(opcional)</span></label>
          <input id="coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} autoComplete="off" maxLength={32} />
          <label htmlFor="payment-method">Forma de pagamento</label>
          <select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value as 'pix' | 'wallet')}><option value="pix">Pix</option><option value="wallet">Saldo da carteira</option></select>
          {method === 'pix' && <>
            <label htmlFor="gateway">Provedor Pix</label>
            <select id="gateway" value={gateway} onChange={(event) => setGateway(event.target.value as 'mercadopago' | 'pushinpay')}><option value="mercadopago" disabled={!paymentProviderApproval.mercadopago}>Mercado Pago</option><option value="pushinpay" disabled={!paymentProviderApproval.pushinpay}>Pushin Pay</option></select>
            {!paymentProviderApproval[gateway] && <p className="fine-print" role="status">Este provedor Pix ainda não foi aprovado para a oferta. A tentativa de cobrança está desativada; escolha o saldo da carteira ou aguarde a liberação.</p>}
            <p className="fine-print">O pagamento Pix será processado por {gateway === 'pushinpay' ? 'Pushin Pay' : 'Mercado Pago'}.</p>
            {gateway === 'pushinpay' && <p className="fine-print">A Pushin Pay atua como processadora do pagamento. A loja é responsável pela entrega, pelo suporte e pelas informações do produto.</p>}
          </>}
          <div className="terms-consent"><input id="terms-accepted" type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><div className="terms-consent-copy"><label htmlFor="terms-accepted">Li e aceito os Termos de Compra e vou gravar a tela até o primeiro login (necessário para o suporte em caso de problema).</label><Link href="/termos">Ler os Termos de Compra</Link></div></div>
          <p className="fine-print">A compra exige uma conta autenticada. O checkout confirma o item no fornecedor antes de processar o pagamento.</p>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="button-primary button-wide" type="submit" disabled={busy || !termsAccepted || (method === 'pix' && !paymentProviderApproval[gateway])}>{busy ? 'Conferindo estoque…' : 'Continuar compra'}</button>
          <Link className="signin-note" href="/entrar">Entrar ou criar conta</Link>
        </form>}
      </aside>
      {inventoryImageMessage && <p className="inventory-image-note" role="status">{inventoryImageMessage}</p>}
      <InventoryShowcase productId={product.id} game={product.game} demoOnly={Boolean(product.demoOnly)} attributes={product.attributes} images={inventoryImages} sectionRef={setInventorySection} />
      <div className="attributes-panel"><h2>Outros dados da conta</h2><AttributeList attributes={product.attributes} /></div>
    </div>
  </section>;
}

function InventoryShowcase({ productId, game, demoOnly, attributes, images, sectionRef }: { productId: string; game: string; demoOnly: boolean; attributes: Record<string, unknown>; images: InventoryImages; sectionRef: (element: HTMLElement | null) => void }) {
  const inventory = attributes.inventory && typeof attributes.inventory === 'object' ? attributes.inventory as Record<string, unknown> : {};
  const definitions: Array<{ key: string; fallback: string; aliases?: string[]; title: string; image?: string }> = game === 'fortnite' ? [
    { key: 'skins', fallback: 'featured_skins', aliases: ['skin_names'], title: 'Personagens e skins', image: images.skins },
    { key: 'pickaxes', fallback: 'featured_pickaxes', aliases: ['pickaxe_names'], title: 'Picaretas', image: images.pickaxes },
    { key: 'dances', fallback: 'featured_dances', aliases: ['emote_names'], title: 'Emotes', image: images.dances },
    { key: 'gliders', fallback: 'featured_gliders', aliases: ['glider_names'], title: 'Asas-delta', image: images.gliders },
  ] : game === 'valorant' ? [
    { key: 'weapon_skins', fallback: 'featured_skins', title: 'Skins de armas', image: undefined },
    { key: 'agents', fallback: 'featured_agents', title: 'Agentes', image: undefined },
    { key: 'buddies', fallback: 'featured_buddies', title: 'Chaveiros', image: undefined },
  ] : game === 'lol' ? [
    { key: 'skins', fallback: 'featured_skins', title: 'Skins', image: undefined },
    { key: 'champions', fallback: 'featured_champions', title: 'Campeões', image: undefined },
  ] : game === 'roblox' ? [
    { key: 'items', fallback: 'featured_items', title: 'Itens', image: undefined },
    { key: 'fruits', fallback: 'featured_fruits', title: 'Frutas', image: undefined },
    { key: 'gamepasses', fallback: 'game_passes', aliases: ['gamepass'], title: 'Gamepasses', image: undefined },
  ] : game === 'steam' ? [
    { key: 'games', fallback: 'game_names', title: 'Jogos na biblioteca', image: undefined },
    { key: 'gifts', fallback: 'featured_gifts', title: 'Presentes Steam', image: undefined },
  ] : [];
  const groups = definitions.flatMap((group) => {
    const candidates = [group.key, group.fallback, ...(group.aliases ?? [])]
      .map((key) => inventory[key]).filter((value): value is unknown[] => Array.isArray(value));
    const items = candidates.find((value) => value.length > 0) ?? candidates[0];
    return items?.length ? [{ ...group, items }] : [];
  });
  function itemCard(item: unknown, index: number) {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const title = typeof item === 'string' ? item : String(record.title ?? record.name ?? record.label ?? `Item ${index + 1}`);
    const imageUrl = safeInventoryImageUrl(record.image_url ?? record.imageUrl ?? record.icon_url ?? record.iconUrl ?? record.thumbnail ?? record.image ?? record.icon);
    const rarity = typeof record.rarity === 'string' ? record.rarity : '';
    const translatedRarity = rarityLabelsPtBr[rarity.toLowerCase()] ?? rarity;
    const playtimeMinutes = game === 'steam' ? Number(record.playtime_forever ?? record.playtime_minutes) : Number.NaN;
    const playtimeLabel = Number.isFinite(playtimeMinutes) && playtimeMinutes >= 0
      ? playtimeMinutes < 60
        ? `${Math.floor(playtimeMinutes)} min de jogo`
        : `${Math.floor(playtimeMinutes / 60).toLocaleString('pt-BR')} h jogadas`
      : '';
    const tone = /mythic|icon/i.test(rarity) ? 'cosmetic-mythic' : /legendary/i.test(rarity) ? 'cosmetic-legendary' : /epic/i.test(rarity) ? 'cosmetic-epic' : 'cosmetic-standard';
    return <li className="cosmetic-card" key={`${title}-${index}`}>{imageUrl ? <img className="cosmetic-image" src={imageUrl} alt={`Imagem de ${title}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className={`cosmetic-mark ${tone}`} aria-hidden="true">{title.slice(0, 2).toUpperCase()}</span>}<span className="cosmetic-copy"><strong>{title}</strong>{translatedRarity && <small>{translatedRarity}</small>}{playtimeLabel && <small>{playtimeLabel}</small>}</span></li>;
  }
  return <section ref={sectionRef} className={`inventory-showcase inventory-${game}`} aria-labelledby="inventory-showcase-title">
    <div className="inventory-showcase-heading"><div><p className="eyebrow">{demoOnly ? 'AMOSTRA FICTÍCIA · ITENS ILUSTRATIVOS' : 'ITENS INFORMADOS PELO FORNECEDOR'}</p><h2 id="inventory-showcase-title">{demoOnly ? 'Inventário do exemplo' : 'Itens do inventário'}</h2><p className="inventory-coverage-note">{demoOnly ? 'Esta prévia mostra alguns itens fictícios; não representa uma conta real nem um inventário completo.' : 'A lista depende dos campos públicos disponíveis para este anúncio e pode ser parcial.'}</p></div><span>{groups.reduce((total, group) => total + group.items.length, 0)} itens listados</span></div>
    {game === 'roblox' && <RobloxProfile inventory={inventory} avatar={images.avatar} demoOnly={demoOnly} />}
    {groups.map((group) => <section className="inventory-group" key={group.key}>
      <div className="inventory-group-heading"><h3>{group.title}</h3><span>{group.items.length}</span></div>
      {group.image && <img className="inventory-provider-image" src={`/api/v1/catalog/${encodeURIComponent(productId)}/inventory-image/${group.key}/640`} srcSet={imageSrcSet(productId, group.key)} sizes="(max-width: 700px) calc(100vw - 32px), 680px" alt={`Prévia visual do fornecedor: ${group.title.toLowerCase()}`} width={680} height={280} loading="lazy" decoding="async" />}
      <ul className="cosmetic-list">{group.items.slice(0, 36).map(itemCard)}</ul>
      {group.items.length > 36 && <details className="inventory-more"><summary>Ver os outros {group.items.length - 36} itens</summary><ul className="cosmetic-list">{group.items.slice(36).map((item, index) => itemCard(item, index + 36))}</ul></details>}
    </section>)}
    {groups.length === 0 && <p className="inventory-empty">{demoOnly ? 'Este exemplo não lista itens individuais.' : 'O fornecedor ainda não informou itens individuais para esta conta.'}</p>}
  </section>;
}

function safeInventoryImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const trustedHosts = ['epicgames.com', 'epicgames.dev', 'fortnite-api.com', 'rbxcdn.com', 'roblox.com', 'steampowered.com', 'steamstatic.com', 'riotgames.com', 'leagueoflegends.com', 'valorant-api.com'];
    return trustedHosts.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url.toString() : null;
  } catch { return null; }
}

function RobloxProfile({ inventory, avatar, demoOnly }: { inventory: Record<string, unknown>; avatar?: string; demoOnly: boolean }) {
  return <div className="roblox-profile">{avatar ? <Image className="roblox-detail-avatar" src={avatar} alt={`Avatar Roblox de ${String(inventory.username ?? 'usuário')}`} width={64} height={64} sizes="64px" loading="lazy" /> : <div className="roblox-avatar-fallback" aria-hidden="true">R</div>}<div><p className="eyebrow">PERFIL ROBLOX</p><strong>{typeof inventory.username === 'string' ? inventory.username : 'Avatar da conta'}</strong><span>{demoOnly ? 'Perfil fictício usado apenas nesta demonstração.' : typeof inventory.country === 'string' ? inventory.country : 'Miniatura pública do perfil consultada pelo ID Roblox.'}</span></div></div>;
}

function imageSrcSet(productId: string, type: string): string {
  return [320, 640, 960].map((width) => `/api/v1/catalog/${encodeURIComponent(productId)}/inventory-image/${type}/${width} ${width}w`).join(', ');
}

function AttributeList({ attributes }: { attributes: Record<string, unknown> }) {
  const labels: Record<string, string> = {
    inventory: 'Inventário', platforms_linked: 'Plataformas vinculadas', seller_reputation: 'Reputação do vendedor',
    skins_count: 'Skins', pickaxes_count: 'Picaretas', dances_count: 'Emotes', gliders_count: 'Asas-delta',
    rank: 'Elo', level: 'Nível', vp_min: 'Pontos Valorant', blue_min: 'Essência azul', robux_balance: 'Saldo Robux',
    vbucks_balance: 'Saldo V-Bucks', friends_count: 'Amigos', followers_count: 'Seguidores', subscription: 'Assinatura',
    limited_value: 'Valor de itens limitados', inventory_value: 'Valor do inventário', sold_items_count: 'Vendas do vendedor',
    restore_percent: 'Índice de restauração', active_items_count: 'Anúncios ativos', days_offline: 'Dias sem atividade',
    region: 'Região', last_activity: 'Última atividade', email_type: 'Tipo de e-mail', change_email: 'Troca de e-mail disponível',
    username: 'Usuário Roblox', roblox_id: 'ID Roblox', country: 'País da conta', featured_skins: 'Skins em destaque',
    featured_pickaxes: 'Picaretas em destaque', featured_dances: 'Emotes em destaque', featured_gliders: 'Asas-delta em destaque',
    items_count: 'Itens/frutas', fruits_count: 'Frutas',
    games_count: 'Jogos na biblioteca', gamepasses: 'Gamepasses', game_passes: 'Gamepasses', gamepass: 'Gamepasses', vac_banned: 'Banimento VAC', community_banned: 'Banimento da comunidade',
    trade_banned: 'Bloqueio de trocas', trade_limited: 'Limite de trocas', market_available: 'Mercado da comunidade',
    guard_available: 'Steam Guard', balance: 'Saldo Steam',
    battle_pass: 'Passe de Batalha', has_bp: 'Passe ativo', bp_level: 'Nível do passe',
    psn_linkable: 'PSN vinculável', xbox_linkable: 'Xbox vinculável', pc: 'PC disponível',
    lol_level: 'Nível LoL', lol_rank: 'Elo LoL', lol_smin: 'Skins LoL', champion_min: 'Campeões',
    orange_min: 'Essência laranja', mythic_min: 'Essência mítica',
    valorant_level_min: 'Nível Valorant', valorant_smin: 'Skins Valorant', rmin: 'Elo mínimo Valorant',
    rmax: 'Elo máximo Valorant', knife: 'Possui faca', valorant_knife_min: 'Facas Valorant',
    rp_min: 'Pontos radiantes', fa_min: 'Agentes gratuitos',
  };
  const inventoryListKeys = new Set(['skins','skin_names','featured_skins','pickaxes','pickaxe_names','featured_pickaxes','dances','emote_names','featured_dances','gliders','glider_names','featured_gliders','weapon_skins','agents','featured_agents','buddies','featured_buddies','champions','featured_champions','items','featured_items','fruits','featured_fruits','gamepasses','gamepass','game_passes','games','game_names','gifts','featured_gifts']);
  function displayValue(key: string, value: string | number | boolean): string {
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value !== 'string') return String(value);
    const normalized = value.toLowerCase();
    if (normalized === 'yes') return 'Sim';
    if (normalized === 'no') return 'Não';
    if (key === 'email_type' && normalized === 'native') return 'Nativo';
    if (key === 'subscription' && normalized === 'none') return 'Nenhuma';
    if (key === 'last_activity') {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
    }
    return value;
  }
  function entries(value: unknown, prefix = ''): Array<[string, string]> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      const label = `${prefix}${labels[key] ?? key.replaceAll('_', ' ')}`;
      if (child && typeof child === 'object' && !Array.isArray(child)) return entries(child, `${label} · `);
      if (Array.isArray(child)) {
        if (prefix === 'Inventário · ' && inventoryListKeys.has(key)) return [];
        const printable = child.map((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return String(entry);
          const item = entry as Record<string, unknown>;
          const rarity = typeof item.rarity === 'string' ? rarityLabelsPtBr[item.rarity.toLowerCase()] ?? item.rarity : '';
          return [item.title ?? item.name, rarity].filter((part) => typeof part === 'string').join(' · ');
        }).filter(Boolean);
        return printable.length ? [[label, printable.join(', ')] as [string, string]] : [];
      }
      if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') return [[label, displayValue(key, child)] as [string, string]];
      return [];
    });
  }
  const values = entries(attributes);
  return values.length ? <dl className="attribute-list">{values.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p>Detalhes adicionais ainda não foram informados.</p>;
}
