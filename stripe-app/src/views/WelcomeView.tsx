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
import { useState, useEffect } from 'react';

// Demo mode flag - set to false for production
const DEMO_MODE = true;

// Edge function URL - update this with your actual Supabase project URL
const SUPABASE_URL = 'https://zsjcivwjghcroaoofnfr.supabase.co';

interface WelcomeViewProps extends ExtensionContextValue {
  onAuthenticated: (userId: string) => void;
}

const WelcomeView = ({ userContext, onAuthenticated }: WelcomeViewProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for existing session in localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('zendesk_connector_user_id');
    const storedEmail = localStorage.getItem('zendesk_connector_email');
    console.log('[ZendeskConnector] WelcomeView - storedUserId:', storedUserId, 'storedEmail:', storedEmail);
    // Only auto-authenticate if BOTH userId AND email are stored
    if (storedUserId && storedUserId.length > 0 && storedEmail && storedEmail.length > 0) {
      onAuthenticated(storedUserId);
    }
  }, [onAuthenticated]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (DEMO_MODE) {
        // Demo mode - simulate auth
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUserId = `demo_user_${Date.now()}`;
        localStorage.setItem('zendesk_connector_user_id', mockUserId);
        localStorage.setItem('zendesk_connector_email', email);
        setSuccess(isSignUp ? 'Account created! Redirecting...' : 'Login successful! Redirecting...');
        setTimeout(() => onAuthenticated(mockUserId), 1500);
        return;
      }

      // Real auth via edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-app-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isSignUp ? 'signup' : 'login',
          email,
          password,
          stripeUserId: userContext?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store user ID
      localStorage.setItem('zendesk_connector_user_id', data.userId);
      localStorage.setItem('zendesk_connector_email', email);
      
      setSuccess(data.message || (isSignUp ? 'Account created!' : 'Login successful!'));
      setTimeout(() => onAuthenticated(data.userId), 1500);

    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

          {error && (
            <Banner type="critical" title="Error" description={error} />
          )}

          {success && (
            <Banner type="positive" title="Success" description={success} />
          )}

          <TextField
            label="Email"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <TextField
            label="Password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          <Button
            type="primary"
            onPress={handleSubmit}
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? (
              <Spinner size="small" />
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </Button>

          <Box css={{ textAlign: 'center' }}>
            <Button
              type="secondary"
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              disabled={isLoading}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </Box>
        </Box>
      </Box>
    </ContextView>
  );
};

export default WelcomeView;
