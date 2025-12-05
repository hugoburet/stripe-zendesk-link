import {
  Box,
  Button,
  ContextView,
  TextField,
  Icon,
  Banner,
  Spinner,
  Divider,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect, useCallback } from 'react';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';

// Demo mode flag - set to false for production
const DEMO_MODE = true;

// Edge function URL
const SUPABASE_URL = 'https://zsjcivwjghcroaoofnfr.supabase.co';

const SettingsView = ({ userContext, oauthContext }: ExtensionContextValue) => {
  // Email auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Zendesk state
  const [inputSubdomain, setInputSubdomain] = useState('');

  // Use OAuth hook
  const {
    isConnected,
    isLoading: oauthLoading,
    error: oauthError,
    subdomain,
    initiateLogin,
    disconnect,
  } = useZendeskOAuth({
    oauthContext,
    userId: userContext?.id || '',
  });

  // Check for existing auth session on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('zendesk_connector_user_id');
    const storedEmail = localStorage.getItem('zendesk_connector_email');
    console.log('[ZendeskConnector] Settings - Auth check - userId:', storedUserId, 'email:', storedEmail);
    
    // DEBUG: Force show welcome screen by clearing any existing auth
    // Remove these lines after testing:
    // localStorage.removeItem('zendesk_connector_user_id');
    // localStorage.removeItem('zendesk_connector_email');
    
    const hasValidAuth = !!(storedUserId && storedUserId.length > 0 && storedEmail && storedEmail.length > 0);
    console.log('[ZendeskConnector] hasValidAuth:', hasValidAuth);
    setIsAuthenticated(hasValidAuth);
    setAuthLoading(false);
  }, []);

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setAuthSubmitting(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUserId = `demo_user_${Date.now()}`;
        localStorage.setItem('zendesk_connector_user_id', mockUserId);
        localStorage.setItem('zendesk_connector_email', email);
        setAuthSuccess(isSignUp ? 'Account created!' : 'Login successful!');
        setTimeout(() => setIsAuthenticated(true), 1000);
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-app-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSignUp ? 'signup' : 'login',
          email,
          password,
          stripeUserId: userContext?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('zendesk_connector_user_id', data.userId);
      localStorage.setItem('zendesk_connector_email', email);
      setAuthSuccess(data.message || (isSignUp ? 'Account created!' : 'Login successful!'));
      setTimeout(() => setIsAuthenticated(true), 1000);
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = useCallback(() => {
    console.log('[ZendeskConnector] Logging out');
    localStorage.removeItem('zendesk_connector_user_id');
    localStorage.removeItem('zendesk_connector_email');
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setAuthError(null);
    setAuthSuccess(null);
    disconnect();
  }, [disconnect]);

  const handleZendeskLogin = () => {
    if (inputSubdomain.trim()) {
      initiateLogin(inputSubdomain.trim());
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <ContextView title="Zendesk Settings">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>Loading...</Box>
        </Box>
      </ContextView>
    );
  }

  // Step 1: Email authentication (Welcome screen)
  if (!isAuthenticated) {
    return (
      <ContextView title="Zendesk Connector">
        <Box css={{ padding: 'large', stack: 'y', gapY: 'large' }}>
          {/* App Introduction */}
          <Box css={{ stack: 'y', gapY: 'small', textAlign: 'center' }}>
            <Box css={{ alignX: 'center' }}>
              <Icon name="settings" size="large" />
            </Box>
            <Box css={{ font: 'heading', fontWeight: 'bold' }}>
              Stripe + Zendesk Integration
            </Box>
            <Box css={{ color: 'secondary', font: 'body' }}>
              View your Zendesk customer profiles and support tickets directly in Stripe. 
              Connect your accounts to see customer context alongside payment data.
            </Box>
          </Box>

          <Divider />

          {/* Auth Form */}
          <Box css={{ stack: 'y', gapY: 'medium' }}>
            <Box css={{ font: 'subheading', fontWeight: 'semibold', textAlign: 'center' }}>
              {isSignUp ? 'Create your account' : 'Sign in to continue'}
            </Box>

            {authError && (
              <Banner type="critical" title="Error" description={authError} />
            )}

            {authSuccess && (
              <Banner type="positive" title="Success" description={authSuccess} />
            )}

            <TextField
              label="Email"
              placeholder="you@company.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authSubmitting}
            />

            <TextField
              label="Password"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={authSubmitting}
            />

            <Button
              type="primary"
              onPress={handleAuthSubmit}
              disabled={authSubmitting || !email.trim() || !password.trim()}
            >
              {authSubmitting ? <Spinner size="small" /> : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>

            <Box css={{ textAlign: 'center' }}>
              <Button
                type="secondary"
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                disabled={authSubmitting}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </Box>
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Loading Zendesk connection status
  if (oauthLoading) {
    return (
      <ContextView title="Zendesk Settings">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Checking Zendesk connection...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Step 3: Connected state
  if (isConnected) {
    return (
      <ContextView 
        title="Zendesk Settings"
        actions={
          <Button type="secondary" onPress={handleLogout}>
            Sign Out
          </Button>
        }
      >
        <Box css={{ stack: 'y', gapY: 'large', padding: 'medium' }}>
          <Banner
            type="default"
            title="Connected to Zendesk"
            description={`Your Zendesk account (${subdomain}.zendesk.com) is connected.`}
          />

          <Box css={{ stack: 'y', gapY: 'small' }}>
            <Box css={{ font: 'heading', fontWeight: 'semibold' }}>
              Connection Status
            </Box>
            <Box css={{ color: 'secondary' }}>
              Connected to {subdomain}.zendesk.com
            </Box>
          </Box>

          <Box css={{ stack: 'x', gapX: 'small' }}>
            <Button
              href={`https://${subdomain}.zendesk.com`}
              type="secondary"
            >
              <Icon name="external" />
              Open Zendesk
            </Button>
            <Button
              type="destructive"
              onPress={disconnect}
            >
              Disconnect Zendesk
            </Button>
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Step 2: Zendesk connection
  return (
    <ContextView 
      title="Connect Zendesk"
      actions={
        <Button type="destructive" onPress={handleLogout}>
          Reset & Sign Out
        </Button>
      }
    >
      <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium', alignX: 'center' }}>
        {oauthError && (
          <Banner type="critical" title="Connection Error" description={oauthError} />
        )}
        
        <Banner 
          type="default" 
          title="Logged in" 
          description={`Signed in as: ${localStorage.getItem('zendesk_connector_email') || 'unknown'}`} 
        />
        
        <Box css={{ textAlign: 'center' }}>
          <Icon name="settings" size="large" />
        </Box>
        <Box css={{ font: 'heading', fontWeight: 'semibold', textAlign: 'center' }}>
          Connect to Zendesk
        </Box>
        <Box css={{ color: 'secondary', textAlign: 'center' }}>
          Sign in with your Zendesk account to view customer support data.
        </Box>
        
        <Box css={{ width: 'fill' }}>
          <TextField
            label="Zendesk subdomain"
            placeholder="yourcompany"
            description="From yourcompany.zendesk.com"
            value={inputSubdomain}
            onChange={(e) => setInputSubdomain(e.target.value)}
          />
        </Box>

        <Button 
          type="primary" 
          onPress={handleZendeskLogin}
          disabled={!inputSubdomain.trim()}
        >
          <Icon name="external" />
          Sign in with Zendesk
        </Button>
      </Box>
    </ContextView>
  );
};

export default SettingsView;
