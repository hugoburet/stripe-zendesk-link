import {
  Box,
  Button,
  ContextView,
  Icon,
  Inline,
  Link,
  Spinner,
  Badge,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useEffect } from 'react';
import { fetchZendeskCustomer, fetchZendeskTickets, checkZendeskConnection, getStripeCustomerEmail } from '../api/zendesk';
import type { ZendeskCustomer, ZendeskTicket } from '../types';

const CustomerDetailView = ({ userContext, environment }: ExtensionContextValue) => {
  const [zendeskCustomer, setZendeskCustomer] = useState<ZendeskCustomer | null>(null);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isZendeskConnected, setIsZendeskConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  // Get the Stripe customer ID from the context
  const stripeCustomerId = environment?.objectContext?.id as string | undefined;

  // Check Zendesk connection status on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const connected = await checkZendeskConnection();
        setIsZendeskConnected(connected);
      } catch (err) {
        console.error('Failed to check Zendesk connection:', err);
        setIsZendeskConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    }
    checkConnection();
  }, []);

  // Fetch customer email from Stripe API via backend
  useEffect(() => {
    async function fetchCustomerEmail() {
      if (!stripeCustomerId) {
        setError('No customer selected');
        setLoading(false);
        return;
      }

      try {
        const email = await getStripeCustomerEmail(stripeCustomerId);
        setCustomerEmail(email);
      } catch (err) {
        console.error('Failed to fetch customer email:', err);
        setError('Failed to fetch customer details');
        setLoading(false);
      }
    }

    if (isZendeskConnected && !checkingConnection) {
      fetchCustomerEmail();
    }
  }, [stripeCustomerId, isZendeskConnected, checkingConnection]);

  // Load Zendesk data when we have the email
  useEffect(() => {
    async function loadZendeskData() {
      if (!customerEmail) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const customer = await fetchZendeskCustomer(customerEmail);
        if (customer) {
          setZendeskCustomer(customer);
          const customerTickets = await fetchZendeskTickets(customer.id);
          setTickets(customerTickets);
        } else {
          setError('No Zendesk customer found for this email');
        }
      } catch (err) {
        console.error('Failed to load Zendesk data:', err);
        setError('Failed to load Zendesk data');
      } finally {
        setLoading(false);
      }
    }

    if (isZendeskConnected && customerEmail) {
      loadZendeskData();
    }
  }, [customerEmail, isZendeskConnected]);

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
            Connect your Zendesk account to view customer support data alongside your Stripe customers.
          </Box>
          <Button
            type="primary"
            onPress={() => {
              // In production, this would initiate OAuth flow
              // The URL should point to your backend's OAuth initiation endpoint
              window.open(
                'https://your-backend-api.com/api/zendesk/oauth/authorize',
                '_blank'
              );
            }}
          >
            <Icon name="external" />
            Connect Zendesk Account
          </Button>
          <Box css={{ color: 'secondary', font: 'caption', textAlign: 'center' }}>
            You'll be redirected to Zendesk to authorize access.
          </Box>
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
            {error || 'No Zendesk customer found for this email'}
          </Box>
          {customerEmail && (
            <Box css={{ color: 'secondary', font: 'caption' }}>
              Searched for: {customerEmail}
            </Box>
          )}
          <Button href="https://zendesk.com" type="secondary">
            <Icon name="external" />
            Open Zendesk
          </Button>
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView
      title="Zendesk"
      actions={
        <Button
          href={`https://your-subdomain.zendesk.com/agent/users/${zendeskCustomer.id}`}
          type="secondary"
        >
          <Icon name="external" />
          View in Zendesk
        </Button>
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
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </ContextView>
  );
};

const TicketRow = ({ ticket }: { ticket: ZendeskTicket }) => {
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
        <Link
          href={`https://your-subdomain.zendesk.com/agent/tickets/${ticket.id}`}
          external
        >
          #{ticket.id}
        </Link>
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
