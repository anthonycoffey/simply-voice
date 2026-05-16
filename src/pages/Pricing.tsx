import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/hooks/useFirebase';
import { createCheckoutSession } from '@/lib/speechUtils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DarkModeToggle from '@/components/DarkModeToggle';

const Pricing = () => {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast.error('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying it out.',
      features: [
        '10,000 characters / month',
        'All AI voices',
        'Audio history',
        'Download as WAV',
      ],
      cta: tier === 'free' ? 'Current plan' : 'Downgrade',
      active: tier === 'free',
      action: null,
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: 'per month',
      description: 'For power users and teams.',
      features: [
        '100,000 characters / month',
        'All AI voices',
        'Audio history',
        'Download as WAV',
        'Priority support',
      ],
      cta: tier === 'pro' ? 'Current plan' : 'Upgrade to Pro',
      active: tier === 'pro',
      action: tier === 'pro' ? null : handleUpgrade,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between py-4">
          <button onClick={() => navigate('/')} className="text-xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Simply Voice
            </span>
          </button>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            {user ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate('/login')}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 container max-w-4xl py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-xl border p-8 flex flex-col',
                plan.name === 'Pro'
                  ? 'border-primary bg-primary/5 relative'
                  : 'border-border/50 bg-card/50'
              )}
            >
              {plan.name === 'Pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/ {plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.name === 'Pro' ? 'default' : 'outline'}
                disabled={plan.active || loading}
                onClick={plan.action ?? undefined}
              >
                {loading && plan.name === 'Pro' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
