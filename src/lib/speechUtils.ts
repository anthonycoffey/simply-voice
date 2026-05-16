import { auth } from './firebase';

export interface Voice {
  id: string;
  name: string;
  lang: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
  type?: string;
  tier?: number;
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const authHeaders = async (): Promise<HeadersInit> => {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getVoices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch('/api/tts/voices', {
      headers: await authHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch voices: ${response.statusText}`);
    return response.json();
  } catch (error) {
    console.error('Error fetching voices:', error);
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
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error || `Failed to generate speech: ${response.statusText}`,
      response.status,
      data
    );
  }

  const audioBlob = await response.blob();
  return { audio: audioBlob, url: URL.createObjectURL(audioBlob) };
};

export const createCheckoutSession = async (): Promise<string> => {
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error('Failed to create checkout session');
  const { url } = await response.json();
  return url;
};

export const createPortalSession = async (): Promise<string> => {
  const response = await fetch('/api/stripe/create-portal-session', {
    method: 'POST',
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error('Failed to create portal session');
  const { url } = await response.json();
  return url;
};

export const downloadAudio = (blob: Blob, filename = 'speech.wav'): string => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return url;
};
