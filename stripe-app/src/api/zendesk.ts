import type { ZendeskCustomer, ZendeskTicket } from '../types';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

// Demo mode flag - must match the flag in useZendeskOAuth.ts
const DEMO_MODE = true;

// Create Stripe client for accessing secrets
const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

// Mock data for demo mode
const MOCK_CUSTOMERS: ZendeskCustomer[] = [
  {
    id: '12345',
    name: 'John Doer',
    email: 'johntest@test.com',
    organization: 'Test Company',
    tags: ['vip', 'enterprise'],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '12346',
    name: 'Customer',
    email: 'example@zendesk.com',
    organization: null,
    tags: ['standard'],
    createdAt: '2024-02-20T14:30:00Z',
  },
];

const MOCK_TICKETS: ZendeskTicket[] = [
  {
    id: '1001',
    subject: 'Need help with billing',
    status: 'open',
    priority: 'high',
    createdAt: '2024-11-01T09:00:00Z',
    updatedAt: '2024-11-28T15:30:00Z',
  },
  {
    id: '1002',
    subject: 'Feature request - dashboard export',
    status: 'pending',
    priority: 'normal',
    createdAt: '2024-10-15T11:00:00Z',
    updatedAt: '2024-11-20T10:00:00Z',
  },
];

interface ZendeskCredentials {
  subdomain: string;
  accessToken: string;
}

/**
 * Get Zendesk credentials from Stripe Secret Store (OAuth tokens)
 */
async function getZendeskCredentials(): Promise<ZendeskCredentials | null> {
  try {
    const secrets = await stripe.apps.secrets.list({
      scope: { type: 'account' },
      limit: 10,
    });

    const subdomain = secrets.data.find(s => s.name === 'zendesk_subdomain')?.payload;
    const accessToken = secrets.data.find(s => s.name === 'zendesk_access_token')?.payload;

    if (!subdomain || !accessToken) {
      return null;
    }

    return { subdomain, accessToken };
  } catch (error) {
    console.error('Error fetching Zendesk credentials:', error);
    return null;
  }
}

/**
 * Make an authenticated request to Zendesk API using OAuth token
 */
async function zendeskFetch<T>(
  credentials: ZendeskCredentials,
  endpoint: string
): Promise<T> {
  const { subdomain, accessToken } = credentials;
  const baseUrl = `https://${subdomain}.zendesk.com/api/v2`;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Zendesk API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if the user has connected their Zendesk account
 */
export async function checkZendeskConnection(): Promise<boolean> {
  const credentials = await getZendeskCredentials();
  if (!credentials) {
    return false;
  }

  // Verify credentials by making a test API call
  try {
    await zendeskFetch(credentials, '/users/me.json');
    return true;
  } catch (error) {
    console.error('Zendesk credentials invalid:', error);
    return false;
  }
}

/**
 * Get the Zendesk subdomain for building URLs
 */
export async function getZendeskSubdomain(): Promise<string | null> {
  const credentials = await getZendeskCredentials();
  return credentials?.subdomain || null;
}

/**
 * Fetch Zendesk customer (user) by email
 */
export async function fetchZendeskCustomer(email: string): Promise<ZendeskCustomer | null> {
  // Demo mode: return mock customer matching the email
  if (DEMO_MODE) {
    const customer = MOCK_CUSTOMERS.find(
      c => c.email.toLowerCase() === email.toLowerCase()
    );
    return customer || null;
  }

  const credentials = await getZendeskCredentials();
  if (!credentials) {
    throw new Error('Zendesk not connected');
  }

  try {
    const response = await zendeskFetch<{ users: any[] }>(
      credentials,
      `/users/search.json?query=email:${encodeURIComponent(email)}`
    );

    if (response.users && response.users.length > 0) {
      const user = response.users[0];
      return {
        id: String(user.id),
        name: user.name || 'Unknown',
        email: user.email || email,
        organization: user.organization?.name || null,
        tags: user.tags || [],
        createdAt: user.created_at,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Zendesk customer:', error);
    throw error;
  }
}

/**
 * Fetch all Zendesk customers (limited to recent users)
 */
export async function fetchAllZendeskCustomers(): Promise<ZendeskCustomer[]> {
  // Demo mode: return all mock customers
  if (DEMO_MODE) {
    return MOCK_CUSTOMERS;
  }

  const credentials = await getZendeskCredentials();
  if (!credentials) {
    throw new Error('Zendesk not connected');
  }

  try {
    const response = await zendeskFetch<{ users: any[] }>(
      credentials,
      '/users.json?role=end-user&per_page=100'
    );

    return response.users.map((user: any) => ({
      id: String(user.id),
      name: user.name || 'Unknown',
      email: user.email || '',
      organization: user.organization?.name || null,
      tags: user.tags || [],
      createdAt: user.created_at,
    }));
  } catch (error) {
    console.error('Error fetching Zendesk customers:', error);
    throw error;
  }
}

/**
 * Fetch tickets for a Zendesk user by their ID
 */
export async function fetchZendeskTickets(userId: string): Promise<ZendeskTicket[]> {
  // Demo mode: return mock tickets
  if (DEMO_MODE) {
    return MOCK_TICKETS;
  }

  const credentials = await getZendeskCredentials();
  if (!credentials) {
    throw new Error('Zendesk not connected');
  }

  try {
    const response = await zendeskFetch<{ tickets: any[] }>(
      credentials,
      `/users/${encodeURIComponent(userId)}/tickets/requested.json`
    );

    return response.tickets.map((ticket: any) => ({
      id: String(ticket.id),
      subject: ticket.subject || 'No subject',
      status: ticket.status || 'open',
      priority: ticket.priority || 'normal',
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching Zendesk tickets:', error);
    throw error;
  }
}
