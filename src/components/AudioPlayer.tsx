import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2, VolumeX, Volume1, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadAudio } from "@/lib/speechUtils";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  className?: string;
  filename?: string;
  compact?: boolean;
  onError?: () => void;
}

// Only one player audible at a time — starting one pauses any other.
type ActivePlayer = { pause: () => Promise<void> };
let activePlayer: ActivePlayer | null = null;

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  audioBlob,
  className,
  filename = "speech.wav",
  compact = false,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const animationRef = useRef<number | null>(null);
  const selfRef = useRef<ActivePlayer | null>(null);

  // Wait for any in-flight play() before pausing — avoids the AbortError that
  // corrupts the audio element's internal state.
  const safePause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playPromiseRef.current) {
      try { await playPromiseRef.current; } catch { /* AbortError is expected */ }
    }
    if (!audio.paused) audio.pause();
    if (activePlayer === selfRef.current) activePlayer = null;
  }, []);

  // Stable identity exposed to the module-level registry.
  useEffect(() => {
    selfRef.current = { pause: safePause };
    return () => {
      if (activePlayer === selfRef.current) activePlayer = null;
      selfRef.current = null;
    };
  }, [safePause]);

  // When the source URL changes, stop cleanly and reset display state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await safePause();
      if (cancelled) return;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    })();
    return () => { cancelled = true; };
  }, [audioUrl, safePause]);

  // Volume / mute side-effect.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // RAF tick for a smooth seek slider (timeupdate fires too slowly).
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  // Unmount: release any active-player slot and stop playback safely.
  useEffect(() => {
    return () => {
      void safePause();
    };
  }, [safePause]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Decide off the DOM, not React state — React state can lag the real audio.
    if (!audio.paused) {
      await safePause();
      return;
    }

    // Pause any other instance before we start so two never play together.
    if (activePlayer && activePlayer !== selfRef.current) {
      await activePlayer.pause();
    }
    activePlayer = selfRef.current;

    try {
      const p = audio.play();
      playPromiseRef.current = p;
      await p;
    } catch (error: unknown) {
      const name = (error as { name?: string } | null)?.name;
      // AbortError fires when play() is interrupted (pause, src swap, unmount).
      // Anything else is a real failure — typically an expired/forbidden URL.
      if (name !== 'AbortError') {
        console.error('Audio playback error:', error);
        onError?.();
      }
      if (activePlayer === selfRef.current) activePlayer = null;
    } finally {
      playPromiseRef.current = null;
    }
  }, [audioUrl, safePause, onError]);

  const handleDownload = () => {
    if (audioBlob) {
      downloadAudio(audioBlob, filename);
    } else if (audioUrl) {
      fetch(audioUrl)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          }, 100);
        })
        .catch(error => {
          console.error('Error downloading audio:', error);
          const a = document.createElement('a');
          a.href = audioUrl;
          a.download = filename;
          a.target = '_blank';
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
    const newTime = Math.max(0, audioRef.current.currentTime - 5);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    const newTime = Math.min(duration, audioRef.current.currentTime + 5);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return '0:00';
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
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (activePlayer === selfRef.current) activePlayer = null;
        }}
        onLoadedMetadata={(e) => {
          const d = (e.currentTarget as HTMLAudioElement).duration;
          setDuration(Number.isFinite(d) ? d : 0);
        }}
        onError={() => {
          setIsPlaying(false);
          if (activePlayer === selfRef.current) activePlayer = null;
          onError?.();
        }}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
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

            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                aria-label="Adjust volume level"
              />
            </div>
          </div>
        </div>

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
