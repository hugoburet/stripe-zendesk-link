import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'new' | 'open' | 'pending' | 'solved' | 'closed';
}

const statusConfig = {
  new: { label: 'New', className: 'bg-primary/10 text-primary border-primary/20' },
  open: { label: 'Open', className: 'bg-warning/10 text-warning border-warning/20' },
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
  solved: { label: 'Solved', className: 'bg-success/10 text-success border-success/20' },
  closed: { label: 'Closed', className: 'bg-secondary text-secondary-foreground border-border' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      config.className
    )}>
      {config.label}
    </span>
  );
}
