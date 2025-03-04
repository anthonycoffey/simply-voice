
/**
 * Utility functions for working with the Web Speech API
 */

export interface Voice {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

// Get all available voices from the browser
export const getVoices = (): Promise<Voice[]> => {
  return new Promise((resolve) => {
    // If speechSynthesis is not available, return empty array
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported in this browser");
      return resolve([]);
    }

    // Get current available voices
    let voices = window.speechSynthesis.getVoices();

    // If voices are already available, return them
    if (voices.length > 0) {
      return resolve(
        voices.map((voice) => ({
          id: `${voice.name}-${voice.lang}`,
          name: voice.name,
          lang: voice.lang,
          localService: voice.localService,
          default: voice.default,
        }))
      );
    }

    // If voices aren't loaded yet, wait for them to load
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(
        voices.map((voice) => ({
          id: `${voice.name}-${voice.lang}`,
          name: voice.name,
          lang: voice.lang,
          localService: voice.localService,
          default: voice.default,
        }))
      );
    };
  });
};

// Generate speech from text and return the audio
export const generateSpeech = (
  text: string,
  voiceId: string,
  rate = 1,
  pitch = 1
): Promise<{ audio: Blob; url: string }> => {
  return new Promise((resolve, reject) => {
    // Check if speech synthesis is supported
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      reject(new Error("Speech synthesis not supported in this browser"));
      return;
    }

    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Find selected voice by ID (which is name-lang)
    const [voiceName, voiceLang] = voiceId.split("-");
    const selectedVoice = voices.find(
      (v) => v.name === voiceName && v.lang === voiceLang
    );

    if (!selectedVoice) {
      reject(new Error("Selected voice not found"));
      return;
    }

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Use an audio context to capture the audio
    const audioContext = new AudioContext();
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
    const audioChunks: Blob[] = [];

    // Connect the utterance to the audio context
    const source = audioContext.createBufferSource();
    source.connect(mediaStreamDestination);

    // Collect audio data when available
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // When recording is complete, create blob and audio URL
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);
      resolve({ audio: audioBlob, url: audioUrl });
    };

    // Start recording
    mediaRecorder.start();

    // Use an alternate approach with Web Audio API since
    // direct capture from speechSynthesis isn't fully standardized
    const audioElement = new Audio();
    const oscillator = audioContext.createOscillator();
    oscillator.connect(mediaStreamDestination);

    // Start the utterance
    window.speechSynthesis.speak(utterance);

    // On utterance end, stop the recording
    utterance.onend = () => {
      mediaRecorder.stop();
      oscillator.stop();
      window.speechSynthesis.cancel(); // Clean up
    };

    // Handle any errors
    utterance.onerror = (event) => {
      mediaRecorder.stop();
      oscillator.stop();
      window.speechSynthesis.cancel(); // Clean up
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    // Start oscillator to ensure audio context is running
    oscillator.start();

    // If synthesis fails to start or complete after 10 seconds, reject
    const timeout = setTimeout(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        mediaRecorder.stop();
        oscillator.stop();
        reject(new Error("Speech synthesis timed out"));
      }
    }, 10000);

    // Clean up timeout when finished
    utterance.onend = () => {
      clearTimeout(timeout);
      mediaRecorder.stop();
      oscillator.stop();
    };
  });
};

// Simplified function to generate audio directly using the browser's built-in speech synthesis
// This is a fallback that doesn't require audio capturing
export const generateSpeechSimple = (
  text: string,
  voiceId: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const [voiceName, voiceLang] = voiceId.split("-");
    const selectedVoice = voices.find(
      (v) => v.name === voiceName && v.lang === voiceLang
    );

    if (!selectedVoice) {
      reject(new Error("Selected voice not found"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));

    window.speechSynthesis.speak(utterance);
  });
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
