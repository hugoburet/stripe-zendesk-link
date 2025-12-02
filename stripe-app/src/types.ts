export interface ZendeskCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ZendeskTicket {
  id: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'solved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  requester: string;
}
