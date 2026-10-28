'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { fetch('/api/v1/auth/me', { credentials: 'include' }).then(async (r) => r.ok ? r.json() : null).then((data) => setEmail(data?.email ?? null)).catch(() => setEmail(null)); }, []);
  async function logout() { await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }); setEmail(null); location.assign('/'); }
  return <header className="site-header"><div className="shell header-row"><Link className="brand" href="/" aria-label="Crystalforn, início"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><path d="M20 3 36 13 31 34 11 37 4 17 20 3Z" /><path d="m4 17 16 4 16-8M20 3l.2 18 11 13M20.2 21 11 37M20 21l-9-4" /></svg></span><span>Crystalforn<small>contas digitais</small></span></Link><nav className="primary-nav" aria-label="Navegação principal"><Link href="/#catalogo">Catálogo</Link><Link href="/cliente">Minha conta</Link><Link href="/admin">Administração</Link></nav><div className="header-account">{email ? <><span className="signed-email">{email}</span><button type="button" className="button-quiet" onClick={() => void logout()}>Sair</button></> : <Link className="button-quiet" href="/entrar">Entrar</Link>}</div></div></header>;
}
