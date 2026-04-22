// Uses the HttpOnly refresh token cookie to silently get a new access token.
// Called on every app open — the browser sends the cookie automatically.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  // Parse refresh token from cookie header
  const cookies = Object.fromEntries(
    (event.headers.cookie || '').split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const refreshToken = cookies.g_refresh;

  if (!refreshToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not connected' }) };
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type:    'refresh_token',
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params,
  });

  const data = await resp.json();
  if (!resp.ok) {
    // Refresh token revoked or expired — clear the cookie
    return {
      statusCode: 401,
      headers: { 'Set-Cookie': 'g_refresh=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/' },
      body: JSON.stringify({ error: data.error_description || 'Refresh failed' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: data.access_token,
      expires_in:   data.expires_in,
    }),
  };
};
