import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const ZENDESK_CLIENT_ID = 'zdg-zendeskgpt';

const ZendeskAuth = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'authorizing' | 'exchanging' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const stripeUserId = searchParams.get('stripe_user');
  const subdomain = searchParams.get('subdomain');
  const email = searchParams.get('email');
  const code = searchParams.get('code');

  useEffect(() => {
    const handleAuth = async () => {
      // If we have a code, we're in the callback phase
      if (code && stripeUserId && subdomain) {
        setStatus('exchanging');
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zendesk-external-auth`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                subdomain,
                stripeUserId,
                email,
                redirectUri: `${window.location.origin}/zendesk-auth`,
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to complete authentication');
          }

          setStatus('success');
        } catch (err: any) {
          setError(err.message);
          setStatus('error');
        }
        return;
      }

      // Initial load - redirect to Zendesk OAuth
      if (stripeUserId && subdomain) {
        setStatus('authorizing');
        
        const state = JSON.stringify({ stripeUserId, subdomain, email });
        const encodedState = btoa(state);
        
        const authUrl = new URL(`https://${subdomain}.zendesk.com/oauth/authorizations/new`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', ZENDESK_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', `${window.location.origin}/zendesk-auth`);
        authUrl.searchParams.set('scope', 'read users:read tickets:read');
        authUrl.searchParams.set('state', encodedState);

        window.location.href = authUrl.toString();
        return;
      }

      // Handle callback with state
      const stateParam = searchParams.get('state');
      if (code && stateParam) {
        try {
          const decodedState = JSON.parse(atob(stateParam));
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('stripe_user', decodedState.stripeUserId);
          newUrl.searchParams.set('subdomain', decodedState.subdomain);
          if (decodedState.email) {
            newUrl.searchParams.set('email', decodedState.email);
          }
          window.location.href = newUrl.toString();
        } catch {
          setError('Invalid state parameter');
          setStatus('error');
        }
        return;
      }

      setError('Missing required parameters');
      setStatus('error');
    };

    handleAuth();
  }, [code, stripeUserId, subdomain, email, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </>
        )}
        
        {status === 'authorizing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Redirecting to Zendesk...</p>
          </>
        )}
        
        {status === 'exchanging' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Completing authentication...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-xl font-semibold mb-2">Connected to Zendesk!</h1>
            <p className="text-muted-foreground mb-4">
              You can now close this tab and return to Stripe.
            </p>
            <p className="text-sm text-muted-foreground">
              Refresh your Stripe dashboard to see the connection.
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✕</div>
            <h1 className="text-xl font-semibold mb-2">Authentication Failed</h1>
            <p className="text-muted-foreground">{error}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ZendeskAuth;
