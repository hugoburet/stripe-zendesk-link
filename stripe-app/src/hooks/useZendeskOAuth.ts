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
const STRIPE_APP_ID = 'com.example.zendesk-connector';

interface UseZendeskOAuthProps {
  oauthContext?: {
    code?: string;
    verifier?: string;
    error?: string;
  };
  userId: string;
}

interface UseZendeskOAuthReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  subdomain: string | null;
  accessToken: string | null;
  disconnect: () => Promise<void>;
  initiateLogin: (subdomain: string) => Promise<void>;
}

export function useZendeskOAuth({ oauthContext, userId }: UseZendeskOAuthProps): UseZendeskOAuthReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const credentialsUsed = useRef(false);

  const code = oauthContext?.code;
  const verifier = oauthContext?.verifier;
  const oauthError = oauthContext?.error;

  // Check for existing connection and handle OAuth callback
  useEffect(() => {
    async function checkConnectionAndHandleCallback() {
      try {
        // First check if we already have tokens stored
        const secrets = await stripe.apps.secrets.list({
          scope: { type: 'account' },
          limit: 10,
        });

        const storedToken = secrets.data.find(s => s.name === 'zendesk_access_token')?.payload;
        const storedSubdomain = secrets.data.find(s => s.name === 'zendesk_subdomain')?.payload;

        if (storedToken && storedSubdomain) {
          setAccessToken(storedToken);
          setSubdomain(storedSubdomain);
          setIsConnected(true);
          setIsLoading(false);
          return;
        }

        // Handle OAuth callback - exchange code for token
        if (code && verifier && !credentialsUsed.current && storedSubdomain) {
          credentialsUsed.current = true;
          
          const tokenResponse = await fetch(`https://${storedSubdomain}.zendesk.com/oauth/tokens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              code,
              client_id: ZENDESK_CLIENT_ID,
              code_verifier: verifier,
              redirect_uri: `https://dashboard.stripe.com/apps-oauth/${STRIPE_APP_ID}`,
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${errorData}`);
          }

          const tokenData = await tokenResponse.json();
          
          // Store the access token
          await stripe.apps.secrets.create({
            name: 'zendesk_access_token',
            payload: tokenData.access_token,
            scope: { type: 'account' },
          });

          setAccessToken(tokenData.access_token);
          setSubdomain(storedSubdomain);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('OAuth error:', err);
        setError(err instanceof Error ? err.message : 'OAuth failed');
      } finally {
        setIsLoading(false);
      }
    }

    checkConnectionAndHandleCallback();
  }, [code, verifier]);

  // Handle OAuth errors from callback
  useEffect(() => {
    if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
    }
  }, [oauthError]);

  // Initiate OAuth login - just needs subdomain
  const initiateLogin = async (userSubdomain: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Store subdomain for later use in token exchange
      await stripe.apps.secrets.create({
        name: 'zendesk_subdomain',
        payload: userSubdomain,
        scope: { type: 'account' },
      });

      setSubdomain(userSubdomain);

      // Generate PKCE state and challenge
      const { state, challenge } = await createOAuthState();

      // Build authorization URL and redirect
      const redirectUri = encodeURIComponent(
        `https://dashboard.stripe.com/apps-oauth/${STRIPE_APP_ID}`
      );
      
      const authorizationUrl = `https://${userSubdomain}.zendesk.com/oauth/authorizations/new?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(ZENDESK_CLIENT_ID)}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${encodeURIComponent('read write')}&` +
        `state=${state}&` +
        `code_challenge=${challenge}&` +
        `code_challenge_method=S256`;

      // Redirect to Zendesk OAuth
      window.open(authorizationUrl, '_top');
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
      setError(err instanceof Error ? err.message : 'Failed to start login');
      setIsLoading(false);
    }
  };

  // Disconnect - remove stored tokens
  const disconnect = async () => {
    try {
      setIsLoading(true);
      
      const secretNames = ['zendesk_access_token', 'zendesk_subdomain'];
      
      for (const name of secretNames) {
        try {
          await stripe.apps.secrets.deleteWhere({
            name,
            scope: { type: 'account' },
          });
        } catch (err) {
          // Ignore errors for secrets that don't exist
        }
      }

      setIsConnected(false);
      setAccessToken(null);
      setSubdomain(null);
      credentialsUsed.current = false;
    } catch (err) {
      console.error('Failed to disconnect:', err);
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
    disconnect,
    initiateLogin,
  };
}
