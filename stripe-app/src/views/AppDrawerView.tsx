import {
  Box,
  Button,
  ContextView,
  Divider,
  Icon,
  Inline,
  Link,
  Spinner,
  TextField,
  Badge,
  FocusView,
  Banner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect, useCallback } from 'react';
import { fetchAllZendeskCustomers, fetchZendeskTickets, checkZendeskConnection, getZendeskSubdomain } from '../api/zendesk';
import type { ZendeskCustomer, ZendeskTicket } from '../types';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

// Create Stripe client for saving secrets
const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

const AppDrawerView = ({ userContext, environment }: ExtensionContextValue) => {
  const [customers, setCustomers] = useState<ZendeskCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ZendeskCustomer | null>(null);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [zendeskSubdomain, setZendeskSubdomain] = useState<string | null>(null);

  // Settings form state
  const [showSettings, setShowSettings] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Check connection on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const connected = await checkZendeskConnection();
        setIsConnected(connected);
        if (connected) {
          const subdomain = await getZendeskSubdomain();
          setZendeskSubdomain(subdomain);
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
        setIsConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    }
    checkConnection();
  }, []);

  // Load customers when connected
  useEffect(() => {
    async function loadCustomers() {
      if (!isConnected) return;
      
      try {
        setLoading(true);
        const data = await fetchAllZendeskCustomers();
        setCustomers(data);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!checkingConnection && isConnected) {
      loadCustomers();
    }
  }, [isConnected, checkingConnection]);

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
      setIsConnected(true);
      setZendeskSubdomain(subdomain);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSettingsError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCustomer = useCallback(async (customer: ZendeskCustomer) => {
    setSelectedCustomer(customer);
    setTicketsLoading(true);
    try {
      const customerTickets = await fetchZendeskTickets(customer.id);
      setTickets(customerTickets);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading while checking connection
  if (checkingConnection) {
    return (
      <ContextView title="Zendesk Customers">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Checking connection...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Show connect prompt if not connected
  if (!isConnected) {
    return (
      <ContextView title="Zendesk Customers">
        <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium', alignX: 'center' }}>
          <Box css={{ textAlign: 'center' }}>
            <Icon name="settings" size="large" />
          </Box>
          <Box css={{ font: 'heading', fontWeight: 'semibold', textAlign: 'center' }}>
            Connect to Zendesk
          </Box>
          <Box css={{ color: 'secondary', textAlign: 'center' }}>
            Configure your Zendesk API credentials to browse customers and tickets.
          </Box>
          <Button
            type="primary"
            onPress={() => setShowSettings(true)}
          >
            <Icon name="settings" />
            Configure Zendesk
          </Button>
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

  if (loading) {
    return (
      <ContextView title="Zendesk Customers">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
        </Box>
      </ContextView>
    );
  }

  // Customer Detail View
  if (selectedCustomer) {
    return (
      <ContextView
        title={selectedCustomer.name}
        actions={
          <Button type="secondary" onPress={() => setSelectedCustomer(null)}>
            <Icon name="arrowLeft" />
            Back
          </Button>
        }
      >
        <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>
          {/* Customer Info */}
          <Box css={{ stack: 'y', gapY: 'xsmall' }}>
            <Box css={{ color: 'secondary', font: 'caption' }}>
              {selectedCustomer.email}
            </Box>
            {selectedCustomer.phone && (
              <Box css={{ color: 'secondary', font: 'caption' }}>
                {selectedCustomer.phone}
              </Box>
            )}
            {selectedCustomer.organization && (
              <Box css={{ color: 'secondary', font: 'caption' }}>
                {selectedCustomer.organization}
              </Box>
            )}
            {selectedCustomer.tags.length > 0 && (
              <Inline css={{ gapX: 'xsmall', wrap: 'wrap', marginTop: 'xsmall' }}>
                {selectedCustomer.tags.map((tag) => (
                  <Badge key={tag} type="info">
                    {tag}
                  </Badge>
                ))}
              </Inline>
            )}
          </Box>

          <Divider />

          {/* Tickets */}
          <Box css={{ stack: 'y', gapY: 'small' }}>
            <Box css={{ font: 'subheading', fontWeight: 'semibold' }}>
              Support Tickets
            </Box>

            {ticketsLoading ? (
              <Box css={{ alignX: 'center', padding: 'medium' }}>
                <Spinner />
              </Box>
            ) : tickets.length === 0 ? (
              <Box css={{ color: 'secondary', font: 'caption' }}>
                No tickets found
              </Box>
            ) : (
              <Box css={{ stack: 'y', gapY: 'small' }}>
                {tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} subdomain={zendeskSubdomain} />
                ))}
              </Box>
            )}
          </Box>

          {zendeskSubdomain && (
            <Box css={{ marginTop: 'medium' }}>
              <Button
                href={`https://${zendeskSubdomain}.zendesk.com/agent/users/${selectedCustomer.id}`}
                type="primary"
              >
                <Icon name="external" />
                View in Zendesk
              </Button>
            </Box>
          )}
        </Box>
      </ContextView>
    );
  }

  // Customer List View
  return (
    <ContextView title="Zendesk Customers">
      <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>
        <TextField
          label="Search customers"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Box css={{ stack: 'y', gapY: 'small' }}>
          {filteredCustomers.length === 0 ? (
            <Box css={{ color: 'secondary', font: 'caption', padding: 'medium' }}>
              No customers found
            </Box>
          ) : (
            filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onSelect={() => handleSelectCustomer(customer)}
              />
            ))
          )}
        </Box>
      </Box>
    </ContextView>
  );
};

const CustomerRow = ({
  customer,
  onSelect,
}: {
  customer: ZendeskCustomer;
  onSelect: () => void;
}) => (
  <Box
    css={{
      padding: 'small',
      background: 'container',
      borderRadius: 'small',
      stack: 'y',
      gapY: 'xxsmall',
      cursor: 'pointer',
    }}
    onPress={onSelect}
  >
    <Box css={{ font: 'body', fontWeight: 'medium' }}>{customer.name}</Box>
    <Box css={{ color: 'secondary', font: 'caption' }}>{customer.email}</Box>
    {customer.organization && (
      <Box css={{ color: 'secondary', font: 'caption' }}>
        {customer.organization}
      </Box>
    )}
  </Box>
);

const TicketCard = ({ ticket, subdomain }: { ticket: ZendeskTicket; subdomain: string | null }) => {
  const statusColors: Record<string, 'info' | 'warning' | 'positive' | 'critical' | 'neutral'> = {
    new: 'info',
    open: 'warning',
    pending: 'neutral',
    solved: 'positive',
    closed: 'neutral',
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
        <Badge type={statusColors[ticket.status] || 'neutral'}>
          {ticket.status}
        </Badge>
      </Box>
      <Box css={{ font: 'body', fontWeight: 'medium' }}>{ticket.subject}</Box>
      <Box css={{ color: 'secondary', font: 'caption' }}>
        {new Date(ticket.updatedAt).toLocaleDateString()}
      </Box>
    </Box>
  );
};

export default AppDrawerView;
