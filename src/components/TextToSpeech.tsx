
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import VoiceSelector from "./VoiceSelector";
import AudioPlayer from "./AudioPlayer";
import { generateSpeech } from "@/lib/speechUtils";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";

interface TextToSpeechProps {
  className?: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ className }) => {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to convert to speech");
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }

    if (!selectedVoice) {
      toast.error("Please select a voice");
      return;
    }

    setIsGenerating(true);

    try {
      // First attempt to generate with audio capture
      const { audio, url } = await generateSpeech(text, selectedVoice.id, selectedVoice.lang);
      setAudioBlob(audio);
      setAudioUrl(url);
      toast.success("Audio generated successfully");
    } catch (mainError) {
      console.error("Error generating speech with audio capture:", mainError);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn("space-y-5 w-full max-w-3xl", className)}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="text-input"
            className="text-sm font-medium text-foreground/80"
          >
            Enter text to convert to speech
          </label>
          <Textarea
            id="text-input"
            ref={textareaRef}
            placeholder="Type or paste text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px] resize-y bg-secondary/30 border-secondary-foreground/10 focus:border-primary/20 transition-all focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="voice-selector"
            className="text-sm font-medium text-foreground/80"
          >
            Select a voice
          </label>
          <VoiceSelector
            selectedVoice={selectedVoice}
            onVoiceSelect={setSelectedVoice}
          />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim() || !selectedVoice}
        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        {isGenerating ? (
          <>
            <div className="animate-pulse-soft">Generating Audio</div>
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            Generate Speech
          </>
        )}
      </Button>

      {audioUrl && audioBlob && (
        <AudioPlayer
          audioUrl={audioUrl}
          audioBlob={audioBlob}
          filename={`speech-${new Date().getTime()}.wav`}
          className="mt-4"
        />
      )}

    </div>
  );
};

export default TextToSpeech;
