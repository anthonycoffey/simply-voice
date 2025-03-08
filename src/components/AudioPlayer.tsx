import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2, VolumeX, Volume1, SkipBack, SkipForward } from "lucide-react";
import AudioWaveform from "./AudioWaveform";
import { cn } from "@/lib/utils";
import { downloadAudio } from "@/lib/speechUtils";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  className?: string;
  filename?: string;
  compact?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  audioBlob,
  className,
  filename = "speech.wav",
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize audio element when the URL changes
  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // Create a new audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Set initial volume
    audio.volume = isMuted ? 0 : volume;

    // Add event listeners
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
  
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.pause();
      audio.src = "";
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audioUrl]);
  
  // Update volume when volume or mute state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update time display animation
  const updateTimeDisplay = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    animationRef.current = requestAnimationFrame(updateTimeDisplay);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTimeDisplay);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, updateTimeDisplay]);

  // Play/pause toggle with error handling
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Using try/catch to handle autoplay restrictions
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play state:', error);
    }
  };

  const handleDownload = () => {
    if (audioBlob) {
      downloadAudio(audioBlob, filename);
    } else if (audioUrl) {
      // If no blob is present, fetch the file first to ensure direct download
      fetch(audioUrl)
        .then(response => response.blob())
        .then(blob => {
          // Create a blob URL and use it for download
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          }, 100);
        })
        .catch(error => {
          console.error('Error downloading audio:', error);
          // Fallback to direct URL download if fetch fails
          const a = document.createElement('a');
          a.href = audioUrl;
          a.download = filename;
          a.target = '_blank'; // This helps in some browsers
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
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
  
  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0]);
    if (isMuted && newVolume[0] > 0) {
      setIsMuted(false);
    }
  };
  
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };
  
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className={compact ? "h-3 w-3" : "h-4 w-4"} />;
    if (volume < 0.5) return <Volume1 className={compact ? "h-3 w-3" : "h-4 w-4"} />;
    return <Volume2 className={compact ? "h-3 w-3" : "h-4 w-4"} />;
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
          {/* Skip backward button */}
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            onClick={skipBackward}
            aria-label="Skip backward 5 seconds"
            title="Skip backward 5 seconds"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          {/* Play/pause button */}
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          
          {/* Skip forward button */}
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            onClick={skipForward}
            aria-label="Skip forward 5 seconds"
            title="Skip forward 5 seconds"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 ml-2">
            {/* Mute toggle button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {getVolumeIcon()}
            </Button>
            
            {/* Inline volume slider */}
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                aria-label="Adjust volume level"
              />
            </div>
            
            {/* <AudioWaveform isPlaying={isPlaying} /> */}
          </div>
        </div>
        
        {/* Download button - now shows whenever audioUrl is available */}
        {audioUrl && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs"
            onClick={handleDownload}
            aria-label="Download audio"
            title="Download audio"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        )}
      </div>
      
      {/* Seek control */}
      <div className="w-full px-1">
        <Slider 
          value={[currentTime]} 
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="my-1"
          aria-label="Seek through audio"
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