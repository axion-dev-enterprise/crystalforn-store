import { createHash } from 'node:crypto';

export type LztCursorTransition =
  | { kind: 'complete' }
  | { kind: 'error'; errorCode: 'pagination_cursor_missing' | 'pagination_repeated_cursor' }
  | { kind: 'continue'; nextCursor: string; cursorHashes: string[] };

function cursorFingerprint(cursor: string): string {
  return createHash('sha256').update(cursor).digest('hex');
}

export function planLztCursorTransition(
  hasMore: boolean,
  candidateCursor: unknown,
  currentCursor: string | null,
  knownCursorHashes: readonly string[],
  maxHistory: number,
): LztCursorTransition {
  if (!hasMore) return { kind: 'complete' };

  const nextCursor = typeof candidateCursor === 'string' && candidateCursor.trim().length > 0
    && candidateCursor.length <= 4096 ? candidateCursor : null;
  if (nextCursor === null) return { kind: 'error', errorCode: 'pagination_cursor_missing' };

  const nextCursorHash = cursorFingerprint(nextCursor);
  if (nextCursor === currentCursor || knownCursorHashes.includes(nextCursorHash)) {
    return { kind: 'error', errorCode: 'pagination_repeated_cursor' };
  }

  const cursorHashes = currentCursor === null
    ? [...knownCursorHashes]
    : [...knownCursorHashes, cursorFingerprint(currentCursor)].slice(-maxHistory);
  return { kind: 'continue', nextCursor, cursorHashes };
}
