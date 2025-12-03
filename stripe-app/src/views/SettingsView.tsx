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
import { useState } from 'react';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';

const SettingsView = ({ userContext, oauthContext }: ExtensionContextValue) => {
  const [inputSubdomain, setInputSubdomain] = useState('');

  // Use OAuth hook
  const {
    isConnected,
    isLoading,
    error: oauthError,
    subdomain,
    initiateLogin,
    disconnect,
  } = useZendeskOAuth({
    oauthContext,
    userId: userContext?.id || '',
  });

  const handleLogin = () => {
    if (inputSubdomain.trim()) {
      initiateLogin(inputSubdomain.trim());
    }
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

        <Box css={{ stack: 'y', gapY: 'medium' }}>
          <TextField
            label="Zendesk subdomain"
            placeholder="yourcompany"
            description="From yourcompany.zendesk.com"
            value={inputSubdomain}
            onChange={(e) => setInputSubdomain(e.target.value)}
          />

          <Button
            type="primary"
            onPress={handleLogin}
            disabled={!inputSubdomain.trim()}
          >
            <Icon name="external" />
            Sign in with Zendesk
          </Button>
        </Box>
      </Box>
    </ContextView>
  );
};

export default SettingsView;
