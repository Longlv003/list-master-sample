import { config } from '../config/config';
export function allowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && (url.host === host || config.allowedOrigins.includes(url.origin));
  } catch { return false; }
}
