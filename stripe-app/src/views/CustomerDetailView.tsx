import {
  Box,
  Button,
  ContextView,
  Icon,
  Inline,
  Link,
  Spinner,
  Badge,
  TextField,
  Banner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect } from 'react';
import { fetchZendeskCustomer, fetchZendeskTickets } from '../api/zendesk';
import type { ZendeskCustomer, ZendeskTicket } from '../types';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';

const CustomerDetailView = ({ userContext, environment, oauthContext }: ExtensionContextValue) => {
  const [zendeskCustomer, setZendeskCustomer] = useState<ZendeskCustomer | null>(null);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Get customer email directly from Stripe's objectContext
  const stripeCustomerEmail = environment?.objectContext?.email as string | undefined;

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

    if (isConnected && !oauthLoading) {
      loadZendeskData();
    } else if (!oauthLoading) {
      setLoading(false);
    }
  }, [stripeCustomerEmail, isConnected, oauthLoading]);

  const handleLogin = () => {
    if (inputSubdomain.trim()) {
      initiateLogin(inputSubdomain.trim());
    }
  };

  // Show loading while checking connection
  if (oauthLoading) {
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
  if (!isConnected) {
    return (
      <ContextView title="Zendesk">
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
          {subdomain && (
            <Button href={`https://${subdomain}.zendesk.com`} type="secondary">
              <Icon name="external" />
              Open Zendesk
            </Button>
          )}
          <Button type="destructive" onPress={disconnect}>
            Disconnect Zendesk
          </Button>
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView
      title="Zendesk"
      actions={
        subdomain && (
          <Button
            href={`https://${subdomain}.zendesk.com/agent/users/${zendeskCustomer.id}`}
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
                <TicketRow key={ticket.id} ticket={ticket} subdomain={subdomain} />
              ))}
            </Box>
          )}
        </Box>

        {/* Disconnect option */}
        <Box css={{ marginTop: 'medium' }}>
          <Button type="secondary" onPress={disconnect}>
            Disconnect Zendesk
          </Button>
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
