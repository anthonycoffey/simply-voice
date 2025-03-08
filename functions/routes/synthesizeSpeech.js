const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

const ttsClient = new TextToSpeechClient();

async function synthesizeSpeech(req, res) {
  try {
    const { text, voiceId, speakingRate, pitch, lang } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const request = {
      input: { text },
      voice: { name: voiceId, languageCode: lang },
      audioConfig: {
        audioEncoding: "LINEAR16",
        speakingRate: speakingRate || 1.0,
        pitch: pitch || 0.0,
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    res.set("Content-Type", "audio/wav");
    res.set("Content-Disposition", `attachment; filename="speech.wav"`);
    res.send(Buffer.from(response.audioContent));
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    res.status(500).json({ error: "Failed to synthesize speech" });
  }
}

module.exports = synthesizeSpeech;
