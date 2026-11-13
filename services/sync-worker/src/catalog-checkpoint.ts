export interface LztCheckpointState {
  nextPage: number;
  nextCursor: string | null;
  cursorHashes: string[];
  itemsSeen: number;
  pageFingerprints: string[];
  hasSavedPage: boolean;
}

const isFingerprint = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function readLztCheckpoint(value: unknown, maxPages: number): LztCheckpointState {
  const state = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
  const structuredPage = state && Number.isSafeInteger(state.nextPage) ? Number(state.nextPage) : null;
  let nextPage = structuredPage ?? 1;
  let nextCursor = typeof state?.nextCursor === 'string' && state.nextCursor.length > 0 && state.nextCursor.length <= 4096
    ? state.nextCursor : null;
  let cursorHashes = Array.isArray(state?.cursorHashes)
    ? state.cursorHashes.filter(isFingerprint).slice(-maxPages)
    : [];
  let itemsSeen = state && Number.isSafeInteger(state.itemsSeen) && Number(state.itemsSeen) >= 0
    ? Number(state.itemsSeen) : 0;
  const hasSavedPage = structuredPage !== null && structuredPage > 0;
  let pageFingerprints = Array.isArray(state?.pageFingerprints)
    ? state.pageFingerprints.filter(isFingerprint).slice(-maxPages)
    : [];

  if (!Number.isSafeInteger(nextPage) || nextPage < 1 || (nextPage > 1 && nextCursor === null)
    || (state?.nextCursor !== undefined && nextCursor === null)) {
    nextPage = 1;
    nextCursor = null;
    cursorHashes = [];
    itemsSeen = 0;
    pageFingerprints = [];
  }

  return { nextPage, nextCursor, cursorHashes, itemsSeen, pageFingerprints, hasSavedPage };
}
