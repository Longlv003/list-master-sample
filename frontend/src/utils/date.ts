export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateBoundary(value: string, nextDay = false): string {
  const date = new Date(value + 'T00:00:00');
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.toISOString();
}
