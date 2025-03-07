import React, { useState, useEffect } from "react";
import { useTTSHistory } from "@/lib/hooks/useSupabase";
import { useSupabaseStorage } from "@/lib/hooks/useSupabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Download, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface TTSHistoryProps {
  className?: string;
}

const extractFilePath = (url: string): string | null => {
  try {
    const match = url.match(
      /(?:\/storage\/v1\/object\/sign\/tts-files\/)([^?]+)/
    );
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (e) {
    console.error("Error extracting file path:", e);
    return null;
  }
};

const TTSHistory: React.FC<TTSHistoryProps> = ({ className }) => {
  const { history, loading, deleteHistoryItem, fetchHistory } = useTTSHistory();
  const { refreshAudioUrl } = useSupabaseStorage();
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});

  const handleDelete = async (id: string, audioUrl?: string | null) => {
    // Pass both the item ID and audio URL to the delete function
    const { success } = await deleteHistoryItem(id, audioUrl);
    if (success) {
      toast.success("Removed from history");
    }
  };

  const handleDownload = async (url: string, text: string) => {
    try {
      const fileName = `speech_${text
        .substring(0, 20)
        .replace(/\s+/g, "_")}_${Date.now()}.wav`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);

      const clippedFileName =
        fileName.length > 30 ? `${fileName.substring(0, 27)}...` : fileName;
      toast.success(`Downloaded ${clippedFileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  const handleRefreshUrl = async (id: string, audioUrl: string) => {
    const filePath = extractFilePath(audioUrl);
    if (!filePath) {
      toast.error("Could not extract file path from URL");
      return;
    }

    setRefreshingIds((prev) => new Set(prev).add(id));

    try {
      const { success, url } = await refreshAudioUrl(filePath);

      if (success && url) {
        const updatedHistory = history.map((item) =>
          item.id === id ? { ...item, audio_url: url } : item
        );

        setAudioErrors((prev) => ({ ...prev, [id]: false }));

        toast.success("Audio URL refreshed");

        fetchHistory();
      } else {
        throw new Error("Failed to refresh URL");
      }
    } catch (error) {
      console.error("Error refreshing URL:", error);
      toast.error("Failed to refresh audio URL");
    } finally {
      setRefreshingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleAudioError = (id: string) => {
    console.log(`Audio error for item ${id}`);
    setAudioErrors((prev) => ({ ...prev, [id]: true }));
  };

  if (loading) {
    return (
      <div className={cn("space-y-5 w-full", className)}>
        <div className="flex items-center gap-2 text-lg font-medium">
          <Clock className="h-5 w-5" />
          <h2>Your History</h2>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-secondary/20 p-4 animate-pulse"
            >
              <div className="h-4 bg-secondary/40 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-secondary/40 rounded w-1/4 mb-6"></div>
              <div className="h-10 bg-secondary/40 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={cn("space-y-5 w-full", className)}>
        <div className="flex items-center gap-2 text-lg font-medium">
          <Clock className="h-5 w-5" />
          <h2>Your History</h2>
        </div>

        <div className="rounded-lg border border-border/50 bg-secondary/10 p-6 text-center">
          <p className="text-muted-foreground mb-2">
            You haven't saved any speech conversions yet.
          </p>
          <p>
            Generate some speech and click "Save to History" to see your entries
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5 w-full", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-medium">
          <Clock className="h-5 w-5" />
          <h2>Your History</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {history.length} item{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/50 bg-secondary/10 p-4 transition-all hover:bg-secondary/20"
          >
            <div className="mb-2">
              <h3 className="font-medium line-clamp-1">{item.text_content}</h3>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </p>
                <span className="text-xs bg-secondary/30 px-2 py-0.5 rounded-full">
                  {item.voice_id}
                </span>
              </div>
            </div>

            {item.audio_url ? (
              <>
                {audioErrors[item.id] ? (
                  <div className="flex items-center justify-center gap-2 my-3 p-2 bg-secondary/20 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Audio URL expired
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2"
                      disabled={refreshingIds.has(item.id)}
                      onClick={() => handleRefreshUrl(item.id, item.audio_url!)}
                    >
                      {refreshingIds.has(item.id) ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <audio
                    controls
                    src={item.audio_url}
                    className="w-full h-10 my-3 rounded-md bg-secondary/20"
                    onError={() => handleAudioError(item.id)}
                  />
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() =>
                      handleDownload(item.audio_url!, item.text_content)
                    }
                    disabled={audioErrors[item.id]}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id, item.audio_url)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground mt-2 italic">
                Audio unavailable
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item.id, item.audio_url)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TTSHistory;
