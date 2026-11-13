export function providerRetryDelayMs(value: string | null, minimumDelayMs: number, now = Date.now()): number {
  const fallback = Math.max(minimumDelayMs, 60_000);
  if (!value?.trim()) return fallback;
  const retryAfter = value.trim();
  const deltaSeconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : Number.NaN;
  const retryAt = Number.isSafeInteger(deltaSeconds) && deltaSeconds >= 0
    ? now + deltaSeconds * 1000
    : Date.parse(retryAfter);
  const delay = retryAt - now;
  if (!Number.isFinite(delay) || delay <= 0) return fallback;
  return Math.max(minimumDelayMs, Math.min(Math.ceil(delay), 2_147_483_647));
}
