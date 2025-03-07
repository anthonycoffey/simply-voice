
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2, SkipBack, SkipForward } from "lucide-react";
import AudioWaveform from "./AudioWaveform";
import { cn } from "@/lib/utils";
import { downloadAudio } from "@/lib/speechUtils";
import { Slider } from "@/components/ui/slider";

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // Create a new audio element when the URL changes
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Add event listeners
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));

    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.pause();
      audio.src = "";
      audio.removeEventListener("ended", () => setIsPlaying(false));
      audio.removeEventListener("pause", () => setIsPlaying(false));
      audio.removeEventListener("play", () => setIsPlaying(true));
      audio.removeEventListener("loadedmetadata", () => setDuration(audio.duration));
    };
  }, [audioUrl]);

  const updateTimeDisplay = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    animationRef.current = requestAnimationFrame(updateTimeDisplay);
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTimeDisplay);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

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

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
    setCurrentTime(audioRef.current.currentTime);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
    setCurrentTime(audioRef.current.currentTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col p-3 rounded-lg bg-accent bg-opacity-50 border border-accent-foreground/10 animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            onClick={skipBackward}
            aria-label="Skip backward"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
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
          
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            onClick={skipForward}
            aria-label="Skip forward"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 ml-2">
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
      
      <div className="w-full px-1">
        <Slider 
          value={[currentTime]} 
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="my-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
