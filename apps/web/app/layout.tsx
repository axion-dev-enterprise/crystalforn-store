import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Crystalforn — contas digitais de jogos',
  description: 'Conheça a prévia visual da Crystalforn com exemplos fictícios, filtros de catálogo e navegação responsiva.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><SiteHeader /><main id="conteudo">{children}</main><footer className="site-footer"><div className="shell footer-row"><span>Crystalforn</span><span>Prévia visual · dados fictícios · sem ofertas ou pagamentos</span><Link href="/termos">Termos de Compra</Link></div></footer></body></html>;
}
