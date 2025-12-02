import type { ZendeskCustomer, ZendeskTicket } from '../types';

// Replace with your actual backend API URL
const API_BASE_URL = 'https://your-backend-api.com/api';

export async function fetchZendeskCustomer(email: string): Promise<ZendeskCustomer | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/zendesk/customers?email=${encodeURIComponent(email)}`);
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

export async function fetchAllZendeskCustomers(): Promise<ZendeskCustomer[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/zendesk/customers`);
    if (!response.ok) throw new Error('Failed to fetch customers');
    return response.json();
  } catch (error) {
    console.error('Error fetching Zendesk customers:', error);
    throw error;
  }
}

export async function fetchZendeskTickets(customerId: string): Promise<ZendeskTicket[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/zendesk/tickets?customerId=${encodeURIComponent(customerId)}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  } catch (error) {
    console.error('Error fetching Zendesk tickets:', error);
    throw error;
  }
}
