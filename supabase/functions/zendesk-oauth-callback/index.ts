import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ZENDESK_CLIENT_ID = 'zdg-appstreeinc';
const REDIRECT_URI = 'https://gbtzgszldsarfwzcqoiz.supabase.co/functions/v1/zendesk-oauth-callback';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}


function errorHtml(msg: string): Response {
  return new Response(
    `<!DOCTYPE html><html><head><title>Error</title></head><body style="font-family:sans-serif;padding:40px;text-align:center">
<h2>Connection failed</h2><p>${msg}</p><p>Return to Stripe and try again.</p>
</body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Route B — POST /refresh
  if (req.method === 'POST' && url.pathname.endsWith('/refresh')) {
    try {
      const { subdomain, refreshToken } = await req.json();
      if (!subdomain || !refreshToken) {
        return jsonResponse({ error: 'Missing subdomain or refreshToken' }, 400);
      }

      // PKCE public clients must NOT send client_secret (empty string breaks Zendesk auth).
      // Only include it if the env var is explicitly configured for a confidential client.
      const clientSecret = Deno.env.get('ZENDESK_CLIENT_SECRET');
      const refreshParams: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: ZENDESK_CLIENT_ID,
      };
      if (clientSecret) refreshParams.client_secret = clientSecret;

      const tokenRes = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(refreshParams),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('[zendesk-oauth] Refresh failed:', tokenRes.status, errorText);
        // Include Zendesk's error body in our response so the client can log it
        return jsonResponse({ error: `Refresh failed (${tokenRes.status})`, details: errorText }, 502);
      }

      const data = await tokenRes.json();
      console.log('[zendesk-oauth] Refresh successful — has_new_refresh:', !!data.refresh_token);
      return jsonResponse({ accessToken: data.access_token, refreshToken: data.refresh_token });
    } catch (err: any) {
      console.error('[zendesk-oauth] Refresh error:', err);
      return jsonResponse({ error: err.message ?? 'Internal error' }, 500);
    }
  }

  // Route C — GET /poll?state=...
  if (req.method === 'GET' && url.pathname.endsWith('/poll')) {
    const stateKey = url.searchParams.get('state');
    if (!stateKey) {
      return jsonResponse({ error: 'Missing state' }, 400);
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('zendesk_oauth_sessions')
        .select('*')
        .eq('state', stateKey)
        .maybeSingle();

      if (error) {
        console.error('[zendesk-oauth] Poll DB error:', error);
        return jsonResponse({ pending: true });
      }

      if (!data) {
        return jsonResponse({ pending: true });
      }

      if (new Date(data.expires_at) < new Date()) {
        console.log('[zendesk-oauth] Poll: session expired for state:', stateKey.substring(0, 20));
        await supabase.from('zendesk_oauth_sessions').delete().eq('state', stateKey);
        return jsonResponse({ expired: true });
      }

      // Found — delete row and return tokens
      await supabase.from('zendesk_oauth_sessions').delete().eq('state', stateKey);

      console.log('[zendesk-oauth] Poll response payload:', JSON.stringify({
        accessToken: !!data.access_token,
        refreshToken: !!data.refresh_token,
        subdomain: data.subdomain,
      }));

      return jsonResponse({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        subdomain: data.subdomain,
      });
    } catch (err: any) {
      console.error('[zendesk-oauth] Poll error:', err);
      return jsonResponse({ pending: true });
    }
  }

  // Route A — GET /zendesk-oauth-callback?code=...&state=...
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    console.error('[zendesk-oauth] OAuth error from Zendesk:', oauthError);
    return errorHtml(oauthError);
  }

  if (!code || !stateParam) {
    return errorHtml('Missing code or state parameter');
  }

  let subdomain: string;
  let code_verifier: string;
  try {
    const decoded = JSON.parse(atob(stateParam));
    subdomain = decoded.subdomain;
    code_verifier = decoded.code_verifier;
    if (!subdomain) throw new Error('Missing subdomain in state');
    if (!code_verifier) throw new Error('Missing code_verifier in state');
  } catch (e) {
    console.error('[zendesk-oauth] Failed to decode state:', e);
    return errorHtml('Invalid state parameter');
  }

  try {
    console.log('[zendesk-oauth] Incoming callback URL:', req.url);
    console.log('[zendesk-oauth] Token exchange redirect_uri:', REDIRECT_URI);
    console.log(`[zendesk-oauth] Exchanging code for token — subdomain: ${subdomain}`);
    console.log('[zendesk-oauth] client_id:', ZENDESK_CLIENT_ID);
    console.log('[zendesk-oauth] code_verifier length:', code_verifier.length);
    const tokenRes = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: ZENDESK_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier,
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error('[zendesk-oauth] Token exchange failed:', tokenRes.status, errorBody);
      return errorHtml(`Token exchange failed (${tokenRes.status}): ${errorBody}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      console.error('[zendesk-oauth] No access_token in response:', JSON.stringify(tokenData));
      return errorHtml('No access token returned');
    }

    console.log('[zendesk-oauth] Token exchange successful — storing session');
    const supabase = getSupabase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase.from('zendesk_oauth_sessions').upsert({
      state: stateParam,
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
      subdomain,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error('[zendesk-oauth] DB insert error:', dbError);
      return errorHtml('Failed to store session');
    }

    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        app: "zendesk_connector",
        stripe_account_id: null,
        event_type: "oauth_connected",
        metadata: { subdomain },
      }),
    }).catch(() => {});

    const appReturnUrl = Deno.env.get('STRIPE_APP_RETURN_URL') || 'about:blank';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appReturnUrl}?oauth_complete=true&state=${encodeURIComponent(stateParam)}`,
      },
    });

  } catch (err: any) {
    console.error('[zendesk-oauth] Unexpected error:', err);
    return errorHtml(err.message ?? 'Internal error');
  }
});
