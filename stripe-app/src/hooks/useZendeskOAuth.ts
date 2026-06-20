import { useState, useEffect, useCallback, useRef } from 'react';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

const CLIENT_ID = 'zdg-appstreeinc';
const SUPABASE_URL = 'https://gbtzgszldsarfwzcqoiz.supabase.co';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/zendesk-oauth-callback`;

function b64url(arr: Uint8Array): string {
  return btoa(Array.from(arr, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function findSecret(name: string): Promise<string | null> {
  try {
    const s = await stripe.apps.secrets.find({ name, scope: { type: 'account' }, expand: ['payload'] });
    return s.payload ?? null;
  } catch {
    return null;
  }
}

async function setSecret(name: string, payload: string) {
  await stripe.apps.secrets.create({ name, payload, scope: { type: 'account' } });
}

async function delSecret(name: string) {
  await stripe.apps.secrets.deleteWhere({ name, scope: { type: 'account' } }).catch(() => {});
}

export interface ZendeskOAuth {
  isConnected: boolean;
  isLoading: boolean;
  isWaiting: boolean;
  sessionExpired: boolean;
  subdomain: string | null;
  accessToken: string | null;
  error: string | null;
  buildAuthUrl: (subdomain: string) => Promise<{ url: string } | null>;
  onLinkPress: () => void;
  cancelWaiting: () => void;
  disconnect: () => Promise<void>;
  markSessionExpired: () => void;
}

export function useZendeskOAuth(): ZendeskOAuth {
  const [isConnected, setConnected] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isWaiting, setWaiting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<string | null>(null);

  // On mount: restore existing connection from Secret Store
  useEffect(() => {
    (async () => {
      const [tok, sub] = await Promise.all([
        findSecret('zendesk_access_token'),
        findSecret('zendesk_subdomain'),
      ]);
      if (tok && sub) {
        setToken(tok); setSubdomain(sub); setConnected(true);
      }
      setLoading(false);
    })();
  }, []);

  // Poll for tokens once the user has clicked through to the OAuth window
  useEffect(() => {
    if (!isWaiting) return;
    const pollState = stateRef.current;
    if (!pollState) return;

    console.log('[useZendeskOAuth] Starting poll with state:', pollState.substring(0, 20));

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/zendesk-oauth-callback/poll?state=${encodeURIComponent(pollState)}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        const data = await response.json();

        if (data.accessToken) {
          console.log('[useZendeskOAuth] Poll success, got tokens for subdomain:', data.subdomain);
          clearInterval(pollInterval);
          setLoading(true);
          setWaiting(false);
          try {
            await setSecret('zendesk_access_token', data.accessToken);
            await setSecret('zendesk_subdomain', data.subdomain);
            if (data.refreshToken) await setSecret('zendesk_refresh_token', data.refreshToken);
            setToken(data.accessToken);
            setSubdomain(data.subdomain);
            setConnected(true);
          } catch {
            setError('Failed to save credentials. Please try again.');
          } finally {
            setLoading(false);
          }
        } else if (data.expired) {
          console.log('[useZendeskOAuth] Session expired');
          clearInterval(pollInterval);
          setError('Authorization session expired. Please try again.');
          setWaiting(false);
        }
      } catch (err) {
        console.error('[useZendeskOAuth] Poll error:', err);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [isWaiting]);

  const buildAuthUrl = useCallback(async (sub: string): Promise<{ url: string } | null> => {
    sub = sub.trim().toLowerCase();
    if (!sub) return null;
    try {
      const ver = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ver));
      const chal = b64url(new Uint8Array(digest));
      const state = btoa(JSON.stringify({ subdomain: sub, code_verifier: ver }));
      stateRef.current = state;

      const url = new URL(`https://${sub}.zendesk.com/oauth/authorizations/new`);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', CLIENT_ID);
      url.searchParams.set('redirect_uri', REDIRECT_URI);
      url.searchParams.set('scope', 'read write');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', chal);
      url.searchParams.set('code_challenge_method', 'S256');
      return { url: url.toString() };
    } catch {
      return null;
    }
  }, []);

  const onLinkPress = useCallback(() => {
    setError(null);
    setSessionExpired(false);
    setWaiting(true);
    console.log('[OAuth] Link pressed — waiting for redirect back from OAuth tab');
  }, []);

  const disconnect = useCallback(async () => {
    setLoading(true);
    await Promise.all(
      ['zendesk_access_token', 'zendesk_refresh_token', 'zendesk_subdomain'].map(delSecret)
    );
    setConnected(false); setToken(null); setSubdomain(null);
    setSessionExpired(false); setError(null); setWaiting(false); setLoading(false);
  }, []);

  const cancelWaiting = useCallback(() => {
    setWaiting(false);
    setError(null);
    stateRef.current = null;
  }, []);

  const markSessionExpired = useCallback(() => {
    setConnected(false);
    setSessionExpired(true);
  }, []);

  return { isConnected, isLoading, isWaiting, sessionExpired, subdomain, accessToken, error, buildAuthUrl, onLinkPress, cancelWaiting, disconnect, markSessionExpired };
}
