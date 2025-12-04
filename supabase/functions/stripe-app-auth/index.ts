import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthRequest {
  action: "signup" | "login" | "check";
  email?: string;
  password?: string;
  stripeUserId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, password, stripeUserId }: AuthRequest = await req.json();
    console.log(`[stripe-app-auth] Action: ${action}, Email: ${email}, StripeUserId: ${stripeUserId}`);

    if (action === "signup") {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        console.error("[stripe-app-auth] Signup error:", authError);
        // Check if user already exists
        if (authError.message?.includes("already")) {
          return new Response(
            JSON.stringify({ error: "An account with this email already exists. Please sign in." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("[stripe-app-auth] User created:", authData.user?.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: authData.user?.id,
          message: "Account created successfully" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "login") {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Use service role to verify credentials
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error("[stripe-app-auth] User lookup error:", userError);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const user = userData.users.find(u => u.email === email);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify password using signInWithPassword (need anon client for this)
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[stripe-app-auth] Login error:", signInError);
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("[stripe-app-auth] Login successful:", signInData.user?.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: signInData.user?.id,
          message: "Login successful" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[stripe-app-auth] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
