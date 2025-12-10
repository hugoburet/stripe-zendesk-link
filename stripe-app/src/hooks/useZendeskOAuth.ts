import { useState, useEffect, useRef } from 'react';
import { createOAuthState } from '@stripe/ui-extension-sdk/oauth';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

// Configure your OAuth client ID here (created in Zendesk Admin Center)
const ZENDESK_CLIENT_ID = 'your-zendesk-oauth-client-id';
const STRIPE_APP_ID = 'com.example.invoicetemplate';
const EDGE_FUNCTION_URL = 'https://zsjcivwjghcroaoofnfr.functions.supabase.co/zendesk-oauth-callback';

// Demo mode flag - set to false for production
const DEMO_MODE = false;

interface UseZendeskOAuthProps {
  oauthContext?: {
    code?: string;
    verifier?: string;
    error?: string;
  };
  userId: string;
  mode: 'live' | 'test';
}

interface UseZendeskOAuthReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  subdomain: string | null;
  accessToken: string | null;
  userEmail: string | null;
  disconnect: () => Promise<void>;
  initiateLogin: (subdomain: string, email: string) => Promise<void>;
}

// Helper to get redirect URL based on mode
const getRedirectURL = (mode: 'live' | 'test') => 
  `https://dashboard.stripe.com/${mode === 'test' ? 'test/' : ''}apps-oauth/${STRIPE_APP_ID}`;

export function useZendeskOAuth({ oauthContext, userId, mode }: UseZendeskOAuthProps): UseZendeskOAuthReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const tokenExchangeAttempted = useRef(false);

  const code = oauthContext?.code;
  const verifier = oauthContext?.verifier;
  const oauthError = oauthContext?.error;

  // Check for existing connection on mount
  useEffect(() => {
    async function checkExistingConnection() {
      if (DEMO_MODE) {
        setIsLoading(false);
        return;
      }

      try {
        const secrets = await stripe.apps.secrets.list({
          scope: { type: 'account' },
          limit: 10,
        });

        const storedToken = secrets.data.find(s => s.name === 'zendesk_access_token')?.payload;
        const storedSubdomain = secrets.data.find(s => s.name === 'zendesk_subdomain')?.payload;
        const storedEmail = secrets.data.find(s => s.name === 'zendesk_user_email')?.payload;

        if (storedToken && storedSubdomain) {
          setAccessToken(storedToken);
          setSubdomain(storedSubdomain);
          setUserEmail(storedEmail || null);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingConnection();
  }, []);

  // Handle OAuth callback - exchange code for token
  useEffect(() => {
    async function handleOAuthCallback() {
      // Skip if no code/verifier or already attempted
      if (!code || !verifier || tokenExchangeAttempted.current || DEMO_MODE) {
        return;
      }

      tokenExchangeAttempted.current = true;
      setIsLoading(true);

      try {
        // Get stored subdomain from secrets
        const secrets = await stripe.apps.secrets.list({
          scope: { type: 'account' },
          limit: 10,
        });

        const storedSubdomain = secrets.data.find(s => s.name === 'zendesk_subdomain')?.payload;
        const storedEmail = secrets.data.find(s => s.name === 'zendesk_user_email')?.payload;

        if (!storedSubdomain) {
          throw new Error('Missing subdomain - please try connecting again');
        }

        console.log('[OAuth] Exchanging code for token...');

        // Exchange code for token via edge function
        const tokenResponse = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            verifier,
            subdomain: storedSubdomain,
            stripeUserId: userId,
            clientId: ZENDESK_CLIENT_ID,
            redirectUri: getRedirectURL(mode),
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('[OAuth] Token exchange successful');

        // Store access token in Stripe secrets
        await stripe.apps.secrets.create({
          name: 'zendesk_access_token',
          payload: tokenData.accessToken,
          scope: { type: 'account' },
        });

        setAccessToken(tokenData.accessToken);
        setSubdomain(storedSubdomain);
        setUserEmail(tokenData.email || storedEmail || null);
        setIsConnected(true);
      } catch (err) {
        console.error('[OAuth] Callback error:', err);
        setError(err instanceof Error ? err.message : 'OAuth callback failed');
        tokenExchangeAttempted.current = false;
      } finally {
        setIsLoading(false);
      }
    }

    handleOAuthCallback();
  }, [code, verifier, userId, mode]);

  // Handle OAuth errors
  useEffect(() => {
    if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
      setIsLoading(false);
    }
  }, [oauthError]);

  // Initiate OAuth login
  const initiateLogin = async (userSubdomain: string, email: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const trimmedSubdomain = userSubdomain?.trim();
      const trimmedEmail = email?.trim();

      if (!trimmedSubdomain) {
        throw new Error('Zendesk subdomain is required');
      }
      if (!trimmedEmail) {
        throw new Error('Email is required');
      }

      // Demo mode
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSubdomain(trimmedSubdomain);
        setUserEmail(trimmedEmail);
        setAccessToken('demo-token');
        setIsConnected(true);
        setIsLoading(false);
        return;
      }

      console.log('[OAuth] Storing subdomain and email...');

      // First, delete any existing secrets to avoid conflicts
      const secretNames = ['zendesk_subdomain', 'zendesk_user_email', 'zendesk_access_token'];
      for (const name of secretNames) {
        try {
          await stripe.apps.secrets.deleteWhere({
            name,
            scope: { type: 'account' },
          });
        } catch {
          // Ignore - secret may not exist
        }
      }

      // Store subdomain and email BEFORE redirect (required for callback)
      await stripe.apps.secrets.create({
        name: 'zendesk_subdomain',
        payload: trimmedSubdomain,
        scope: { type: 'account' },
      });

      await stripe.apps.secrets.create({
        name: 'zendesk_user_email',
        payload: trimmedEmail,
        scope: { type: 'account' },
      });

      console.log('[OAuth] Secrets stored, generating PKCE state...');

      // Generate PKCE state and challenge using Stripe's SDK
      const { state, challenge } = await createOAuthState();

      // Build Zendesk authorization URL
      const redirectUri = getRedirectURL(mode);
      const authorizationUrl = new URL(`https://${trimmedSubdomain}.zendesk.com/oauth/authorizations/new`);
      authorizationUrl.searchParams.set('response_type', 'code');
      authorizationUrl.searchParams.set('client_id', ZENDESK_CLIENT_ID);
      authorizationUrl.searchParams.set('redirect_uri', redirectUri);
      authorizationUrl.searchParams.set('scope', 'read write');
      authorizationUrl.searchParams.set('state', state);
      authorizationUrl.searchParams.set('code_challenge', challenge);
      authorizationUrl.searchParams.set('code_challenge_method', 'S256');

      console.log('[OAuth] Redirecting to Zendesk...');

      // Update local state
      setSubdomain(trimmedSubdomain);
      setUserEmail(trimmedEmail);

      // Redirect to Zendesk OAuth page
      window.open(authorizationUrl.toString(), '_top');

    } catch (err) {
      console.error('[OAuth] Login initiation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start login');
      setIsLoading(false);
    }
  };

  // Disconnect
  const disconnect = async () => {
    try {
      setIsLoading(true);

      if (DEMO_MODE) {
        setIsConnected(false);
        setAccessToken(null);
        setSubdomain(null);
        setUserEmail(null);
        setIsLoading(false);
        return;
      }

      const secretNames = ['zendesk_access_token', 'zendesk_subdomain', 'zendesk_user_email'];
      for (const name of secretNames) {
        try {
          await stripe.apps.secrets.deleteWhere({
            name,
            scope: { type: 'account' },
          });
        } catch {
          // Ignore
        }
      }

      setIsConnected(false);
      setAccessToken(null);
      setSubdomain(null);
      setUserEmail(null);
      tokenExchangeAttempted.current = false;
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    error,
    subdomain,
    accessToken,
    userEmail,
    disconnect,
    initiateLogin,
  };
}
