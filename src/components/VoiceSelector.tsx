
import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVoices, Voice } from "@/lib/speechUtils";
import { cn } from "@/lib/utils";

interface VoiceSelectorProps {
  onVoiceSelect: (voice: Voice) => void;
  selectedVoice?: Voice;
  className?: string;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  onVoiceSelect,
  selectedVoice,
  className,
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        setLoading(true);
        const availableVoices = await getVoices();
        setVoices(availableVoices);
        
        // Auto-select the first voice if none is selected
        if (!selectedVoice && availableVoices.length > 0) {
          onVoiceSelect(availableVoices[0]);
        }
      } catch (error) {
        console.error("Failed to load voices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVoices();
  }, [onVoiceSelect, selectedVoice]);

  // Group voices by language for better organization
  const groupedVoices = voices.reduce<Record<string, Voice[]>>((groups, voice) => {
    const lang = voice.lang;
    if (!groups[lang]) {
      groups[lang] = [];
    }
    groups[lang].push(voice);
    return groups;
  }, {});

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={selectedVoice?.id}
        onValueChange={(value) => {
          const selected = voices.find((voice) => voice.id === value);
          if (selected) {
            onVoiceSelect(selected);
          }
        }}
        disabled={loading}
            >
        <SelectTrigger className="w-full transition-all bg-secondary/50 border-secondary-foreground/10 focus:ring-2 focus:ring-primary/20">
          <SelectValue placeholder={loading ? "Loading voices..." : "Select a voice"} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Object.entries(groupedVoices).map(([lang, langVoices]) => (
            <div key={lang} className="px-1 py-1.5">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
          {lang}
              </div>
              {langVoices.map((voice) => (
          <SelectItem
            key={voice.id}
            value={voice.id}
            className="cursor-pointer transition-colors"
          >
            <div className="flex flex-col">
              <span>{voice.id}</span>
              <span className="text-xs text-muted-foreground">
                {voice.lang}
              </span>
            </div>
          </SelectItem>
              ))}
            </div>
          ))}
          {voices.length === 0 && !loading && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No voices available
            </div>
          )}
        </SelectContent>
            </Select>
    </div>
  );
};

export default VoiceSelector;
