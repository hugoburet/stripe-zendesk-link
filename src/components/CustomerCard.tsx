import { Building2, Mail, Phone, Tag } from 'lucide-react';
import { ZendeskCustomer } from '@/types';
import { cn } from '@/lib/utils';

interface CustomerCardProps {
  customer: ZendeskCustomer;
  ticketCount: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CustomerCard({ customer, ticketCount, isSelected, onClick }: CustomerCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative cursor-pointer rounded-lg border bg-card p-4 transition-all hover:card-shadow',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
          {customer.name.split(' ').map(n => n[0]).join('')}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{customer.name}</h4>
          
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
            
            {customer.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            
            {customer.organization && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{customer.organization}</span>
              </div>
            )}
          </div>
          
          {customer.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {customer.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {ticketCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-foreground">{ticketCount}</span>
            <span className="text-xs text-muted-foreground">tickets</span>
          </div>
        )}
      </div>
    </div>
  );
}
