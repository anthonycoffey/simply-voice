const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

const ttsClient = new TextToSpeechClient();

async function getVoices(req, res) {
  try {
    const [result] = await ttsClient.listVoices({});
    let voices = result.voices.filter((voice) => voice.languageCodes.includes("en-US"));

    voices.sort((a, b) => {
      const getTier = (name) => {
        if (name.includes("Neural2")) return 5;
        if (name.includes("Chirp3-HD")) return 4;
        if (name.includes("Chirp-HD")) return 3;
        if (name.includes("Studio")) return 2.5;
        if (name.includes("Wavenet")) return 2;
        return 1;
      };

      return getTier(b.name) - getTier(a.name);
    });

    voices = voices.slice(0, 30).map((voice) => ({
      id: voice.name,
      name: voice.name.split("-").pop(),
      lang: voice.languageCodes[0],
      ssmlGender: voice.ssmlGender,
      naturalSampleRateHertz: voice.naturalSampleRateHertz,
    }));

    res.json(voices);
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({ error: "Failed to fetch voices" });
  }
}

module.exports = getVoices;
