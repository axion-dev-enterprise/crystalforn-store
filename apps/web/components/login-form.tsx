'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginResponse = { message?: string | string[] };

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as LoginResponse | null;
        const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message;
        throw new Error(message || (response.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.' : 'E-mail ou senha inválidos.'));
      }
      router.replace('/admin');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Tente novamente.');
      setBusy(false);
    }
  }

  return <section className="shell page-shell narrow-shell"><Link className="back-link" href="/">← Voltar à loja</Link><div className="form-card"><p className="eyebrow">CRYSTALFORN · ADMINISTRAÇÃO</p><h1>Acesse o painel.</h1><p className="muted-copy">Entre com a conta administrativa provisionada para esta loja.</p>
    <form className="checkout-form" onSubmit={submit}>
      <label htmlFor="admin-email">E-mail administrativo</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required disabled={busy} />
      <label htmlFor="admin-password">Senha</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required disabled={busy} />
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="button-primary button-wide" type="submit" disabled={busy}>{busy ? 'Validando acesso…' : 'Entrar no painel'}</button>
    </form>
    <div className="terms-blocked customer-auth-entry" role="group" aria-labelledby="customer-auth-heading"><h2 id="customer-auth-heading">Área de clientes</h2><p>Entre ou crie sua conta pela identidade central da Crystalforn. O acesso só é liberado depois que o Auth Center validar sua identidade e o papel de cliente.</p><Link className="button-outline button-wide" href="/api/v1/auth/central/login?client=crystalforn">Entrar ou criar conta</Link><p className="fine-print">Se o serviço central não estiver configurado ou disponível, nenhum acesso é concedido.</p></div>
    <Link className="button-outline button-wide auth-back-link" href="/">Voltar à prévia</Link>
  </div></section>;
}
