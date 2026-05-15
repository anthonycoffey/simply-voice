import { auth } from './firebase';

export interface Voice {
  id: string;
  name: string;
  lang: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

// Attach the current user's Firebase ID token to every API request.
const authHeaders = async (): Promise<HeadersInit> => {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getVoices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch('/api/tts/voices', {
      headers: await authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching voices:", error);
    return [];
  }
};

export const generateSpeech = async (
  text: string,
  voiceId: string,
  lang: string,
  speakingRate = 1,
  pitch = 0
): Promise<{ audio: Blob; url: string }> => {
  const response = await fetch('/api/tts/synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({ text, voiceId, lang, speakingRate, pitch }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate speech: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  return { audio: audioBlob, url: URL.createObjectURL(audioBlob) };
};

export const downloadAudio = (blob: Blob, filename = "speech.wav"): string => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return url;
};
