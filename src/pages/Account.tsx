import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/hooks/useFirebase';
import { createPortalSession } from '@/lib/speechUtils';
import { Button } from '@/components/ui/button';
import UsageBar from '@/components/UsageBar';
import DarkModeToggle from '@/components/DarkModeToggle';
import { toast } from 'sonner';
import { Zap, User, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const Account = () => {
  const { user, signOut } = useAuth();
  const { tier, charsUsed, limit, loading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast.success('Welcome to Pro! Your account has been upgraded.');
    }
  }, [searchParams]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast.error('Failed to open billing portal. Please try again.');
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between py-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container max-w-2xl py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Account</h1>
          <p className="text-muted-foreground">Manage your plan and usage.</p>
        </div>

        {/* Profile */}
        <section className={cn('rounded-xl border border-border/50 bg-card/50 p-6 space-y-4')}>
          <div className="flex items-center gap-2 font-semibold">
            <User className="h-4 w-4" />
            Profile
          </div>
          <div className="flex items-center gap-4">
            {user?.photoURL && (
              <img src={user.photoURL} alt="avatar" className="h-12 w-12 rounded-full" />
            )}
            <div>
              <p className="font-medium">{user?.displayName || 'User'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Plan */}
        <section className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Zap className="h-4 w-4" />
              Plan
            </div>
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              tier === 'pro'
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-secondary-foreground'
            )}>
              {tier === 'pro' ? '⚡ Pro' : 'Free'}
            </span>
          </div>

          {loading ? (
            <div className="h-8 bg-secondary/40 rounded animate-pulse" />
          ) : (
            <UsageBar />
          )}

          <div className="pt-2 flex gap-3">
            {tier === 'free' ? (
              <Button onClick={() => navigate('/pricing')}>
                <Zap className="h-4 w-4 mr-2" />
                Upgrade to Pro — $9.99/mo
              </Button>
            ) : (
              <Button variant="outline" disabled={portalLoading} onClick={handleManageSubscription}>
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Manage subscription
              </Button>
            )}
          </div>
        </section>

        {/* Usage stats */}
        <section className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            Usage this month
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{charsUsed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Characters synthesized</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{(limit - charsUsed).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Characters remaining</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Account;
