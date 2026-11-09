/**
 * The external origin (scheme + host, no path) a redirect should use.
 *
 * Next.js builds `request.url` from the server's bind address, which behind
 * the Caddy reverse proxy is `https://0.0.0.0:3000` rather than the public
 * origin. Caddy forwards the public scheme and host in `x-forwarded-proto` and
 * `x-forwarded-host`; when both are present we prefer them, otherwise we fall
 * back to `request.url` (the direct-access and test path).
 */
export function externalOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host");
  if (proto && host) {
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
