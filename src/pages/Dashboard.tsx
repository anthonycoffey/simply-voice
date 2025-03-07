import React from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext, useUser } from "@supabase/auth-helpers-react";
import TextToSpeech from "@/components/TextToSpeech";
import TTSHistory from "@/components/TTSHistory";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, User, Mic, History } from "lucide-react";

const Dashboard = () => {
  const { supabaseClient } = useSessionContext();
  const user = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("convert");

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header/Nav */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Simply Voice
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 container max-w-4xl py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">
            Convert your text to speech with our advanced AI tool.
          </p>
        </div>

        {/* Custom Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 border-b border-border/40 pb-px">
            <button
              onClick={() => setActiveTab("convert")}
              className={cn(
                "px-4 py-2 font-medium text-sm transition-all relative",
                activeTab === "convert"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span>Text to Speech</span>
              </div>
              {activeTab === "convert" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "px-4 py-2 font-medium text-sm transition-all relative",
                activeTab === "history"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </div>
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className={cn(
          "w-full bg-background/30 rounded-xl border border-border/30",
          "backdrop-blur-md shadow-lg p-6 md:p-8 relative overflow-hidden"
        )}>
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent/30 rounded-full blur-3xl" />

          <div className="relative z-10">
            {activeTab === "convert" ? (
              <TextToSpeech />
            ) : (
              <TTSHistory />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/20 py-6">
        <div className="container text-center text-sm text-muted-foreground">
          Created by Anthony Coffey <br />
          <a href="https://coffey.codes" className="text-primary hover:underline">
            coffey.codes
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;