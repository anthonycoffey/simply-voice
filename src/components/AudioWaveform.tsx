
import React from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isPlaying?: boolean;
  className?: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isPlaying = false,
  className,
}) => {
  const bars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 h-8 transition-opacity",
        isPlaying ? "opacity-100" : "opacity-30",
        className
      )}
      aria-hidden="true"
    >
      {bars.map((i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-primary rounded-full transition-all duration-300",
            isPlaying
              ? [
                  "animate-waveform-1",
                  "animate-waveform-2",
                  "animate-waveform-3",
                  "animate-waveform-4",
                  "animate-waveform-5",
                ][i]
              : "h-2"
          )}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
