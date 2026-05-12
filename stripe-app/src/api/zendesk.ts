const PROXY = 'https://gbtzgszldsarfwzcqoiz.supabase.co/functions/v1/zendesk-proxy';

export interface Credentials {
  subdomain: string;
  accessToken: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  body: string;
  public: boolean;
  createdAt: string;
}

async function proxyCall<T>(creds: Credentials, path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subdomain: creds.subdomain, accessToken: creds.accessToken, path, method, body }),
  });
  if (res.status === 401) throw new Error('ZENDESK_AUTH_EXPIRED');
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Zendesk error ${res.status}: ${txt}`);
  }
  return res.json();
}

function mapTicket(t: any): Ticket {
  return {
    id: String(t.id),
    subject: t.subject || '(no subject)',
    description: (t.description || '').split('\n')[0].trim(),
    status: t.status || 'open',
    priority: t.priority || 'normal',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function fetchTicketsByEmail(creds: Credentials, email: string): Promise<Ticket[]> {
  const q = encodeURIComponent(`type:ticket requester:${email.trim().toLowerCase()}`);
  const r = await proxyCall<{ results: any[] }>(creds, `/search.json?query=${q}&sort_by=updated_at&sort_order=desc`);
  return (r.results ?? []).map(mapTicket);
}

export async function fetchTicketComments(creds: Credentials, ticketId: string): Promise<TicketComment[]> {
  const r = await proxyCall<{ comments: any[] }>(creds, `/tickets/${ticketId}/comments.json`);
  return (r.comments ?? []).map(c => ({
    id: String(c.id),
    body: c.plain_body || c.body || '',
    public: c.public ?? true,
    createdAt: c.created_at,
  }));
}

export async function addTicketComment(
  creds: Credentials,
  ticketId: string,
  body: string,
  status?: string,
  priority?: string,
): Promise<void> {
  await proxyCall<{ ticket: any }>(creds, `/tickets/${ticketId}.json`, 'PUT', {
    ticket: {
      comment: { body, public: true },
      ...(status && { status }),
      ...(priority && { priority }),
    },
  });
}

export async function createTicket(creds: Credentials, params: {
  subject: string;
  description: string;
  requesterEmail: string;
  priority?: string;
  status?: string;
}): Promise<Ticket> {
  const r = await proxyCall<{ ticket: any }>(creds, '/tickets.json', 'POST', {
    ticket: {
      subject: params.subject,
      comment: { body: params.description },
      priority: params.priority ?? 'normal',
      status: params.status ?? 'new',
      requester: { email: params.requesterEmail },
    },
  });
  return mapTicket(r.ticket);
}
