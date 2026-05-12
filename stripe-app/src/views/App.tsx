import {
  Badge, Banner, Box, Button, ContextView, Divider, Link, Select, Spinner, TextArea, TextField,
} from '@stripe/ui-extension-sdk/ui';
import { useState } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';
import { ZENDESK_BRAND_COLOR, ZENDESK_BRAND_ICON } from '../types';
import { createTicket, fetchTicketsByEmail, type Ticket, type Credentials } from '../api/zendesk';
import GetStartedView from './GetStartedView';
import TicketDetailView from './TicketDetailView';

const STATUS_COLOR: Record<string, any> = { new: 'warning', open: 'info', pending: 'neutral', solved: 'positive', closed: 'neutral' };
const PRIORITY_COLOR: Record<string, any> = { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'urgent' };

const App = (_: ExtensionContextValue) => {
  const oauth = useZendeskOAuth();

  const [emailInput, setEmailInput] = useState('');
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchedEmail, setSearchedEmail] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createPriority, setCreatePriority] = useState('normal');
  const [createStatus, setCreateStatus] = useState('new');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const creds: Credentials | null =
    oauth.subdomain && oauth.accessToken
      ? { subdomain: oauth.subdomain, accessToken: oauth.accessToken }
      : null;

  const handleSearch = async () => {
    if (!creds || !emailInput.trim()) return;
    setSearching(true);
    setSearchError(null);
    setTickets(null);
    setSearchedEmail(emailInput.trim());
    try {
      const t = await fetchTicketsByEmail(creds, emailInput.trim());
      setTickets(t);
    } catch (e: any) {
      if (e.message === 'ZENDESK_AUTH_EXPIRED') { oauth.markSessionExpired(); return; }
      setSearchError(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!creds || !createEmail.trim() || !createSubject.trim()) return;
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(false);
    try {
      await createTicket(creds, {
        subject: createSubject,
        description: createBody,
        requesterEmail: createEmail.trim(),
        priority: createPriority,
        status: createStatus,
      });
      setCreateSuccess(true);
      setCreateEmail(''); setCreateSubject(''); setCreateBody('');
      setCreatePriority('normal'); setCreateStatus('new');
      setShowCreate(false);
    } catch (e: any) {
      if (e.message === 'ZENDESK_AUTH_EXPIRED') { oauth.markSessionExpired(); return; }
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (oauth.isLoading) {
    return (
      <ContextView title="Zendesk Connector" brandColor={ZENDESK_BRAND_COLOR} brandIcon={ZENDESK_BRAND_ICON}>
        <Box css={{ padding: 'large', alignX: 'center' }}><Spinner size="large" /></Box>
      </ContextView>
    );
  }

  if (!oauth.isConnected) {
    return (
      <ContextView title="Zendesk Connector" brandColor={ZENDESK_BRAND_COLOR} brandIcon={ZENDESK_BRAND_ICON}>
        <GetStartedView oauth={oauth} />
      </ContextView>
    );
  }

  if (selectedTicket && creds) {
    return (
      <ContextView title={selectedTicket.subject} brandColor={ZENDESK_BRAND_COLOR} brandIcon={ZENDESK_BRAND_ICON}>
        <TicketDetailView
          ticket={selectedTicket}
          creds={creds}
          subdomain={oauth.subdomain!}
          onBack={() => setSelectedTicket(null)}
        />
      </ContextView>
    );
  }

  return (
    <ContextView title="Zendesk Connector" brandColor={ZENDESK_BRAND_COLOR} brandIcon={ZENDESK_BRAND_ICON}>
      <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>

        {/* CTA */}
        <Box css={{ stack: 'y', gapY: 'xxsmall' }}>
          <Box css={{ font: 'heading', fontWeight: 'bold', color: 'primary' }}>⟵</Box>
          <Box css={{ font: 'heading', fontWeight: 'bold', color: 'primary' }}>Open a customer</Box>
          <Box css={{ font: 'caption', color: 'secondary' }}>
            Select any customer from the left panel to view their Zendesk tickets.
          </Box>
        </Box>

        <Divider />

        {/* Create new ticket */}
        <Box css={{ stack: 'y', gapY: 'small', padding: 'medium', background: 'container', borderRadius: 'medium' }}>
          <Box css={{ font: 'heading', fontWeight: 'bold', color: 'primary' }}>
            Create new ticket
          </Box>
          {createSuccess && (
            <Banner type="default" title="Ticket created" description="The ticket was successfully created in Zendesk." />
          )}
          {!showCreate ? (
            <Button type="primary" onPress={() => { setShowCreate(true); setCreateSuccess(false); }}>
              + New ticket
            </Button>
          ) : (
            <Box css={{ stack: 'y', gapY: 'small', padding: 'medium', background: 'container', borderRadius: 'medium' }}>
              {createError && <Banner type="critical" title="Error" description={createError} />}
              <TextField
                label="Requester email"
                placeholder="customer@example.com"
                value={createEmail}
                onChange={e => setCreateEmail(e.target.value)}
              />
              <TextField
                label="Subject"
                placeholder="Brief summary of the issue"
                value={createSubject}
                onChange={e => setCreateSubject(e.target.value)}
              />
              <TextArea
                label="Description"
                placeholder="Describe the issue…"
                value={createBody}
                onChange={e => setCreateBody(e.target.value)}
                rows={3}
              />
              <Box css={{ stack: 'x', gapX: 'small' }}>
                <Select label="Priority" value={createPriority} onChange={e => setCreatePriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
                <Select label="Status" value={createStatus} onChange={e => setCreateStatus(e.target.value)}>
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                </Select>
              </Box>
              <Box css={{ stack: 'x', gapX: 'small' }}>
                <Button
                  type="primary"
                  onPress={handleCreate}
                  disabled={!createEmail.trim() || !createSubject.trim() || creating}
                >
                  {creating ? 'Creating…' : 'Create ticket'}
                </Button>
                <Button type="secondary" onPress={() => { setShowCreate(false); setCreateError(null); }}>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Email search */}
        <Box css={{ stack: 'y', gapY: 'small', padding: 'medium', background: 'container', borderRadius: 'medium' }}>
          <Box css={{ font: 'heading', fontWeight: 'bold', color: 'primary' }}>
            Or search by email
          </Box>
          <TextField
            label=""
            placeholder="customer@example.com"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
          />
          <Button
            type="primary"
            onPress={handleSearch}
            disabled={!emailInput.trim() || searching}
          >
            {searching ? 'Searching…' : 'Search tickets'}
          </Button>
        </Box>

        {searchError && <Banner type="critical" title="Error" description={searchError} />}
        {searching && <Box css={{ alignX: 'center' }}><Spinner size="small" /></Box>}

        {tickets !== null && (
          <Box css={{ stack: 'y', gapY: 'small' }}>
            <Box css={{ font: 'caption', color: 'secondary' }}>
              {tickets.length === 0
                ? `No tickets found for ${searchedEmail}.`
                : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} for ${searchedEmail}`}
            </Box>
            {tickets.map(t => (
              <Box key={t.id} css={{ stack: 'y', gapY: 'xsmall', padding: 'small', background: 'container', borderRadius: 'small' }}>
                <Box css={{ stack: 'x', gapX: 'xsmall', distribute: 'space-between', alignY: 'center' }}>
                  <Box css={{ stack: 'x', gapX: 'xsmall' }}>
                    <Badge type={STATUS_COLOR[t.status] ?? 'neutral'}>{t.status}</Badge>
                    <Badge type={PRIORITY_COLOR[t.priority] ?? 'neutral'}>{t.priority}</Badge>
                  </Box>
                  <Link onPress={() => setSelectedTicket(t)}>View</Link>
                </Box>
                <Box css={{ font: 'caption', fontWeight: 'semibold' }}>{t.subject}</Box>
                {t.description && (
                  <Box css={{ font: 'caption', color: 'secondary' }}>{t.description}</Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        <Divider />

        {/* Connection status + disconnect */}
        <Box css={{ stack: 'y', gapY: 'small' }}>
          <Box css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
            <Badge type="positive">Connected</Badge>
            <Box css={{ font: 'caption', color: 'secondary' }}>{oauth.subdomain}.zendesk.com</Box>
          </Box>
          {!confirmDisconnect ? (
            <Link onPress={() => setConfirmDisconnect(true)}>Disconnect</Link>
          ) : (
            <Box css={{ stack: 'y', gapY: 'small' }}>
              <Box css={{ font: 'caption', color: 'secondary' }}>Disconnect your Zendesk account?</Box>
              <Box css={{ stack: 'x', gapX: 'small' }}>
                <Button type="destructive" onPress={oauth.disconnect}>Yes, disconnect</Button>
                <Button type="secondary" onPress={() => setConfirmDisconnect(false)}>Cancel</Button>
              </Box>
            </Box>
          )}
        </Box>

      </Box>
    </ContextView>
  );
};

export default App;
