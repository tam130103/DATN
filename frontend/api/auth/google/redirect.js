const parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((accumulator, entry) => {
    const [name, ...rest] = entry.trim().split('=');
    if (!name || rest.length === 0) {
      return accumulator;
    }

    accumulator[name] = decodeURIComponent(rest.join('='));
    return accumulator;
  }, {});
};

const readBody = async (req) => {
  if (typeof req.body === 'string') {
    return Object.fromEntries(new URLSearchParams(req.body));
  }

  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return Object.fromEntries(new URLSearchParams(rawBody));
};

const getAppOrigin = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
};

const getBackendUrl = () =>
  (process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '');

const redirectTo = (res, location) => {
  res.statusCode = 303;
  res.setHeader('Location', location);
  res.end();
};

const redirectWithError = (req, res, message) => {
  const redirectUrl = new URL('/login', getAppOrigin(req));
  redirectUrl.searchParams.set('google_error', message);
  redirectTo(res, redirectUrl.toString());
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const body = await readBody(req);
  const credential = typeof body.credential === 'string' ? body.credential : '';
  const csrfBody = typeof body.g_csrf_token === 'string' ? body.g_csrf_token : '';
  const csrfCookie = parseCookies(req.headers.cookie).g_csrf_token;

  if (!csrfCookie || !csrfBody || csrfCookie !== csrfBody) {
    redirectWithError(req, res, 'Xac thuc Google khong hop le. Vui long thu lai.');
    return;
  }

  if (!credential) {
    redirectWithError(req, res, 'Khong nhan duoc thong tin dang nhap Google.');
    return;
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/api/v1/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: credential }),
    });

    const payload = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      const message = Array.isArray(payload?.message)
        ? payload.message[0]
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Dang nhap Google that bai.';

      redirectWithError(req, res, message);
      return;
    }

    const redirectUrl = new URL('/auth/google/callback', getAppOrigin(req));
    const fragment = new URLSearchParams({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }).toString();

    redirectTo(res, `${redirectUrl.toString()}#${fragment}`);
  } catch {
    redirectWithError(req, res, 'Khong the ket noi may chu dang nhap.');
  }
}
