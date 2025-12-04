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
  Banner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect, useCallback } from 'react';
import { fetchAllZendeskCustomers, fetchZendeskTickets } from '../api/zendesk';
import type { ZendeskCustomer, ZendeskTicket } from '../types';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';
import WelcomeView from './WelcomeView';

// Demo mode flag
const DEMO_MODE = true;

const AppDrawerView = ({ userContext, oauthContext }: ExtensionContextValue) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [customers, setCustomers] = useState<ZendeskCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ZendeskCustomer | null>(null);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
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

  // Check for existing auth session
  useEffect(() => {
    const checkAuth = () => {
      // In demo mode, always start with WelcomeView
      if (DEMO_MODE) {
        const storedUserId = localStorage.getItem('zendesk_connector_user_id');
        setIsAuthenticated(!!storedUserId);
      } else {
        // For real auth, check localStorage
        const storedUserId = localStorage.getItem('zendesk_connector_user_id');
        setIsAuthenticated(!!storedUserId);
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  const handleAuthenticated = useCallback((userId: string) => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zendesk_connector_user_id');
    localStorage.removeItem('zendesk_connector_email');
    setIsAuthenticated(false);
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
    
    if (!oauthLoading && isConnected) {
      loadCustomers();
    } else if (!oauthLoading) {
      setLoading(false);
    }
  }, [isConnected, oauthLoading]);

  const handleLogin = () => {
    if (inputSubdomain.trim()) {
      initiateLogin(inputSubdomain.trim());
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <ContextView title="Zendesk Connector">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Loading...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Show Welcome/Auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <WelcomeView
        userContext={userContext}
        oauthContext={oauthContext}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  // Show loading while checking Zendesk connection
  if (oauthLoading) {
    return (
      <ContextView title="Zendesk Customers">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'small', color: 'secondary' }}>
            Checking Zendesk connection...
          </Box>
        </Box>
      </ContextView>
    );
  }

  // Show Zendesk connect prompt if authenticated but not connected to Zendesk
  if (!isConnected) {
    return (
      <ContextView 
        title="Connect Zendesk"
        actions={
          <Button type="secondary" onPress={handleLogout}>
            Sign Out
          </Button>
        }
      >
        <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium', alignX: 'center' }}>
          {oauthError && (
            <Banner type="critical" title="Connection Error" description={oauthError} />
          )}
          
          <Box css={{ textAlign: 'center' }}>
            <Icon name="settings" size="large" />
          </Box>
          <Box css={{ font: 'heading', fontWeight: 'semibold', textAlign: 'center' }}>
            Connect to Zendesk
          </Box>
          <Box css={{ color: 'secondary', textAlign: 'center' }}>
            Now connect your Zendesk account to view customer profiles and support tickets.
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
            onPress={handleLogin}
            disabled={!inputSubdomain.trim()}
          >
            <Icon name="external" />
            Sign in with Zendesk
          </Button>
        </Box>
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
                  <TicketCard key={ticket.id} ticket={ticket} subdomain={subdomain} />
                ))}
              </Box>
            )}
          </Box>

          {subdomain && (
            <Box css={{ marginTop: 'medium' }}>
              <Button
                href={`https://${subdomain}.zendesk.com/agent/users/${selectedCustomer.id}`}
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
    <ContextView 
      title="Zendesk Customers"
      actions={
        <Box css={{ stack: 'x', gapX: 'small' }}>
          <Button type="secondary" onPress={disconnect}>
            Disconnect Zendesk
          </Button>
          <Button type="secondary" onPress={handleLogout}>
            Sign Out
          </Button>
        </Box>
      }
    >
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
    <Box css={{ font: 'body', fontWeight: 'semibold' }}>{customer.name}</Box>
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
      <Box css={{ font: 'body', fontWeight: 'semibold' }}>{ticket.subject}</Box>
      <Box css={{ color: 'secondary', font: 'caption' }}>
        {new Date(ticket.updatedAt).toLocaleDateString()}
      </Box>
    </Box>
  );
};

export default AppDrawerView;
