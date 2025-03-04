
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2 } from "lucide-react";
import AudioWaveform from "./AudioWaveform";
import { cn } from "@/lib/utils";
import { downloadAudio } from "@/lib/speechUtils";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  className?: string;
  filename?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  audioBlob,
  className,
  filename = "speech.wav",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      return;
    }

    // Create a new audio element when the URL changes
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Add event listeners
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("play", () => setIsPlaying(true));

    // Clean up on unmount
    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("ended", () => setIsPlaying(false));
      audio.removeEventListener("pause", () => setIsPlaying(false));
      audio.removeEventListener("play", () => setIsPlaying(true));
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleDownload = () => {
    if (audioBlob) {
      downloadAudio(audioBlob, filename);
    }
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-accent bg-opacity-50 border border-accent-foreground/10 animate-fade-in",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <AudioWaveform isPlaying={isPlaying} />
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1 text-xs"
        onClick={handleDownload}
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </Button>
    </div>
  );
};

export default AudioPlayer;
