// Exchanges a Google OAuth authorization code for access + refresh tokens.
// Stores the refresh token in an HttpOnly cookie (never exposed to JS).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let code, redirect_uri;
  try {
    ({ code, redirect_uri } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const params = new URLSearchParams({
    code,
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri,
    grant_type:    'authorization_code',
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params,
  });

  const data = await resp.json();
  if (!resp.ok) {
    return { statusCode: 400, body: JSON.stringify({ error: data.error_description || 'Token exchange failed' }) };
  }

  // Refresh token lives in a secure HttpOnly cookie — JS can never read it
  const cookieMaxAge = 400 * 24 * 60 * 60; // 400 days (browser max)
  const cookie = `g_refresh=${data.refresh_token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${cookieMaxAge}; Path=/`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie':   cookie,
    },
    body: JSON.stringify({
      access_token: data.access_token,
      expires_in:   data.expires_in,
    }),
  };
};
