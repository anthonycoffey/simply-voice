
import React from "react";
import TextToSpeech from "@/components/TextToSpeech";
import { cn } from "@/lib/utils";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        <header className="text-center mb-10 animate-fade-in">
          <div className="inline-block mb-2 px-3 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground animate-slide-down">
            Text to Audio Converter
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 animate-slide-up">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Simply Voice
            </span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto animate-slide-up">
            Transform your text into naturally sounding speech. Select from multiple voices, listen to
            a preview, and download the audio file instantly.
          </p>
        </header>

        <div className={cn(
          "w-full bg-background/30 rounded-xl border border-border/30",
          "backdrop-blur-md shadow-lg p-6 md:p-8 relative overflow-hidden",
          "animate-fade-in"
        )}>
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent/30 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <TextToSpeech />
          </div>
        </div>

        <footer className="mt-10 text-center text-sm text-muted-foreground">
          <p>
            Uses the Web Speech API for high-quality text-to-speech conversion.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
