import { cn } from '@/lib/utils';
import { useSubscription } from '@/lib/hooks/useFirebase';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UsageBarProps {
  compact?: boolean;
  className?: string;
}

const UsageBar = ({ compact = false, className }: UsageBarProps) => {
  const { tier, charsUsed, limit, pctUsed, loading } = useSubscription();

  if (loading) return null;

  const isNearLimit = pctUsed >= 80;
  const isAtLimit = pctUsed >= 100;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-yellow-500' : 'bg-primary'
            )}
            style={{ width: `${pctUsed}%` }}
          />
        </div>
        <span className={cn(isAtLimit && 'text-destructive font-medium')}>
          {charsUsed.toLocaleString()}/{(limit / 1000).toFixed(0)}k
        </span>
        {tier === 'free' && isNearLimit && (
          <Link to="/pricing" className="text-primary hover:underline font-medium">
            Upgrade
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          {charsUsed.toLocaleString()} / {limit.toLocaleString()} chars this month
        </span>
        {tier === 'pro' ? (
          <span className="flex items-center gap-1 text-primary font-medium text-xs">
            <Zap className="h-3 w-3" /> Pro
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Free tier</span>
        )}
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-yellow-500' : 'bg-primary'
          )}
          style={{ width: `${pctUsed}%` }}
        />
      </div>
      {isAtLimit && tier === 'free' && (
        <p className="text-xs text-destructive">
          Monthly limit reached.{' '}
          <Link to="/pricing" className="underline font-medium">
            Upgrade to Pro
          </Link>{' '}
          for 100,000 chars/month.
        </p>
      )}
    </div>
  );
};

export default UsageBar;
