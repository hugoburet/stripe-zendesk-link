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
import { useState } from 'react';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';

// External auth page URL - this is hosted on Lovable
const EXTERNAL_AUTH_URL = 'https://preview--zsjcivwjghcroaoofnfr.lovable.app/zendesk-auth';

const SettingsView = ({ userContext, environment, oauthContext }: ExtensionContextValue) => {
  // Form state
  const [inputSubdomain, setInputSubdomain] = useState('');
  const [inputEmail, setInputEmail] = useState('');

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
    disconnect,
    checkConnection,
  } = useZendeskOAuth({
    oauthContext,
    userId: stripeUserId,
    mode,
  });

  // Build the external auth URL with parameters
  const getAuthUrl = () => {
    const params = new URLSearchParams({
      stripe_user: stripeUserId,
      subdomain: inputSubdomain.trim(),
      email: inputEmail.trim(),
    });
    return `${EXTERNAL_AUTH_URL}?${params.toString()}`;
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

          {/* Direct link to external auth page */}
          <Button 
            type="primary" 
            href={getAuthUrl()}
            disabled={!inputSubdomain.trim() || !inputEmail.trim()}
          >
            <Icon name="external" />
            Connect to Zendesk
          </Button>
          
          <Button
            type="secondary"
            onPress={checkConnection}
          >
            Check Connection Status
          </Button>
        </Box>
      </Box>
    </ContextView>
  );
};

export default SettingsView;
