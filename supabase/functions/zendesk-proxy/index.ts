const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let payload: {
    subdomain: string;
    accessToken: string;
    path: string;
    method?: string;
    body?: unknown;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { subdomain, accessToken, path, method = 'GET', body } = payload;

  console.log('[zendesk-proxy] subdomain:', subdomain, '| token length:', accessToken?.length ?? 0, '| token prefix:', accessToken?.substring(0, 10));

  if (!subdomain || !accessToken || !path) {
    return jsonResponse({ error: 'Missing required fields: subdomain, accessToken, path' }, 400);
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const zendeskUrl = `https://${subdomain}.zendesk.com/api/v2/${cleanPath}`;

  console.log('[zendesk-proxy]', method, zendeskUrl);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const zendeskRes = await fetch(zendeskUrl, fetchOptions);
    const responseText = await zendeskRes.text();

    console.log('[zendesk-proxy] status:', zendeskRes.status);

    // Forward Zendesk's status code; ensure body is valid JSON
    let responseBody: string;
    try {
      JSON.parse(responseText);
      responseBody = responseText;
    } catch {
      responseBody = JSON.stringify({ error: responseText || `Zendesk returned ${zendeskRes.status}` });
    }

    if (zendeskRes.ok) {
      let eventType: string | null = null;
      if (method === 'POST' && cleanPath.startsWith('tickets')) {
        eventType = 'ticket_created';
      } else if (method === 'GET' && cleanPath.startsWith('tickets')) {
        eventType = 'ticket_lookup';
      } else if (method === 'GET' && cleanPath.startsWith('users')) {
        eventType = 'payment_viewed';
      }

      if (eventType) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            app: "zendesk_connector",
            stripe_account_id: null,
            event_type: eventType,
            metadata: { subdomain, path: cleanPath },
          }),
        }).catch(() => {});
      }
    }

    return new Response(responseBody, {
      status: zendeskRes.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[zendesk-proxy] fetch error:', err);
    return jsonResponse({ error: err.message ?? 'Failed to reach Zendesk' }, 502);
  }
});
