import { useToast } from '@/components/ui/use-toast';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';

// Add this helper function at the top of your file (just before your hooks)
const extractFilePath = (url: string): string | null => {
  try {
    // For signed URLs
    const signedMatch = url.match(/(?:\/storage\/v1\/object\/sign\/tts-files\/)([^?]+)/);
    if (signedMatch && signedMatch[1]) {
      return decodeURIComponent(signedMatch[1]);
    }
    
    // For public/download URLs
    const publicMatch = url.match(/(?:\/storage\/v1\/object\/public\/tts-files\/)([^?]+)/);
    if (publicMatch && publicMatch[1]) {
      return decodeURIComponent(publicMatch[1]);
    }
    
    return null;
  } catch (e) {
    console.error("Error extracting file path:", e);
    return null;
  }
};


export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface TTSHistoryItem {
  id: string;
  user_id: string;
  text_content: string;
  voice_id: string;
  created_at: string;
  audio_url: string | null;
}

export const useProfile = () => {
  const { supabaseClient } = useSessionContext();
  const user = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
      } catch (error: any) {
        toast({
          title: 'Error fetching profile',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabaseClient, user, toast]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('No user');

      const { error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  return { profile, loading, updateProfile };
};

export const useTTSHistory = () => {
  const { supabaseClient } = useSessionContext();
  const user = useUser();
  const [history, setHistory] = useState<TTSHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      if (!user) {
        setHistory([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabaseClient
        .from('tts_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching history',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [supabaseClient, user]);

  const addHistoryItem = async (item: Omit<TTSHistoryItem, 'id' | 'user_id' | 'created_at'>) => {
    try {
      if (!user) throw new Error('No user');

      const newItem = {
        ...item,
        user_id: user.id,
      };

      const { data, error } = await supabaseClient
        .from('tts_history')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;

      setHistory(prev => [data, ...prev]);
      
      return { success: true, data };
    } catch (error: any) {
      toast({
        title: 'Error saving history',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteHistoryItem = async (id: string, audioUrl?: string | null) => {
    try {
      if (!user) throw new Error('No user');
  
      console.log(`Deleting history item: ${id}`);
      
      // First, if there's an audio URL, extract the file path and delete the file
      if (audioUrl) {
        const filePath = extractFilePath(audioUrl);
        if (filePath) {
          console.log(`Deleting file: ${filePath}`);
          
          // Delete the file from storage
          try {
            const { error } = await supabaseClient
              .storage
              .from('tts-files')
              .remove([filePath]);
              
            if (error) {
              console.error('Error deleting file from storage:', error);
              // Continue with history deletion even if file deletion fails
            } else {
              console.log(`File ${filePath} deleted successfully`);
            }
          } catch (fileError) {
            console.error('Exception during file deletion:', fileError);
            // Continue with history deletion even if file deletion throws
          }
        } else {
          console.warn('Could not extract file path from URL:', audioUrl);
        }
      }
  
      // Now delete the history item from the database
      const { error } = await supabaseClient
        .from('tts_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
  
      if (error) throw error;
  
      // Update local state
      setHistory(prev => prev.filter(item => item.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting history item:', error);
      toast({
        title: 'Error deleting history item',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  return { 
    history, 
    loading, 
    fetchHistory, 
    addHistoryItem, 
    deleteHistoryItem 
  };
};

export const useSupabaseStorage = () => {
  const { supabaseClient } = useSessionContext();
  const user = useUser();
  const { toast } = useToast();

  const uploadAudio = async (blob: Blob, fileName: string) => {
    try {
      if (!user) {
        toast({
          title: 'Error uploading audio',
          description: 'You must be logged in to upload files',
          variant: 'destructive',
        });
        return { success: false, error: new Error('User not authenticated') };
      }

      const timestamp = new Date().getTime();
      const cleanFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = `${user.id}/${timestamp}_${cleanFileName}.wav`;

      console.log(`Uploading file to ${filePath}`);

      const { error: uploadError } = await supabaseClient
        .storage
        .from('tts-files')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'audio/wav',
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabaseClient
        .storage
        .from('tts-files')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        throw signedUrlError;
      }

      if (!signedUrlData?.signedUrl) {
        throw new Error('Failed to generate signed URL');
      }

      console.log(`File uploaded successfully. Signed URL: ${signedUrlData.signedUrl}`);
      return { 
        success: true, 
        filePath, 
        publicUrl: signedUrlData.signedUrl 
      };
    } catch (error: any) {
      console.error('Error in uploadAudio:', error);
      toast({
        title: 'Error uploading audio',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const refreshAudioUrl = async (filePath: string) => {
    try {
      if (!user) {
        toast({
          title: 'Error refreshing URL',
          description: 'You must be logged in to access files',
          variant: 'destructive',
        });
        return { success: false, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabaseClient
        .storage
        .from('tts-files')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (error) {
        console.error('Error refreshing signed URL:', error);
        throw error;
      }

      return { success: true, url: data.signedUrl };
    } catch (error: any) {
      console.error('Error in refreshAudioUrl:', error);
      toast({
        title: 'Error refreshing URL',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteAudio = async (filePath: string) => {
    try {
      if (!user) {
        toast({
          title: 'Error deleting audio',
          description: 'You must be logged in to delete files',
          variant: 'destructive',
        });
        return { success: false, error: new Error('User not authenticated') };
      }

      const pathParts = filePath.split('/');
      const fileUserId = pathParts[0];
      
      if (fileUserId !== user.id) {
        toast({
          title: 'Error deleting audio',
          description: 'You can only delete your own files',
          variant: 'destructive',
        });
        return { success: false, error: new Error('Unauthorized file access') };
      }

      console.log(`Deleting file: ${filePath}`);
      
      const { error } = await supabaseClient
        .storage
        .from('tts-files')
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('File deleted successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteAudio:', error);
      toast({
        title: 'Error deleting audio',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  return { 
    uploadAudio, 
    deleteAudio,
    refreshAudioUrl
  };
};
