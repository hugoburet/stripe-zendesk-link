import { ZendeskCustomer, ZendeskTicket, StripeCustomer } from '@/types';

export const mockStripeCustomers: StripeCustomer[] = [
  {
    id: 'cus_001',
    email: 'sarah.johnson@techcorp.com',
    name: 'Sarah Johnson',
    created: Date.now() - 90 * 24 * 60 * 60 * 1000,
    currency: 'usd',
    balance: 0,
  },
  {
    id: 'cus_002',
    email: 'mike.chen@startup.io',
    name: 'Mike Chen',
    created: Date.now() - 60 * 24 * 60 * 60 * 1000,
    currency: 'usd',
    balance: -5000,
  },
  {
    id: 'cus_003',
    email: 'emma.wilson@enterprise.co',
    name: 'Emma Wilson',
    created: Date.now() - 30 * 24 * 60 * 60 * 1000,
    currency: 'eur',
    balance: 0,
  },
];

export const mockZendeskCustomers: ZendeskCustomer[] = [
  {
    id: 'zen_001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1 (555) 123-4567',
    organization: 'TechCorp Inc.',
    tags: ['enterprise', 'priority'],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-11-28T14:22:00Z',
  },
  {
    id: 'zen_002',
    name: 'Mike Chen',
    email: 'mike.chen@startup.io',
    phone: '+1 (555) 987-6543',
    organization: 'Startup.io',
    tags: ['startup', 'beta-tester'],
    createdAt: '2024-02-20T08:15:00Z',
    updatedAt: '2024-11-30T09:45:00Z',
  },
  {
    id: 'zen_003',
    name: 'Emma Wilson',
    email: 'emma.wilson@enterprise.co',
    organization: 'Enterprise Co.',
    tags: ['vip', 'enterprise'],
    createdAt: '2024-03-10T16:00:00Z',
    updatedAt: '2024-11-29T11:30:00Z',
  },
];

export const mockZendeskTickets: ZendeskTicket[] = [
  {
    id: 'ticket_001',
    subject: 'Payment processing issue',
    description: 'Customer reports intermittent failures when processing payments through the API.',
    status: 'open',
    priority: 'high',
    createdAt: '2024-11-30T08:00:00Z',
    updatedAt: '2024-11-30T14:30:00Z',
    assignee: 'John Support',
    requester: 'sarah.johnson@techcorp.com',
  },
  {
    id: 'ticket_002',
    subject: 'Invoice clarification needed',
    description: 'Questions about line items on the November invoice.',
    status: 'pending',
    priority: 'normal',
    createdAt: '2024-11-29T11:20:00Z',
    updatedAt: '2024-11-30T09:15:00Z',
    assignee: 'Jane Billing',
    requester: 'sarah.johnson@techcorp.com',
  },
  {
    id: 'ticket_003',
    subject: 'API rate limit increase request',
    description: 'Requesting higher rate limits for production environment.',
    status: 'solved',
    priority: 'normal',
    createdAt: '2024-11-25T15:45:00Z',
    updatedAt: '2024-11-27T10:00:00Z',
    assignee: 'Tech Support',
    requester: 'mike.chen@startup.io',
  },
  {
    id: 'ticket_004',
    subject: 'Webhook configuration help',
    description: 'Need assistance setting up webhooks for payment events.',
    status: 'new',
    priority: 'low',
    createdAt: '2024-11-30T16:00:00Z',
    updatedAt: '2024-11-30T16:00:00Z',
    requester: 'mike.chen@startup.io',
  },
  {
    id: 'ticket_005',
    subject: 'Enterprise pricing discussion',
    description: 'Interested in discussing enterprise pricing options for expanded usage.',
    status: 'pending',
    priority: 'urgent',
    createdAt: '2024-11-28T09:30:00Z',
    updatedAt: '2024-11-30T11:45:00Z',
    assignee: 'Sales Team',
    requester: 'emma.wilson@enterprise.co',
  },
];

export const getTicketsForCustomer = (email: string): ZendeskTicket[] => {
  return mockZendeskTickets.filter(ticket => ticket.requester === email);
};

export const getZendeskCustomerByEmail = (email: string): ZendeskCustomer | undefined => {
  return mockZendeskCustomers.find(customer => customer.email === email);
};
