'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    let initialTheme: Theme = 'dark';
    try { if (window.localStorage.getItem('crystalforn-theme') === 'light') initialTheme = 'light'; } catch { /* Keep the server-rendered default when storage is unavailable. */ }
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try { window.localStorage.setItem('crystalforn-theme', nextTheme); } catch { /* Theme remains active for this page view. */ }
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" />
        </svg>
      )}
      <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
    </button>
  );
}

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setEmail(data?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function logout() {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    setEmail(null);
    location.assign('/');
  }

  return (
    <header className="site-header">
      <div className="shell header-row">
        <Link className="brand" href="/" aria-label="Crystalforn, início">
          <span className="brand-wordmark-window" aria-hidden="true">
            <Image className="brand-wordmark brand-wordmark-dark" src="/brand/crystalforn-wordmark-dark.png" alt="" width={1945} height={808} priority />
            <Image className="brand-wordmark brand-wordmark-light" src="/brand/crystalforn-wordmark-light.png" alt="" width={1944} height={809} />
          </span>
        </Link>
        <nav className="primary-nav" aria-label="Navegação principal">
          <Link href="/#catalogo">Catálogo</Link>
          <Link href="/cliente">Minha conta</Link>
          <Link href="/admin">Administração</Link>
        </nav>
        <div className="header-account">
          <ThemeToggle />
          {email ? (
            <>
              <span className="signed-email">{email}</span>
              <button type="button" className="button-quiet" onClick={() => void logout()}>Sair</button>
            </>
          ) : <Link className="button-quiet" href="/entrar">Entrar</Link>}
        </div>
      </div>
    </header>
  );
}
