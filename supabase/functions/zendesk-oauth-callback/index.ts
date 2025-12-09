import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OAuthRequest {
  code: string;
  verifier: string;
  subdomain: string;
  stripeUserId: string;
  clientId: string;
  redirectUri: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, verifier, subdomain, stripeUserId, clientId, redirectUri }: OAuthRequest = await req.json();
    
    console.log(`[zendesk-oauth] Processing OAuth for Stripe user: ${stripeUserId}, subdomain: ${subdomain}`);

    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[zendesk-oauth] Token exchange failed:', errorData);
      return new Response(
        JSON.stringify({ error: `Token exchange failed: ${errorData}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('[zendesk-oauth] Token exchange successful');

    // Step 2: Fetch user info from Zendesk to get email
    const userResponse = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let userEmail = null;
    let userName = null;

    if (userResponse.ok) {
      const userData = await userResponse.json();
      userEmail = userData.user?.email;
      userName = userData.user?.name;
      console.log('[zendesk-oauth] Fetched Zendesk user:', userEmail, userName);
    } else {
      console.warn('[zendesk-oauth] Could not fetch user info:', await userResponse.text());
    }

    // Step 3: Store/update user profile in database
    if (userEmail) {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: stripeUserId,
          email: userEmail,
          zendesk_connected: true,
          zendesk_subdomain: subdomain,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('[zendesk-oauth] Failed to upsert profile:', upsertError);
        // Don't fail the whole request - token exchange was successful
      } else {
        console.log('[zendesk-oauth] Profile saved for:', userEmail);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        accessToken,
        email: userEmail,
        name: userName,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[zendesk-oauth] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
