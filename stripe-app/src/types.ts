export const ZENDESK_BRAND_COLOR = '#1F73B7';
export const ZENDESK_BRAND_ICON = 'https://gbtzgszldsarfwzcqoiz.supabase.co/storage/v1/object/public/assets/app-icon.png';

export interface ZendeskCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ZendeskTicket {
  id: string;
  subject: string;
  status: 'new' | 'open' | 'pending' | 'solved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  assigneeId?: string | null;
  requesterEmail?: string;
}
