import {
  Box,
  Button,
  ContextView,
  TextField,
  Icon,
  Banner,
  Spinner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect } from 'react';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';

const SettingsView = ({ userContext, oauthContext }: ExtensionContextValue) => {
  const [setupSubdomain, setSetupSubdomain] = useState('');
  const [clientId, setClientId] = useState('');

  // Use OAuth hook
  const {
    isConnected,
    isLoading,
    error: oauthError,
    authUrl,
    subdomain,
    initializeOAuth,
    disconnect,
  } = useZendeskOAuth({
    oauthContext,
    userId: userContext?.id || '',
  });

  // Handle OAuth setup
  const handleStartSetup = async () => {
    if (!setupSubdomain || !clientId) {
      return;
    }
    
    await initializeOAuth({
      subdomain: setupSubdomain,
      clientId,
    });
  };

  if (isLoading) {
    return (
      <ContextView title="Zendesk Settings">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Loading...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Connected state
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
              You're connected to <strong>{subdomain}.zendesk.com</strong>
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
              Disconnect
            </Button>
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Not connected state
  return (
    <ContextView title="Zendesk Settings">
      <Box css={{ stack: 'y', gapY: 'large', padding: 'medium' }}>
        {oauthError && (
          <Banner
            type="critical"
            title="Connection Error"
            description={oauthError}
          />
        )}

        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ font: 'heading', fontWeight: 'semibold' }}>
            Connect to Zendesk
          </Box>
          <Box css={{ color: 'secondary', font: 'caption' }}>
            Sign in with your Zendesk account to view customer support data.
          </Box>
        </Box>

        {authUrl ? (
          <Box css={{ stack: 'y', gapY: 'medium' }}>
            <Banner
              type="info"
              title="Ready to Connect"
              description="Click the button below to sign in with your Zendesk account."
            />
            <Button type="primary" href={authUrl}>
              <Icon name="external" />
              Sign in with Zendesk
            </Button>
          </Box>
        ) : (
          <Box css={{ stack: 'y', gapY: 'medium' }}>
            <Banner
              type="info"
              title="OAuth Setup Required"
              description="First, create an OAuth client in Zendesk Admin Center."
            />

            <TextField
              label="Zendesk Subdomain"
              placeholder="yourcompany"
              description="The subdomain from your Zendesk URL (e.g., 'yourcompany' from yourcompany.zendesk.com)"
              value={setupSubdomain}
              onChange={(e) => setSetupSubdomain(e.target.value)}
            />

            <TextField
              label="OAuth Client ID"
              placeholder="your-oauth-client-id"
              description="Found in Zendesk Admin > Apps and integrations > APIs > Zendesk API > OAuth Clients"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />

            <Button
              type="primary"
              onPress={handleStartSetup}
              disabled={!setupSubdomain || !clientId}
            >
              Continue to Sign In
            </Button>
          </Box>
        )}

        <Box css={{ stack: 'y', gapY: 'small', marginTop: 'large' }}>
          <Box css={{ font: 'subheading', fontWeight: 'semibold' }}>
            How to set up OAuth
          </Box>
          <Box css={{ color: 'secondary', font: 'caption', stack: 'y', gapY: 'xsmall' }}>
            <Box>1. Log in to your Zendesk Admin Center</Box>
            <Box>2. Go to Apps and integrations → APIs → Zendesk API</Box>
            <Box>3. Click "OAuth Clients" tab, then "Add OAuth client"</Box>
            <Box>4. Set the Redirect URL to: https://dashboard.stripe.com/apps-oauth/com.example.zendesk-connector</Box>
            <Box>5. Copy the Client ID and paste it above</Box>
          </Box>
          <Button
            href="https://developer.zendesk.com/documentation/api-basics/authentication/using-oauth-to-authenticate-zendesk-api-requests-in-a-web-app/"
            type="secondary"
          >
            <Icon name="external" />
            OAuth Setup Guide
          </Button>
        </Box>
      </Box>
    </ContextView>
  );
};

export default SettingsView;
