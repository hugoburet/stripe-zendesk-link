import { Clock, User } from 'lucide-react';
import { ZendeskTicket } from '@/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatDistanceToNow } from 'date-fns';

interface TicketCardProps {
  ticket: ZendeskTicket;
  compact?: boolean;
}

export function TicketCard({ ticket, compact }: TicketCardProps) {
  const timeAgo = formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true });
  
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-all hover:card-shadow">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border bg-card p-4 transition-all hover:card-shadow animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          
          <h4 className="mt-2 font-medium text-foreground">{ticket.subject}</h4>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {timeAgo}</span>
            </div>
            
            {ticket.assignee && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{ticket.assignee}</span>
              </div>
            )}
          </div>
        </div>
        
        <span className="text-xs font-mono text-muted-foreground">#{ticket.id.split('_')[1]}</span>
      </div>
    </div>
  );
}
