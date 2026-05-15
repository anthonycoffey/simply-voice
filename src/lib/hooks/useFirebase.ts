import { useToast } from '@/components/ui/use-toast';
import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

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
  audio_path: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();
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
        const ref = doc(db, 'profiles', user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const [firstName, ...rest] = (user.displayName ?? '').split(' ');
          const initial: UserProfile = {
            id: user.uid,
            email: user.email ?? '',
            first_name: firstName || null,
            last_name: rest.join(' ') || null,
          };
          await setDoc(ref, initial);
          setProfile(initial);
        }
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
  }, [user, toast]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('No user');

      const ref = doc(db, 'profiles', user.uid);
      await updateDoc(ref, updates);

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
  const { user } = useAuth();
  const [history, setHistory] = useState<TTSHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    try {
      if (!user) {
        setHistory([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const q = query(
        collection(db, 'tts_history'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      const items: TTSHistoryItem[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<TTSHistoryItem, 'id'>),
      }));
      setHistory(items);
    } catch (error: any) {
      toast({
        title: 'Error fetching history',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addHistoryItem = async (
    item: Omit<TTSHistoryItem, 'id' | 'user_id' | 'created_at'>
  ) => {
    try {
      if (!user) throw new Error('No user');

      const newItem = {
        ...item,
        user_id: user.uid,
        created_at: new Date().toISOString(),
      };

      const ref = await addDoc(collection(db, 'tts_history'), newItem);
      const created: TTSHistoryItem = { id: ref.id, ...newItem };

      setHistory(prev => [created, ...prev]);

      return { success: true, data: created };
    } catch (error: any) {
      toast({
        title: 'Error saving history',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteHistoryItem = async (id: string, audioPath?: string | null) => {
    try {
      if (!user) throw new Error('No user');

      if (audioPath) {
        try {
          await deleteObject(storageRef(storage, audioPath));
        } catch (fileError: any) {
          // Object-not-found is fine; anything else gets logged but doesn't block doc delete
          if (fileError?.code !== 'storage/object-not-found') {
            console.error('Error deleting file from storage:', fileError);
          }
        }
      }

      await deleteDoc(doc(db, 'tts_history', id));
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
    deleteHistoryItem,
  };
};

export const useFirebaseStorage = () => {
  const { user } = useAuth();
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

      const timestamp = Date.now();
      const cleanFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = `tts-files/${user.uid}/${timestamp}_${cleanFileName}.wav`;

      const fileRef = storageRef(storage, filePath);
      await uploadBytes(fileRef, blob, {
        contentType: 'audio/wav',
        cacheControl: 'public, max-age=3600',
      });

      const url = await getDownloadURL(fileRef);

      return {
        success: true,
        filePath,
        publicUrl: url,
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

      const url = await getDownloadURL(storageRef(storage, filePath));
      return { success: true, url };
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

      // Path shape: tts-files/{uid}/{file}
      const ownerSegment = filePath.split('/')[1];
      if (ownerSegment !== user.uid) {
        toast({
          title: 'Error deleting audio',
          description: 'You can only delete your own files',
          variant: 'destructive',
        });
        return { success: false, error: new Error('Unauthorized file access') };
      }

      await deleteObject(storageRef(storage, filePath));
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
    refreshAudioUrl,
  };
};
