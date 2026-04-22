// Revokes the Google token and clears the HttpOnly cookie.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const cookies = Object.fromEntries(
    (event.headers.cookie || '').split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const refreshToken = cookies.g_refresh;

  if (refreshToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshToken}`, { method: 'POST' });
    } catch {}
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie':   'g_refresh=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
    body: '{}',
  };
};
