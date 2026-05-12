import {
  Badge, Banner, Box, Button, Divider,
  Link, Select, Spinner, TextArea, TextField,
} from '@stripe/ui-extension-sdk/ui';
import { useState, useEffect } from 'react';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';
import type { ZendeskOAuth } from '../hooks/useZendeskOAuth';
import { fetchTicketsByEmail, createTicket, type Ticket, type Credentials } from '../api/zendesk';

const stripe = new Stripe(STRIPE_API_KEY, { httpClient: createHttpClient(), apiVersion: '2023-10-16' });

const STATUS_COLOR: Record<string, any> = { new: 'warning', open: 'info', pending: 'neutral', solved: 'positive', closed: 'neutral' };
const PRIORITY_COLOR: Record<string, any> = { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'urgent' };

interface Props {
  customerId: string;
  oauth: ZendeskOAuth;
  onSelectTicket: (ticket: Ticket) => void;
}

export default function CustomerDetailView({ customerId, oauth, onSelectTicket }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState('new');
  const [creating, setCreating] = useState(false);

  const creds: Credentials | null =
    oauth.subdomain && oauth.accessToken
      ? { subdomain: oauth.subdomain, accessToken: oauth.accessToken }
      : null;

  useEffect(() => {
    setLoading(true); setEmail(null); setTickets(null); setError(null);
    stripe.customers.retrieve(customerId)
      .then(c => { setEmail(!c.deleted ? (c as Stripe.Customer).email ?? null : null); })
      .catch(() => setError('Could not load customer.'));
  }, [customerId]);

  useEffect(() => {
    if (!email || !creds) return;
    setLoading(true);
    fetchTicketsByEmail(creds, email)
      .then(t => { setTickets(t); setError(null); })
      .catch(e => {
        if (e.message === 'ZENDESK_AUTH_EXPIRED') { oauth.markSessionExpired(); return; }
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [email, creds?.accessToken]);

  const handleCreate = async () => {
    if (!creds || !email || !subject.trim()) return;
    setCreating(true);
    try {
      await createTicket(creds, { subject, description, priority, status, requesterEmail: email });
      setShowCreate(false); setSubject(''); setDescription(''); setPriority('normal'); setStatus('new');
      const t = await fetchTicketsByEmail(creds, email);
      setTickets(t);
    } catch (e: any) {
      if (e.message === 'ZENDESK_AUTH_EXPIRED') { oauth.markSessionExpired(); return; }
      setError(e.message);
    } finally { setCreating(false); }
  };

  if (loading && !email) {
    return <Box css={{ padding: 'large', alignX: 'center' }}><Spinner size="large" /></Box>;
  }

  return (
    <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>

      <Box css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
        <Badge type="positive">Connected</Badge>
        <Box css={{ font: 'caption', color: 'secondary' }}>{oauth.subdomain}.zendesk.com</Box>
      </Box>

      {error && <Banner type="critical" title="Error" description={error} />}

      {email && <Box css={{ font: 'caption', color: 'secondary' }}>Tickets for {email}</Box>}

      {!showCreate ? (
        <Button type="secondary" onPress={() => setShowCreate(true)} disabled={!email}>
          + New ticket
        </Button>
      ) : (
        <Box css={{ stack: 'y', gapY: 'small', padding: 'small', background: 'container', borderRadius: 'small' }}>
          <TextField label="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <TextArea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          <Box css={{ stack: 'x', gapX: 'small' }}>
            <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="solved">Solved</option>
            </Select>
          </Box>
          <Box css={{ stack: 'x', gapX: 'small' }}>
            <Button type="primary" onPress={handleCreate} disabled={!subject.trim() || creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button type="secondary" onPress={() => setShowCreate(false)}>Cancel</Button>
          </Box>
        </Box>
      )}

      <Divider />

      {loading && <Box css={{ alignX: 'center' }}><Spinner size="small" /></Box>}

      {tickets && tickets.length === 0 && (
        <Box css={{ font: 'caption', color: 'secondary' }}>No tickets found.</Box>
      )}

      {tickets && tickets.map(t => (
        <Box key={t.id} css={{ stack: 'y', gapY: 'xsmall', padding: 'small', background: 'container', borderRadius: 'small' }}>
          <Box css={{ stack: 'x', gapX: 'xsmall', distribute: 'space-between', alignY: 'center' }}>
            <Box css={{ stack: 'x', gapX: 'xsmall' }}>
              <Badge type={STATUS_COLOR[t.status] ?? 'neutral'}>{t.status}</Badge>
              <Badge type={PRIORITY_COLOR[t.priority] ?? 'neutral'}>{t.priority}</Badge>
            </Box>
            <Link onPress={() => onSelectTicket(t)}>View</Link>
          </Box>
          <Box css={{ font: 'caption', fontWeight: 'semibold' }}>{t.subject}</Box>
          {t.description && (
            <Box css={{ font: 'caption', color: 'secondary' }}>{t.description}</Box>
          )}
        </Box>
      ))}

      <Divider />

      <Button type="destructive" onPress={oauth.disconnect}>
        Disconnect Zendesk
      </Button>

    </Box>
  );
}
