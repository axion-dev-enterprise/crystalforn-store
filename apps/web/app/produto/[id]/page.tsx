import { ProductDetail } from '@/components/product-detail';

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const candidate = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = candidate?.startsWith('/') && !candidate.startsWith('//') ? candidate : '/#catalogo';
  return <ProductDetail id={id} returnTo={returnTo} />;
}
