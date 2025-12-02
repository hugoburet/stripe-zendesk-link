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
import { fetchZendeskCustomer, fetchZendeskTickets } from '../api/zendesk';
import type { ZendeskCustomer, ZendeskTicket } from '../types';

const CustomerDetailView = ({ userContext, environment }: ExtensionContextValue) => {
  const [zendeskCustomer, setZendeskCustomer] = useState<ZendeskCustomer | null>(null);
  const [tickets, setTickets] = useState<ZendeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stripeCustomerId = environment?.objectContext?.id;
  const stripeCustomerEmail = environment?.objectContext?.email;

  useEffect(() => {
    async function loadData() {
      if (!stripeCustomerEmail) {
        setError('No customer email available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const customer = await fetchZendeskCustomer(stripeCustomerEmail);
        if (customer) {
          setZendeskCustomer(customer);
          const customerTickets = await fetchZendeskTickets(customer.id);
          setTickets(customerTickets);
        }
      } catch (err) {
        setError('Failed to load Zendesk data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [stripeCustomerEmail]);

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

  if (error || !zendeskCustomer) {
    return (
      <ContextView title="Zendesk">
        <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium' }}>
          <Box css={{ color: 'secondary' }}>
            {error || 'No Zendesk customer found for this email'}
          </Box>
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
