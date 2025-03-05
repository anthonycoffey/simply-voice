/**
 * Frontend utility functions for working with the Google Text-to-Speech API
 * This code runs in the browser and communicates with your backend
 */

export interface Voice {
  id: string;
  name: string;
  lang: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

// Get all available voices from your backend
export const getVoices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch('/api/tts/voices');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }
    
    const voices = await response.json();
    return voices;
  } catch (error) {
    console.error("Error fetching voices:", error);
    return [];
  }
};

// Generate speech from text via your backend
export const generateSpeech = async (
  text: string,
  voiceId: string,
  lang: string,
  speakingRate = 1,
  pitch = 0
): Promise<{ audio: Blob; url: string }> => {
  try {
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
        lang,
        speakingRate,
        pitch
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate speech: ${response.statusText}`);
    }

    // Get the audio binary data
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { audio: audioBlob, url: audioUrl };
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

// Download the audio blob as a file
export const downloadAudio = (
  blob: Blob,
  filename = "speech.wav"
): string => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return url;
};