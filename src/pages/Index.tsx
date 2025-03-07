import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, LogIn } from "lucide-react";

const Index = () => {
  const { session } = useSessionContext();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with auth buttons */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between py-4">
          <h1 className="text-xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Simply Voice
            </span>
          </h1>
          
          <div className="flex items-center gap-2">
            {session ? (
              <Button 
                variant="default" 
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="default" 
                onClick={() => navigate('/login')}
              >
                Sign in
                <LogIn className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-block mb-2 px-3 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground animate-slide-down">
              Text to Audio Converter
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-slide-up">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Simply Voice
              </span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8 animate-slide-up">
              Transform your text into naturally sounding speech. Select from multiple voices, listen to
              a preview, and download the audio file instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="animate-slide-up animation-delay-200"
                onClick={() => navigate('/login')}
              >
                Get Started 
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!session && (
                <Button
                  variant="outline"
                  size="lg"
                  className="animate-slide-up animation-delay-300"
                  asChild
                >
                  <Link to="/login">
                    Sign In
                    <LogIn className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full my-12">
            {[
              {
                title: "Multiple AI Voices",
                description: "Choose from a variety of natural-sounding voices for your audio."
              },
              {
                title: "Instant Preview",
                description: "Listen to your text before downloading the final audio file."
              },
              {
                title: "Easy Download",
                description: "Save your audio files in high-quality MP3 format with one click."
              }
            ].map((feature, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-6 rounded-lg border border-border/50 bg-card/50",
                  "backdrop-blur-sm animate-fade-in animation-delay-300"
                )}
              >
                <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          <footer className="mt-10 text-center text-sm text-muted-foreground">
            Created by Anthony Coffey <br />
            <a href="https://coffey.codes" className="text-primary hover:underline">coffey.codes</a>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Index;