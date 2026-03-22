/**
 * ngrok free endpoints may return an HTML interstitial unless this header is set.
 * Server-side fetch (e.g. Vercel → ngrok → Ollama) does not send browser cookies.
 */
export function getOllamaUpstreamHeaders(additional?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(additional ?? {}) };
  const base = (process.env.OLLAMA_BASE_URL ?? '').trim().toLowerCase();
  if (base.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
}
