import {
  Box,
  Button,
  ContextView,
  TextField,
  Icon,
  Banner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect } from 'react';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

// Create Stripe client for fetching app secrets
const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

const SettingsView = ({ userContext, environment }: ExtensionContextValue) => {
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        // Try to get existing secrets
        const secrets = await stripe.apps.secrets.list({
          scope: { type: 'account' },
          limit: 10,
        });
        
        const subdomainSecret = secrets.data.find(s => s.name === 'zendesk_subdomain');
        const emailSecret = secrets.data.find(s => s.name === 'zendesk_email');
        
        if (subdomainSecret?.payload) {
          setSubdomain(subdomainSecret.payload);
        }
        if (emailSecret?.payload) {
          setEmail(emailSecret.payload);
        }
        // Don't load API token for security - just show placeholder if it exists
        const tokenSecret = secrets.data.find(s => s.name === 'zendesk_api_token');
        if (tokenSecret) {
          setApiToken('••••••••••••••••');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!subdomain || !email || !apiToken) {
      setError('All fields are required');
      return;
    }

    // Don't save if token is just the placeholder
    if (apiToken === '••••••••••••••••') {
      setError('Please enter your API token');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Save each secret
      await stripe.apps.secrets.create({
        name: 'zendesk_subdomain',
        payload: subdomain,
        scope: { type: 'account' },
      });

      await stripe.apps.secrets.create({
        name: 'zendesk_email',
        payload: email,
        scope: { type: 'account' },
      });

      await stripe.apps.secrets.create({
        name: 'zendesk_api_token',
        payload: apiToken,
        scope: { type: 'account' },
      });

      setSuccess(true);
      setApiToken('••••••••••••••••'); // Hide token after save
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    setError(null);

    try {
      await stripe.apps.secrets.deleteWhere({
        name: 'zendesk_subdomain',
        scope: { type: 'account' },
      });
      await stripe.apps.secrets.deleteWhere({
        name: 'zendesk_email',
        scope: { type: 'account' },
      });
      await stripe.apps.secrets.deleteWhere({
        name: 'zendesk_api_token',
        scope: { type: 'account' },
      });

      setSubdomain('');
      setEmail('');
      setApiToken('');
      setSuccess(false);
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError('Failed to disconnect. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ContextView title="Zendesk Settings">
        <Box css={{ padding: 'medium', color: 'secondary' }}>
          Loading settings...
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView title="Zendesk Settings">
      <Box css={{ stack: 'y', gapY: 'large', padding: 'medium' }}>
        {success && (
          <Banner
            type="default"
            title="Settings saved"
            description="Your Zendesk credentials have been securely stored."
          />
        )}

        {error && (
          <Banner
            type="critical"
            title="Error"
            description={error}
          />
        )}

        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ font: 'heading', fontWeight: 'semibold' }}>
            Connect to Zendesk
          </Box>
          <Box css={{ color: 'secondary', font: 'caption' }}>
            Enter your Zendesk API credentials to view customer support data.
          </Box>
        </Box>

        <Box css={{ stack: 'y', gapY: 'medium' }}>
          <TextField
            label="Zendesk Subdomain"
            placeholder="yourcompany"
            description="The subdomain from your Zendesk URL (e.g., 'yourcompany' from yourcompany.zendesk.com)"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
          />

          <TextField
            label="Email Address"
            placeholder="admin@yourcompany.com"
            description="The email address associated with your Zendesk account"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="API Token"
            placeholder="Enter your Zendesk API token"
            description="Generate an API token in Zendesk Admin > Apps and integrations > APIs > Zendesk API"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
        </Box>

        <Box css={{ stack: 'x', gapX: 'small' }}>
          <Button
            type="primary"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>

          {(subdomain || email || apiToken) && (
            <Button
              type="destructive"
              onPress={handleDisconnect}
              disabled={saving}
            >
              Disconnect
            </Button>
          )}
        </Box>

        <Box css={{ stack: 'y', gapY: 'small', marginTop: 'large' }}>
          <Box css={{ font: 'subheading', fontWeight: 'semibold' }}>
            How to get your API token
          </Box>
          <Box css={{ color: 'secondary', font: 'caption', stack: 'y', gapY: 'xsmall' }}>
            <Box>1. Log in to your Zendesk Admin Center</Box>
            <Box>2. Go to Apps and integrations → APIs → Zendesk API</Box>
            <Box>3. Click "Add API token"</Box>
            <Box>4. Copy the token and paste it above</Box>
          </Box>
          <Button
            href="https://support.zendesk.com/hc/en-us/articles/4408889192858-Generating-a-new-API-token"
            type="secondary"
          >
            <Icon name="external" />
            Learn more
          </Button>
        </Box>
      </Box>
    </ContextView>
  );
};

export default SettingsView;
