import React, { useState } from "react";
import { useTTSHistory } from "@/lib/hooks/useSupabase";
import { useSupabaseStorage } from "@/lib/hooks/useSupabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import AudioPlayer from "./AudioPlayer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface TTSHistoryProps {
  className?: string;
}

const ITEMS_PER_PAGE = 5;

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
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = history.slice(startIndex, endIndex);

  const handleDelete = async (id: string, audioUrl?: string | null) => {
    // Pass both the item ID and audio URL to the delete function
    const { success } = await deleteHistoryItem(id, audioUrl);
    if (success) {
      toast.success("Removed from history");
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
  
  const handleAudioLoadFail = (id: string) => {
    handleAudioError(id);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className={cn("space-y-4 w-full", className)}>
        <div className="flex items-center gap-2 text-lg font-medium">
          <Clock className="h-5 w-5" />
          <h2>Your History</h2>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-secondary/20 p-3 animate-pulse"
            >
              <div className="h-4 bg-secondary/40 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-secondary/40 rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-secondary/40 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={cn("space-y-4 w-full", className)}>
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
    <div className={cn("space-y-4 w-full", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-medium">
          <Clock className="h-5 w-5" />
          <h2>Your History</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {history.length} item{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {currentItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/50 bg-secondary/10 p-3 transition-all hover:bg-secondary/20"
          >
            <div className="flex justify-between mb-1">
              <div className="flex-1 mr-2">
                <h3 className="font-medium line-clamp-1 text-sm">{item.text_content}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                  <span className="text-xs bg-secondary/30 px-1.5 py-0.5 rounded-full">
                    {item.voice_id}
                  </span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(item.id, item.audio_url)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {item.audio_url ? (
              <>
                {audioErrors[item.id] ? (
                  <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-secondary/20 rounded-md">
                    <p className="text-xs text-muted-foreground">
                      Audio URL expired
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={refreshingIds.has(item.id)}
                      onClick={() => handleRefreshUrl(item.id, item.audio_url!)}
                    >
                      {refreshingIds.has(item.id) ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <AudioPlayer 
                      audioUrl={item.audio_url}
                      filename={`speech_${item.text_content.substring(0, 20).replace(/\s+/g, "_")}.wav`}
                      className="bg-secondary/20"
                      onError={() => handleAudioLoadFail(item.id)}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-muted-foreground mt-2 italic flex items-center">
                <span>Audio unavailable</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }} />
              </PaginationItem>
            )}
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === i + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(i + 1);
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default TTSHistory;