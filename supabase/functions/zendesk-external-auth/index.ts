import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZENDESK_CLIENT_ID = 'zdg-zendeskgpt';
const ZENDESK_CLIENT_SECRET = Deno.env.get("ZENDESK_CLIENT_SECRET");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

interface AuthRequest {
  code: string;
  subdomain: string;
  stripeUserId: string;
  email?: string;
  redirectUri: string;
}

async function setStripeSecret(stripeUserId: string, name: string, payload: string) {
  const secretName = `zendesk_${name}`;
  
  // Try to set the secret, if it exists we need to delete first
  const response = await fetch('https://api.stripe.com/v1/apps/secrets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      name: secretName,
      payload: payload,
      'scope[type]': 'user',
      'scope[user]': stripeUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    // If secret already exists, delete and recreate
    if (error.error?.code === 'resource_already_exists') {
      console.log(`[zendesk-external-auth] Secret ${secretName} exists, deleting...`);
      
      const deleteResponse = await fetch('https://api.stripe.com/v1/apps/secrets/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: secretName,
          'scope[type]': 'user',
          'scope[user]': stripeUserId,
        }),
      });
      
      if (!deleteResponse.ok) {
        console.error('[zendesk-external-auth] Delete failed:', await deleteResponse.text());
      }
      
      // Recreate
      const retryResponse = await fetch('https://api.stripe.com/v1/apps/secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: secretName,
          payload: payload,
          'scope[type]': 'user',
          'scope[user]': stripeUserId,
        }),
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Failed to create secret after delete: ${await retryResponse.text()}`);
      }
    } else {
      throw new Error(`Failed to set secret: ${JSON.stringify(error)}`);
    }
  }
  
  console.log(`[zendesk-external-auth] Secret ${secretName} set successfully`);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ZENDESK_CLIENT_SECRET) {
      throw new Error("ZENDESK_CLIENT_SECRET not configured");
    }
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const { code, subdomain, stripeUserId, email, redirectUri }: AuthRequest = await req.json();
    
    console.log(`[zendesk-external-auth] Processing OAuth for Stripe user: ${stripeUserId}, subdomain: ${subdomain}`);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: ZENDESK_CLIENT_ID,
        client_secret: ZENDESK_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[zendesk-external-auth] Token exchange failed:', errorData);
      return new Response(
        JSON.stringify({ error: `Token exchange failed: ${errorData}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('[zendesk-external-auth] Token exchange successful');

    // Fetch user info from Zendesk
    const userResponse = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let zendeskEmail = email;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      zendeskEmail = userData.user?.email || email;
      console.log('[zendesk-external-auth] Fetched Zendesk user:', zendeskEmail);
    }

    // Store credentials in Stripe Secrets
    await setStripeSecret(stripeUserId, 'access_token', accessToken);
    await setStripeSecret(stripeUserId, 'subdomain', subdomain);
    if (zendeskEmail) {
      await setStripeSecret(stripeUserId, 'user_email', zendeskEmail);
    }

    console.log('[zendesk-external-auth] All secrets stored successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[zendesk-external-auth] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
