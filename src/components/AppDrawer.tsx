import { useState } from 'react';
import { ChevronLeft, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerCard } from './CustomerCard';
import { TicketCard } from './TicketCard';
import { ZendeskCustomer, ZendeskTicket, StripeCustomer } from '@/types';
import { cn } from '@/lib/utils';

interface AppDrawerProps {
  stripeCustomers: StripeCustomer[];
  zendeskCustomers: ZendeskCustomer[];
  getTickets: (email: string) => ZendeskTicket[];
  getZendeskCustomer: (email: string) => ZendeskCustomer | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function AppDrawer({
  stripeCustomers,
  zendeskCustomers,
  getTickets,
  getZendeskCustomer,
  isOpen,
  onClose,
}: AppDrawerProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<StripeCustomer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredCustomers = stripeCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleBack = () => {
    setSelectedCustomer(null);
  };

  if (!isOpen) return null;

  const zendeskData = selectedCustomer ? getZendeskCustomer(selectedCustomer.email) : null;
  const tickets = selectedCustomer ? getTickets(selectedCustomer.email) : [];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl animate-slide-in-right z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center gap-2">
          {selectedCustomer && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[#03363D] flex items-center justify-center">
              <span className="text-xs font-bold text-white">Z</span>
            </div>
            <span className="font-semibold text-foreground">
              {selectedCustomer ? 'Customer Details' : 'Zendesk CRM'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto h-[calc(100%-57px)]">
        {selectedCustomer && zendeskData ? (
          <div className="p-4 space-y-6 animate-fade-in">
            {/* Customer Profile */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Customer Profile
              </h3>
              <CustomerCard
                customer={zendeskData}
                ticketCount={tickets.length}
              />
            </div>

            {/* Recent Tickets */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Support Tickets ({tickets.length})
              </h3>
              
              {tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No tickets found for this customer</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-2">
              {filteredCustomers.map(customer => {
                const zendesk = getZendeskCustomer(customer.email);
                const customerTickets = getTickets(customer.email);
                
                if (!zendesk) return null;
                
                return (
                  <CustomerCard
                    key={customer.id}
                    customer={zendesk}
                    ticketCount={customerTickets.length}
                    onClick={() => setSelectedCustomer(customer)}
                  />
                );
              })}
              
              {filteredCustomers.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No customers found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
