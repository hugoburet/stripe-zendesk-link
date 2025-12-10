import {
  Box,
  Button,
  ContextView,
  TextField,
  Icon,
  Banner,
  Spinner,
  Divider,
  Link,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState } from 'react';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';

const SettingsView = ({ userContext, environment, oauthContext }: ExtensionContextValue) => {
  // Form state
  const [inputSubdomain, setInputSubdomain] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);

  // Use Stripe's user ID directly - no separate auth needed
  const stripeUserId = userContext?.id || '';
  const mode = environment?.mode || 'test';

  // Use OAuth hook
  const {
    isConnected,
    isLoading: oauthLoading,
    error: oauthError,
    subdomain,
    userEmail,
    initiateLogin,
    disconnect,
  } = useZendeskOAuth({
    oauthContext,
    userId: stripeUserId,
    mode,
  });

  const handleZendeskLogin = async () => {
    // Prevent duplicate calls
    if (authUrl || isInitiating) {
      console.log('[Settings] Skipping - already have authUrl or initiating');
      return;
    }
    
    if (inputSubdomain.trim() && inputEmail.trim()) {
      setIsInitiating(true);
      try {
        const url = await initiateLogin(inputSubdomain.trim(), inputEmail.trim());
        if (url) {
          console.log('[Settings] Auth URL received:', url.substring(0, 50) + '...');
          setAuthUrl(url);
        }
      } finally {
        setIsInitiating(false);
      }
    }
  };

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

  // Connected state - show connection details
  if (isConnected) {
    return (
      <ContextView title="Zendesk Settings">
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
            {userEmail && (
              <Box css={{ color: 'secondary' }}>
                Email: {userEmail}
              </Box>
            )}
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

  // Not connected - show welcome and connection form
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

        {/* Zendesk Connection Form */}
        <Box css={{ stack: 'y', gapY: 'medium' }}>
          {oauthError && (
            <Banner type="critical" title="Connection Error" description={oauthError} />
          )}

          <Box css={{ font: 'subheading', fontWeight: 'semibold', textAlign: 'center' }}>
            Connect to Zendesk
          </Box>
          
          <Box css={{ color: 'secondary', textAlign: 'center' }}>
            Sign in with your Zendesk account to view customer support data.
          </Box>
          
          <TextField
            label="Your email"
            placeholder="you@company.com"
            description="We'll use this to keep you updated"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
          />

          <TextField
            label="Zendesk subdomain"
            placeholder="yourcompany"
            description="From yourcompany.zendesk.com"
            value={inputSubdomain}
            onChange={(e) => setInputSubdomain(e.target.value)}
          />

          {/* Two-step: first prepare OAuth, then redirect via Button href */}
          {!authUrl ? (
            <Button 
              type="primary" 
              onPress={handleZendeskLogin}
              disabled={!inputSubdomain.trim() || !inputEmail.trim() || isInitiating}
            >
              {isInitiating ? 'Preparing...' : 'Prepare Zendesk Login'}
            </Button>
          ) : (
            <Box css={{ stack: 'y', gapY: 'small' }}>
              <Banner 
                type="default" 
                title="Ready to connect" 
                description="Click below to sign in with Zendesk"
              />
              <Link href={authUrl} external>
                <Button type="primary">
                  <Icon name="external" />
                  Sign in with Zendesk
                </Button>
              </Link>
            </Box>
          )}
        </Box>
      </Box>
    </ContextView>
  );
};

export default SettingsView;
