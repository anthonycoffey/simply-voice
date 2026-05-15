import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
        console.error('Sign-in error:', error);
        toast.error(error?.message ?? 'Failed to sign in');
      }
    } finally {
      setSigningIn(false);
    }
  };

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
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent/30 rounded-full blur-3xl" />

          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Choose your preferred sign in method</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full gap-2"
              size="lg"
            >
              {signingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M12 5.04c1.94 0 3.69.67 5.06 1.98l3.78-3.78C18.5 1.05 15.5 0 12 0 7.31 0 3.25 2.69 1.28 6.6l4.4 3.41C6.73 7.13 9.13 5.04 12 5.04z"/>
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.74-2.4 3.58l3.86 3c2.26-2.09 3.56-5.17 3.56-8.82z"/>
    <path fill="#FBBC05" d="M5.68 14.36c-.25-.74-.39-1.53-.39-2.36s.14-1.62.39-2.36L1.28 6.23C.46 7.94 0 9.92 0 12s.46 4.06 1.28 5.77l4.4-3.41z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96l-4.4 3.41C3.25 21.31 7.31 24 12 24z"/>
  </svg>
);

export default Login;
