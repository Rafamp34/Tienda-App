// Edge Function: password gate for the whole site.
//
// Runs on Netlify's edge, BEFORE any HTML/JS/data is sent to the visitor.
// The password is compared on the server (never shipped to the browser),
// and the session is a cookie signed with HMAC-SHA256 — a visitor cannot
// forge a valid cookie in devtools without knowing SITE_AUTH_SECRET.
//
// Required environment variables (set in Netlify dashboard, NOT in this
// file or in git):
//   SITE_PASSWORD     — the password staff will type in to enter
//   SITE_AUTH_SECRET  — a long random string used to sign sessions
//                        (e.g. generate one with: openssl rand -hex 32)

const COOKIE_NAME = 'tienda_auth';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function timingSafeEqual(a, b) {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }
  return result === 0;
}

async function hmac(secret, value) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
}

function loginPage({ error } = {}) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cuaderno de Tienda</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=IBM+Plex+Sans:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #EEEFE4; font-family: 'IBM Plex Sans', sans-serif; color: #21281F; padding: 16px; }
  .card { background: #fff; border: 1px solid #D8D9C9; border-radius: 12px; padding: 32px 28px; width: 320px; max-width: 100%; }
  .mark { width: 40px; height: 40px; border-radius: 10px; background: #21281F; color: #EEEFE4; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 18px; }
  h1 { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; margin: 0 0 4px; }
  p { font-size: 13px; color: #6B7266; margin: 0 0 20px; }
  input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #D8D9C9; font-size: 14px; box-sizing: border-box; margin-bottom: 12px; }
  button { width: 100%; padding: 10px; border-radius: 8px; border: none; background: #C98A2B; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
  .error { background: #B14B3C12; border: 1px solid #B14B3C33; color: #B14B3C; font-size: 12.5px; border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; }
</style></head>
<body>
  <form class="card" method="POST">
    <div class="mark">🧾</div>
    <h1>Cuaderno de Tienda</h1>
    <p>Introduce la contraseña para entrar.</p>
    ${error ? '<div class="error">Contraseña incorrecta.</div>' : ''}
    <input type="password" name="password" placeholder="Contraseña" autofocus required />
    <button type="submit">Entrar</button>
  </form>
</body></html>`;
}

export default async (request, context) => {
  const url = new URL(request.url);
  const password = Deno.env.get('SITE_PASSWORD');
  const secret = Deno.env.get('SITE_AUTH_SECRET');

  if (!password || !secret) {
    return new Response(
      'Acceso no configurado: faltan las variables de entorno SITE_PASSWORD y/o SITE_AUTH_SECRET en Netlify.',
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  // Logout: clear the cookie and send back to the login page.
  if (url.pathname === '/logout') {
    const headers = new Headers({ Location: '/' });
    headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 302, headers });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[COOKIE_NAME];

  if (token) {
    const [ts, sig] = token.split('.');
    if (ts && sig && Number(ts) <= Date.now() && Date.now() - Number(ts) < MAX_AGE_SECONDS * 1000) {
      const expected = await hmac(secret, ts);
      if (timingSafeEqual(sig, expected)) {
        return context.next();
      }
    }
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const entered = String(form.get('password') || '');
    if (timingSafeEqual(entered, password)) {
      const ts = String(Date.now());
      const sig = await hmac(secret, ts);
      const headers = new Headers({ Location: url.pathname });
      headers.append('Set-Cookie', `${COOKIE_NAME}=${ts}.${sig}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
      return new Response(null, { status: 302, headers });
    }
    return new Response(loginPage({ error: true }), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  return new Response(loginPage({}), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } });
};

export const config = { path: '/*' };
