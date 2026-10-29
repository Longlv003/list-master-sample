export function normalizeIdentifier(value: string | undefined | null, width: number): string {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? text.padStart(width, '0') : text;
}

export function sampleIdentity(item: string, lot: string, barcode: string): string {
  return JSON.stringify([item.trim().toLowerCase(), normalizeIdentifier(lot, 5).toLowerCase(), normalizeIdentifier(barcode, 3).toLowerCase()]);
}
