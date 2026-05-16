import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import VoiceSelector from "./VoiceSelector";
import AudioPlayer from "./AudioPlayer";
import { generateSpeech, ApiError } from "@/lib/speechUtils";
import { toast } from "sonner";
import { Wand2, Save, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useTTSHistory, useFirebaseStorage } from "@/lib/hooks/useFirebase";

const MAX_CHARS = 4800;

interface TextToSpeechProps {
  className?: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ className }) => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addHistoryItem } = useTTSHistory();
  const { uploadAudio } = useFirebaseStorage();

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const charPct = Math.min((charCount / MAX_CHARS) * 100, 100);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to convert to speech");
      textareaRef.current?.focus();
      return;
    }

    if (!selectedVoice) {
      toast.error("Please select a voice");
      return;
    }

    if (isOverLimit) {
      toast.error(`Text exceeds ${MAX_CHARS.toLocaleString()} character limit`);
      return;
    }

    setIsGenerating(true);

    try {
      const { audio, url } = await generateSpeech(
        text,
        selectedVoice.id,
        selectedVoice.lang,
        speakingRate,
        pitch
      );
      setAudioBlob(audio);
      setAudioUrl(url);
      toast.success("Audio generated successfully");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const { chars_used, limit, tier } = err.data as {
          chars_used?: number;
          limit?: number;
          tier?: string;
        };
        const used = chars_used?.toLocaleString() ?? "?";
        const lim = limit?.toLocaleString() ?? "?";

        toast.error(
          tier === "free"
            ? `Monthly limit reached (${used}/${lim} chars). Upgrade to Pro for 10× more.`
            : `Monthly limit reached (${used}/${lim} chars).`,
          {
            duration: 8000,
            action:
              tier === "free"
                ? {
                    label: "Upgrade",
                    onClick: () => navigate("/pricing"),
                  }
                : undefined,
          }
        );
      } else if (err instanceof ApiError && err.status === 400) {
        toast.error(err.message);
      } else {
        console.error("Error generating speech:", err);
        toast.error("Failed to generate speech. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!audioBlob || !selectedVoice) return;

    setIsSaving(true);

    try {
      const fileName = `speech_${selectedVoice.id}_${Date.now()}`;
      const { success, publicUrl, filePath } = await uploadAudio(audioBlob, fileName);

      if (success && publicUrl && filePath) {
        await addHistoryItem({
          text_content: text,
          voice_id: selectedVoice.id,
          audio_url: publicUrl,
          audio_path: filePath,
        });
        toast.success("Saved to your history");
      } else {
        throw new Error("Failed to upload audio");
      }
    } catch (error) {
      console.error("Error saving to history:", error);
      toast.error("Failed to save to history");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-5 w-full max-w-3xl", className)}>
      <div className="space-y-3">
        {/* Textarea + char counter */}
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
            className={cn(
              "min-h-[120px] resize-y bg-secondary/30 border-secondary-foreground/10 focus:border-primary/20 transition-all focus:ring-2 focus:ring-primary/20",
              isOverLimit && "border-destructive focus:border-destructive focus:ring-destructive/20"
            )}
          />
          {/* Character counter */}
          <div className="flex items-center justify-between">
            <div className="h-1 flex-1 mr-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  isOverLimit
                    ? "bg-destructive"
                    : charPct >= 80
                    ? "bg-yellow-500"
                    : "bg-primary/50"
                )}
                style={{ width: `${charPct}%` }}
              />
            </div>
            <span
              className={cn(
                "text-xs tabular-nums",
                isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
              )}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Voice selector */}
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

        {/* Advanced controls */}
        <div className="rounded-lg border border-border/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <span className="font-medium">Advanced settings</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="px-4 pb-4 pt-1 space-y-5 border-t border-border/40 bg-secondary/10">
              {/* Speaking rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground/80">
                    Speaking rate
                  </label>
                  <span className="text-sm font-mono text-muted-foreground w-8 text-right">
                    {speakingRate.toFixed(2)}×
                  </span>
                </div>
                <Slider
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={[speakingRate]}
                  onValueChange={([v]) => setSpeakingRate(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.25× (slow)</span>
                  <span>1.00× (normal)</span>
                  <span>4.00× (fast)</span>
                </div>
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground/80">
                    Pitch
                  </label>
                  <span className="text-sm font-mono text-muted-foreground w-10 text-right">
                    {pitch > 0 ? `+${pitch}` : pitch}
                  </span>
                </div>
                <Slider
                  min={-20}
                  max={20}
                  step={1}
                  value={[pitch]}
                  onValueChange={([v]) => setPitch(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>−20 (low)</span>
                  <span>0 (default)</span>
                  <span>+20 (high)</span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7 px-2"
                onClick={() => { setSpeakingRate(1.0); setPitch(0); }}
              >
                Reset to defaults
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim() || !selectedVoice || isOverLimit}
          className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          {isGenerating ? (
            <span className="animate-pulse">Generating Audio…</span>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate Speech
            </>
          )}
        </Button>

        {audioBlob && (
          <Button
            onClick={handleSaveToHistory}
            disabled={isSaving || !audioBlob}
            variant="secondary"
            className="gap-2 transition-all"
          >
            {isSaving ? (
              <span className="animate-pulse">Saving…</span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save to History
              </>
            )}
          </Button>
        )}
      </div>

      {/* Inline upgrade nudge when at/over limit */}
      {isOverLimit && (
        <div className="flex items-center gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <Zap className="h-4 w-4 shrink-0" />
          <span>
            Text is too long. Maximum {MAX_CHARS.toLocaleString()} characters per request.
          </span>
        </div>
      )}

      {audioUrl && audioBlob && (
        <AudioPlayer
          audioUrl={audioUrl}
          audioBlob={audioBlob}
          filename={`speech-${Date.now()}.wav`}
          className="mt-4"
        />
      )}
    </div>
  );
};

export default TextToSpeech;
