/**
 * Backend service for Google Text-to-Speech API
 * This code runs on your server and securely manages Google Cloud authentication
 */

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const express = require('express');
const router = express.Router();
const ttsClient = new TextToSpeechClient();

// GET /api/tts/voices - Returns best English US voice models
router.get('/voices', async (req, res) => {
  try {
    // Call Google API to list voices
    const [result] = await ttsClient.listVoices({});
    
    // Transform results to match your frontend interface
    let voices = result.voices;
    
    // Filter voices to only include English US voices
    voices = voices.filter(voice => voice.languageCodes.includes('en-US'));
    
    // Sort voices by quality indicators
    voices.sort((a, b) => {
      // Define quality tiers (higher number = higher quality)
      const getTier = (name) => {
        if (name.includes('Neural2')) return 5;
        if (name.includes('Chirp3-HD')) return 4;
        if (name.includes('Chirp-HD')) return 3;
        if (name.includes('Studio')) return 2.5;
        if (name.includes('Wavenet')) return 2;
        if (name.includes('News')) return 1.5;
        if (name.includes('Standard')) return 1;
        return 0;
      };
      
      const aTier = getTier(a.name);
      const bTier = getTier(b.name);
      
      // Compare tiers first
      if (aTier !== bTier) return bTier - aTier;
      
      // If same tier, sort by gender for balanced selection
      if (a.ssmlGender !== b.ssmlGender) {
        // Alternate between genders 
        return a.ssmlGender === 'FEMALE' ? -1 : 1;
      }
      
      // Lastly sort by name
      return a.name.localeCompare(b.name);
    });
    
    // Limit to top 30 voices
    voices = voices.slice(0, 30);
    
    // Transform for frontend
    voices = voices.map(voice => ({
      id: voice.name,
      name: voice.name.split('-').pop(),
      lang: voice.languageCodes[0],
      ssmlGender: voice.ssmlGender,
      naturalSampleRateHertz: voice.naturalSampleRateHertz,
      // Add detailed voice type information for better frontend filtering
      type: getVoiceType(voice.name),
      tier: getVoiceTier(voice.name)
    }));
    
    // Helper function to get the voice type
    function getVoiceType(name) {
      if (name.includes('Neural2')) return 'Neural2';
      if (name.includes('Chirp3-HD')) return 'Chirp3-HD';
      if (name.includes('Chirp-HD')) return 'Chirp-HD';
      if (name.includes('Studio')) return 'Studio';
      if (name.includes('Wavenet')) return 'Wavenet';
      if (name.includes('News')) return 'News';
      if (name.includes('Casual')) return 'Casual';
      if (name.includes('Polyglot')) return 'Polyglot';
      if (name.includes('Standard')) return 'Standard';
      return 'Other';
    }
    
    // Helper function to get voice quality tier (1-5, higher is better)
    function getVoiceTier(name) {
      if (name.includes('Neural2')) return 5;
      if (name.includes('Chirp3-HD')) return 4;
      if (name.includes('Chirp-HD')) return 3;
      if (name.includes('Studio')) return 2.5;
      return name.includes('Wavenet') ? 2 : 1;
    }
    
    return res.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    return res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// POST /api/tts/synthesize - Converts text to speech
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voiceId, speakingRate, pitch, lang } = req.body;
    
    if (!text || !voiceId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Prepare the request
    const request = {
      input: { text },
      voice: {
        name: voiceId,
        languageCode: lang,
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        speakingRate: speakingRate || 1.0,
        pitch: pitch || 0.0,
      },
    };
    
    // Call Google API to synthesize speech
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Set appropriate headers
    res.set('Content-Type', 'audio/wav');
    res.set('Content-Disposition', `attachment; filename="speech.wav"`);
    
    // Send audio content directly to the client
    return res.send(Buffer.from(response.audioContent));
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    return res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

module.exports = router;