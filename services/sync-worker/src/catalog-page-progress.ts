import { createHash } from 'node:crypto';

export interface CatalogPageProgress {
  fingerprint: string | null;
  pageIds: string[];
  newIds: string[];
  repeatedPage: boolean;
  stalled: boolean;
}

function itemId(item: unknown): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const id = String((item as Record<string, unknown>).item_id ?? '').trim();
  return id && id.length <= 100 ? id : null;
}

function pageFingerprint(pageIds: string[]): string | null {
  if (pageIds.length === 0) return null;
  return createHash('sha256').update([...new Set(pageIds)].sort().join('\n')).digest('hex');
}

export function inspectCatalogPageProgress(
  items: unknown[],
  pageNumber: number,
  seenItemIds: ReadonlySet<string>,
  seenPageFingerprints: readonly string[],
  fingerprintPages = true,
): CatalogPageProgress {
  const pageIds = items.map(itemId).filter((value): value is string => Boolean(value));
  const fingerprint = fingerprintPages ? pageFingerprint(pageIds) : null;
  const newIds = pageIds.filter((id) => !seenItemIds.has(id));

  return {
    fingerprint,
    pageIds,
    newIds,
    repeatedPage: fingerprint !== null && seenPageFingerprints.includes(fingerprint),
    stalled: pageNumber > 1 && newIds.length === 0,
  };
}
