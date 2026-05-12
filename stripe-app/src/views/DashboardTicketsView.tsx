import {
  Badge, Banner, Box, Button, Divider, Link,
  Select, Spinner, TextArea, TextField,
} from '@stripe/ui-extension-sdk/ui';
import { useState } from 'react';
import type { ZendeskOAuth } from '../hooks/useZendeskOAuth';
import { fetchTicketsByEmail, createTicket, type Ticket, type Credentials } from '../api/zendesk';

const STATUS_COLOR: Record<string, any> = { new: 'warning', open: 'info', pending: 'neutral', solved: 'positive', closed: 'neutral' };
const PRIORITY_COLOR: Record<string, any> = { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'urgent' };

interface Props {
  oauth: ZendeskOAuth;
  onBack: () => void;
}

export default function DashboardTicketsView({ oauth, onBack }: Props) {
  const [searchEmail, setSearchEmail] = useState('');
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [ticketEmail, setTicketEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState('new');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const creds: Credentials | null =
    oauth.subdomain && oauth.accessToken
      ? { subdomain: oauth.subdomain, accessToken: oauth.accessToken }
      : null;

  const handleSearch = async () => {
    const email = searchEmail.trim();
    if (!email || !creds || searching) return;
    setSearching(true); setSearchError(null); setTickets(null);
    try {
      setTickets(await fetchTicketsByEmail(creds, email));
    } catch (e: any) {
      if (e.message === 'ZENDESK_AUTH_EXPIRED') { oauth.markSessionExpired(); return; }
      setSearchError(e.message || 'Search failed.');
    } finally { setSearching(false); }
  };

  const handleCreate = async () => {
    if (!creds || !ticketEmail.trim() || !subject.trim()) return;
    setCreating(true); setCreateError(null); setCreateSuccess(false);
    try {
      await createTicket(creds, {
        subject,
        description,
        priority,
        status,
        requesterEmail: ticketEmail.trim(),
      });
      setCreateSuccess(true);
      setTicketEmail(''); setSubject(''); setDescription(''); setPriority('normal'); setStatus('new');
    } catch (e: any) {
      if (e.message === 'ZENDESK_AUTH_EXPIRED') { oauth.markSessionExpired(); return; }
      setCreateError(e.message || 'Failed to create ticket.');
    } finally { setCreating(false); }
  };

  return (
    <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>

      <Button type="secondary" onPress={onBack}>← Back</Button>

      {/* Two-column layout */}
      <Box css={{ stack: 'x', gapX: 'xlarge', alignY: 'start' }}>

        {/* Left: Search */}
        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ font: 'label', fontWeight: 'semibold' }}>Search tickets by email</Box>
          <TextField
            label=""
            placeholder="customer@example.com"
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
          />
          <Button type="primary" onPress={handleSearch} disabled={!searchEmail.trim() || searching}>
            {searching ? <Spinner size="small" /> : 'Search'}
          </Button>

          {searchError && (
            <Box css={{ font: 'caption', color: 'critical' }}>{searchError}</Box>
          )}
          {tickets && tickets.length === 0 && (
            <Box css={{ font: 'caption', color: 'secondary' }}>No tickets found.</Box>
          )}
          {tickets && tickets.length > 0 && (
            <Box css={{ stack: 'y', gapY: 'xsmall' }}>
              {tickets.slice(0, 10).map(t => (
                <Box key={t.id} css={{ stack: 'y', gapY: 'xsmall', padding: 'small', background: 'container', borderRadius: 'small' }}>
                  <Box css={{ stack: 'x', gapX: 'xsmall', distribute: 'space-between', alignY: 'center' }}>
                    <Box css={{ stack: 'x', gapX: 'xsmall' }}>
                      <Badge type={STATUS_COLOR[t.status] ?? 'neutral'}>{t.status}</Badge>
                      <Badge type={PRIORITY_COLOR[t.priority] ?? 'neutral'}>{t.priority}</Badge>
                    </Box>
                    <Link href={`https://${oauth.subdomain}.zendesk.com/agent/tickets/${t.id}`} external />
                  </Box>
                  <Box css={{ font: 'caption', fontWeight: 'semibold' }}>{t.subject}</Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider />

        {/* Right: New Ticket */}
        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ font: 'label', fontWeight: 'semibold' }}>New ticket</Box>

          {createSuccess && (
            <Banner type="default" title="Ticket created" description="The ticket was created successfully in Zendesk." />
          )}
          {createError && (
            <Banner type="critical" title="Error" description={createError} />
          )}

          <TextField
            label="Requester email"
            placeholder="customer@example.com"
            value={ticketEmail}
            onChange={e => setTicketEmail(e.target.value)}
          />
          <TextField
            label="Subject"
            placeholder="Brief description of the issue"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <TextArea
            label="Description"
            placeholder="Detailed description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
          />
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
          <Button
            type="primary"
            onPress={handleCreate}
            disabled={!ticketEmail.trim() || !subject.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create ticket'}
          </Button>
        </Box>

      </Box>
    </Box>
  );
}
