import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Crystalforn — prévia demonstrativa',
  description: 'Conheça uma prévia fictícia da vitrine Crystalforn. Os anúncios não são reais e não podem ser comprados; pagamentos e entregas estão desativados.',
  robots: { index: false, follow: false },
  icons: { icon: '/brand/crystalforn-mark.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" data-theme="dark"><body><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><SiteHeader /><main id="conteudo">{children}</main><footer className="site-footer"><div className="shell footer-row"><Link className="footer-brand" href="/"><Image src="/brand/crystalforn-mark.png" alt="" width={28} height={28} /><span>Crystalforn</span></Link><span>Catálogo para consulta · compras e pagamentos desativados</span><Link href="/termos">Termos da loja</Link></div></footer></body></html>;
}
