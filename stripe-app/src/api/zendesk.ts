import type { ZendeskCustomer, ZendeskTicket } from '../types';
import { createHttpClient, STRIPE_API_KEY } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

// Create Stripe client for accessing secrets
const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2023-10-16',
});

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
