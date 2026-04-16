/**
 * Fires a no-auth, no-credentials GET to /api/health as early as possible in
 * the page lifecycle. On Render Free this nudges the container awake so by the
 * time React mounts and calls /snapshot, the backend is already cold-booted.
 *
 * Uses fetch + keepalive + no-cors so it doesn't block, doesn't need CORS
 * headers to succeed, and doesn't trigger error handlers if it fails.
 */
const base = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  : '';

if (base) {
  try {
    fetch(`${base}/api/health`, {
      method: 'GET',
      mode: 'no-cors',
      keepalive: true,
      cache: 'no-store',
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
