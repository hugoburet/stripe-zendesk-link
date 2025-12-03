import type { ZendeskCustomer, ZendeskTicket } from '../types';

// Replace with your actual backend API URL
const API_BASE_URL = 'https://your-backend-api.com/api';

/**
 * Check if the user has connected their Zendesk account
 * Your backend should store OAuth tokens and return connection status
 */
export async function checkZendeskConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/zendesk/connection-status`, {
      credentials: 'include', // Include cookies for session
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.connected === true;
  } catch (error) {
    console.error('Error checking Zendesk connection:', error);
    return false;
  }
}

/**
 * Get the email address for a Stripe customer
 * This fetches from your backend which uses the Stripe API
 */
export async function getStripeCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/stripe/customers/${encodeURIComponent(customerId)}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch customer');
    }
    const data = await response.json();
    return data.email || null;
  } catch (error) {
    console.error('Error fetching Stripe customer:', error);
    throw error;
  }
}

/**
 * Fetch Zendesk customer by email
 */
export async function fetchZendeskCustomer(email: string): Promise<ZendeskCustomer | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/zendesk/customers?email=${encodeURIComponent(email)}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch customer');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching Zendesk customer:', error);
    throw error;
  }
}

/**
 * Fetch all Zendesk customers
 */
export async function fetchAllZendeskCustomers(): Promise<ZendeskCustomer[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/zendesk/customers`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch customers');
    return response.json();
  } catch (error) {
    console.error('Error fetching Zendesk customers:', error);
    throw error;
  }
}

/**
 * Fetch tickets for a Zendesk customer
 */
export async function fetchZendeskTickets(customerId: string): Promise<ZendeskTicket[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/zendesk/tickets?customerId=${encodeURIComponent(customerId)}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  } catch (error) {
    console.error('Error fetching Zendesk tickets:', error);
    throw error;
  }
}
