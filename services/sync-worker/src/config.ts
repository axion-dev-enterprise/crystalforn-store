export function integerEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw.trim());
  if (!/^-?\d+$/.test(raw.trim()) || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} deve ser um número inteiro entre ${minimum} e ${maximum}.`);
  }
  return value;
}
