import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConnectionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  onConnect: () => void;
  accentColor?: string;
}

export function ConnectionCard({
  title,
  description,
  icon,
  isConnected,
  onConnect,
  accentColor = 'primary',
}: ConnectionCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-card p-6 card-shadow transition-all hover:card-shadow-lg',
      isConnected && 'border-success/30'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg',
          isConnected ? 'bg-success/10' : 'bg-accent'
        )}>
          {icon}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <Check className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          
          <Button
            variant={isConnected ? 'outline' : 'default'}
            size="sm"
            className="mt-4"
            onClick={onConnect}
          >
            {isConnected ? (
              <>Manage Connection</>
            ) : (
              <>
                Connect
                <ExternalLink className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
