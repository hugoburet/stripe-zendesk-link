import {
  Badge, Banner, Box, Button, Divider, Select, Spinner, TextArea,
} from '@stripe/ui-extension-sdk/ui';
import { useState, useEffect } from 'react';
import { fetchTicketComments, addTicketComment, type Ticket, type TicketComment, type Credentials } from '../api/zendesk';

const STATUS_COLOR: Record<string, any> = { new: 'warning', open: 'info', pending: 'neutral', solved: 'positive', closed: 'neutral' };
const PRIORITY_COLOR: Record<string, any> = { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'urgent' };

interface Props {
  ticket: Ticket;
  creds: Credentials;
  subdomain: string;
  onBack: () => void;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function TicketDetailView({ ticket, creds, subdomain: _subdomain, onBack }: Props) {
  const [comments, setComments] = useState<TicketComment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState(ticket.status);
  const [replyPriority, setReplyPriority] = useState(ticket.priority);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null); setComments(null);
    fetchTicketComments(creds, ticket.id)
      .then(setComments)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticket.id]);

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setReplying(true); setReplyError(null);
    try {
      await addTicketComment(creds, ticket.id, replyBody, replyStatus, replyPriority);
      setReplyBody('');
      const updated = await fetchTicketComments(creds, ticket.id);
      setComments(updated);
    } catch (e: any) {
      setReplyError(e.message || 'Failed to send reply.');
    } finally { setReplying(false); }
  };

  return (
    <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>

      <Button type="secondary" onPress={onBack}>← Back to tickets</Button>

      <Box css={{ stack: 'x', gapX: 'xsmall', alignY: 'center' }}>
        <Badge type={STATUS_COLOR[ticket.status] ?? 'neutral'}>{ticket.status}</Badge>
        <Badge type={PRIORITY_COLOR[ticket.priority] ?? 'neutral'}>{ticket.priority}</Badge>
        <Box css={{ font: 'caption', color: 'secondary' }}>#{ticket.id}</Box>
      </Box>

      <Box css={{ stack: 'x', gapX: 'large' }}>
        <Box css={{ font: 'caption', color: 'secondary' }}>Created {formatDate(ticket.createdAt)}</Box>
        <Box css={{ font: 'caption', color: 'secondary' }}>Updated {formatDate(ticket.updatedAt)}</Box>
      </Box>

      <Divider />

      <Box css={{ font: 'subheading', fontWeight: 'semibold' }}>Conversation</Box>

      {error && <Banner type="critical" title="Error" description={error} />}
      {loading && <Box css={{ alignX: 'center' }}><Spinner size="small" /></Box>}

      {comments && comments.map((c, i) => (
        <Box key={c.id}>
          <Box css={{ stack: 'y', gapY: 'xsmall', padding: 'small', background: 'container', borderRadius: 'small' }}>
            <Box css={{ stack: 'x', gapX: 'small', alignY: 'center', distribute: 'space-between' }}>
              <Box css={{ font: 'caption', color: 'secondary' }}>{formatDate(c.createdAt)}</Box>
              {!c.public && <Badge type="neutral">Internal note</Badge>}
            </Box>
            <Box css={{ font: 'body' }}>{c.body}</Box>
          </Box>
          {i < comments.length - 1 && <Divider />}
        </Box>
      ))}

      <Divider />

      <Box css={{ font: 'subheading', fontWeight: 'semibold' }}>Reply</Box>
      {replyError && <Banner type="critical" title="Error" description={replyError} />}
      <TextArea
        label=""
        placeholder="Type your reply…"
        value={replyBody}
        onChange={e => setReplyBody(e.target.value)}
        rows={4}
      />
      <Box css={{ stack: 'x', gapX: 'small' }}>
        <Select label="Status" value={replyStatus} onChange={e => setReplyStatus(e.target.value)}>
          <option value="new">New</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="solved">Solved</option>
        </Select>
        <Select label="Priority" value={replyPriority} onChange={e => setReplyPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
      </Box>
      <Button type="primary" onPress={handleReply} disabled={!replyBody.trim() || replying}>
        {replying ? 'Sending…' : 'Send reply'}
      </Button>

    </Box>
  );
}
