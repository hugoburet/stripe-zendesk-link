import {
  Box,
  Button,
  ContextView,
  Icon,
  Inline,
  Link,
  Spinner,
  Badge,
  FocusView,
  TextField,
  Banner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect } from 'react';
import { fetchZendeskCustomer, fetchZendeskTickets, checkZendeskConnection, getZendeskSubdomain } from '../api/zendesk';
import type { ZendeskCustomer, ZendeskTicket } from '../types';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

// Create Stripe client for saving secrets
const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

const CustomerDetailView = ({ userContext, environment }: ExtensionContextValue) => {
  const [zendeskCustomer, setZendeskCustomer] = useState<ZendeskCustomer | null>(null);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isZendeskConnected, setIsZendeskConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [zendeskSubdomain, setZendeskSubdomain] = useState<string | null>(null);
  
  // Settings form state
  const [showSettings, setShowSettings] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Get customer email directly from Stripe's objectContext
  const stripeCustomerEmail = environment?.objectContext?.email as string | undefined;

  // Check Zendesk connection status on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const connected = await checkZendeskConnection();
        setIsZendeskConnected(connected);
        if (connected) {
          const subdomain = await getZendeskSubdomain();
          setZendeskSubdomain(subdomain);
        }
      } catch (err) {
        console.error('Failed to check Zendesk connection:', err);
        setIsZendeskConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    }
    checkConnection();
  }, []);

  // Load Zendesk data when connected and we have email
  useEffect(() => {
    async function loadZendeskData() {
      if (!stripeCustomerEmail) {
        setError('No email found for this customer');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const customer = await fetchZendeskCustomer(stripeCustomerEmail);
        if (customer) {
          setZendeskCustomer(customer);
          const customerTickets = await fetchZendeskTickets(customer.id);
          setTickets(customerTickets);
        } else {
          setError('No Zendesk user found for this email');
        }
      } catch (err) {
        console.error('Failed to load Zendesk data:', err);
        setError('Failed to load Zendesk data');
      } finally {
        setLoading(false);
      }
    }

    if (isZendeskConnected && !checkingConnection) {
      loadZendeskData();
    }
  }, [stripeCustomerEmail, isZendeskConnected, checkingConnection]);

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!subdomain || !email || !apiToken) {
      setSettingsError('All fields are required');
      return;
    }

    setSaving(true);
    setSettingsError(null);

    try {
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

      setShowSettings(false);
      setIsZendeskConnected(true);
      setZendeskSubdomain(subdomain);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSettingsError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking connection
  if (checkingConnection) {
    return (
      <ContextView title="Zendesk">
        <Box css={{ padding: 'medium', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Checking connection...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Show connect prompt if Zendesk is not connected
  if (!isZendeskConnected) {
    return (
      <ContextView title="Zendesk">
        <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium', alignX: 'center' }}>
          <Box css={{ textAlign: 'center' }}>
            <Icon name="settings" size="large" />
          </Box>
          <Box css={{ font: 'heading', fontWeight: 'semibold', textAlign: 'center' }}>
            Connect to Zendesk
          </Box>
          <Box css={{ color: 'secondary', textAlign: 'center' }}>
            Configure your Zendesk API credentials to view customer support data.
          </Box>
          <Button
            type="primary"
            onPress={() => setShowSettings(true)}
          >
            <Icon name="settings" />
            Configure Zendesk
          </Button>
          <Box css={{ color: 'secondary', font: 'caption', textAlign: 'center' }}>
            You'll need your Zendesk subdomain, email, and API token.
          </Box>
        </Box>

        <FocusView
          title="Connect to Zendesk"
          shown={showSettings}
          onClose={() => setShowSettings(false)}
          primaryAction={
            <Button type="primary" onPress={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Connect'}
            </Button>
          }
          secondaryAction={
            <Button onPress={() => setShowSettings(false)}>Cancel</Button>
          }
        >
          <Box css={{ stack: 'y', gapY: 'large', padding: 'medium' }}>
            {settingsError && (
              <Banner type="critical" title="Error" description={settingsError} />
            )}

            <Box css={{ stack: 'y', gapY: 'medium' }}>
              <TextField
                label="Zendesk Subdomain"
                placeholder="yourcompany"
                description="From yourcompany.zendesk.com"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
              />
              <TextField
                label="Email Address"
                placeholder="admin@yourcompany.com"
                description="Your Zendesk admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="API Token"
                placeholder="Enter your Zendesk API token"
                description="Generate in Zendesk Admin > APIs > Zendesk API"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
            </Box>

            <Button
              href="https://support.zendesk.com/hc/en-us/articles/4408889192858-Generating-a-new-API-token"
              type="secondary"
            >
              <Icon name="external" />
              How to get an API token
            </Button>
          </Box>
        </FocusView>
      </ContextView>
    );
  }

  // Show loading while fetching data
  if (loading) {
    return (
      <ContextView title="Zendesk">
        <Box css={{ padding: 'medium', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Loading Zendesk data...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Show error or no customer found
  if (error || !zendeskCustomer) {
    return (
      <ContextView title="Zendesk">
        <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium' }}>
          <Box css={{ color: 'secondary' }}>
            {error || 'No Zendesk user found for this email'}
          </Box>
          {stripeCustomerEmail && (
            <Box css={{ color: 'secondary', font: 'caption' }}>
              Searched for: {stripeCustomerEmail}
            </Box>
          )}
          {zendeskSubdomain && (
            <Button href={`https://${zendeskSubdomain}.zendesk.com`} type="secondary">
              <Icon name="external" />
              Open Zendesk
            </Button>
          )}
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView
      title="Zendesk"
      actions={
        zendeskSubdomain && (
          <Button
            href={`https://${zendeskSubdomain}.zendesk.com/agent/users/${zendeskCustomer.id}`}
            type="secondary"
          >
            <Icon name="external" />
            View in Zendesk
          </Button>
        )
      }
    >
      <Box css={{ stack: 'y', gapY: 'large', padding: 'medium' }}>
        {/* Customer Info */}
        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ font: 'heading', fontWeight: 'semibold' }}>
            {zendeskCustomer.name}
          </Box>
          <Box css={{ color: 'secondary', font: 'caption' }}>
            {zendeskCustomer.email}
          </Box>
          {zendeskCustomer.organization && (
            <Box css={{ color: 'secondary', font: 'caption' }}>
              {zendeskCustomer.organization}
            </Box>
          )}
          {zendeskCustomer.tags.length > 0 && (
            <Inline css={{ gapX: 'xsmall', wrap: 'wrap' }}>
              {zendeskCustomer.tags.map((tag) => (
                <Badge key={tag} type="info">
                  {tag}
                </Badge>
              ))}
            </Inline>
          )}
        </Box>

        {/* Tickets Section */}
        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ font: 'subheading', fontWeight: 'semibold' }}>
            Recent Tickets ({tickets.length})
          </Box>
          
          {tickets.length === 0 ? (
            <Box css={{ color: 'secondary', font: 'caption' }}>
              No open tickets
            </Box>
          ) : (
            <Box css={{ stack: 'y', gapY: 'small' }}>
              {tickets.slice(0, 5).map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} subdomain={zendeskSubdomain} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </ContextView>
  );
};

const TicketRow = ({ ticket, subdomain }: { ticket: ZendeskTicket; subdomain: string | null }) => {
  const statusColors: Record<string, 'info' | 'warning' | 'positive' | 'critical' | 'neutral'> = {
    new: 'info',
    open: 'warning',
    pending: 'neutral',
    solved: 'positive',
    closed: 'neutral',
  };

  const priorityColors: Record<string, 'info' | 'warning' | 'positive' | 'critical' | 'neutral'> = {
    low: 'neutral',
    normal: 'info',
    high: 'warning',
    urgent: 'critical',
  };

  return (
    <Box
      css={{
        padding: 'small',
        background: 'container',
        borderRadius: 'small',
        stack: 'y',
        gapY: 'xsmall',
      }}
    >
      <Box css={{ stack: 'x', distribute: 'space-between', alignY: 'center' }}>
        {subdomain ? (
          <Link
            href={`https://${subdomain}.zendesk.com/agent/tickets/${ticket.id}`}
            external
          >
            #{ticket.id}
          </Link>
        ) : (
          <Box>#{ticket.id}</Box>
        )}
        <Inline css={{ gapX: 'xsmall' }}>
          <Badge type={statusColors[ticket.status] || 'neutral'}>
            {ticket.status}
          </Badge>
          <Badge type={priorityColors[ticket.priority] || 'neutral'}>
            {ticket.priority}
          </Badge>
        </Inline>
      </Box>
      <Box css={{ font: 'body', fontWeight: 'medium' }}>
        {ticket.subject}
      </Box>
      <Box css={{ color: 'secondary', font: 'caption' }}>
        Updated {new Date(ticket.updatedAt).toLocaleDateString()}
      </Box>
    </Box>
  );
};

export default CustomerDetailView;
