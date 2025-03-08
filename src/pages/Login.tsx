import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const Login = () => {
  const { supabaseClient, session } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Simply Voice
            </span>
          </h1>
          <p className="text-muted-foreground">Sign in to continue to your account</p>
        </div>

        <Card className={cn(
          "w-full bg-background/30 border border-border/30",
          "backdrop-blur-md shadow-lg relative overflow-hidden"
        )}>
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent/30 rounded-full blur-3xl" />
          
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Choose your preferred sign in method</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Auth
              supabaseClient={supabaseClient}
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(var(--primary))',
                      brandAccent: 'hsl(var(--primary))',
                    },
                    radii: {
                      borderRadiusButton: 'var(--radius)',
                      inputBorderRadius: 'var(--radius)',
                    },
                  },
                },
              }}
              theme="default"
              providers={['google']}
              redirectTo={`${window.location.origin}/dashboard`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;