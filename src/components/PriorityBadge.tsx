import { cn } from '@/lib/utils';
import { AlertCircle, ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

const priorityConfig = {
  low: { 
    label: 'Low', 
    className: 'text-muted-foreground',
    icon: ArrowDown,
  },
  normal: { 
    label: 'Normal', 
    className: 'text-foreground',
    icon: Minus,
  },
  high: { 
    label: 'High', 
    className: 'text-warning',
    icon: ArrowUp,
  },
  urgent: { 
    label: 'Urgent', 
    className: 'text-destructive',
    icon: AlertCircle,
  },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;
  
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
