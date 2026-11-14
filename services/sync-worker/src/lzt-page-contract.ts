export interface LztPagePayload {
  items?: unknown;
  totalItems?: unknown;
  total_items?: unknown;
  hasNextPage?: unknown;
  nextCursor?: unknown;
  page?: unknown;
  perPage?: unknown;
}

export function validateLztPagePayload(value: unknown, requestedPage: number): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'invalid_contract';
  const payload = value as LztPagePayload;
  const totalItems = payload.totalItems ?? payload.total_items;
  if (!Array.isArray(payload.items)
    || (totalItems !== undefined && (!Number.isSafeInteger(totalItems) || Number(totalItems) < 0))
    || (payload.hasNextPage !== undefined && typeof payload.hasNextPage !== 'boolean')
    || (payload.nextCursor !== undefined && typeof payload.nextCursor !== 'string')
    || (payload.hasNextPage === true && (typeof payload.nextCursor !== 'string'
      || payload.nextCursor.trim().length === 0 || payload.nextCursor.length > 4096))
    || (requestedPage > 1 && payload.hasNextPage === undefined)
    // `after` is the authoritative continuation for this endpoint. A live
    // two-page probe returned `page: 1` on both responses, so this field is
    // informational and cannot be compared with the worker checkpoint.
    || (payload.page !== undefined && (typeof payload.page !== 'number'
      || !Number.isSafeInteger(payload.page) || payload.page < 1))
    || (payload.perPage !== undefined && (typeof payload.perPage !== 'number'
      || !Number.isSafeInteger(payload.perPage) || payload.perPage < 1))
    || (payload.hasNextPage === undefined && typeof totalItems !== 'number')) {
    return 'invalid_contract';
  }
  return null;
}
