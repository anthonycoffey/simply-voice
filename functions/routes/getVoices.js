const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

const ttsClient = new TextToSpeechClient();

function getVoiceType(name) {
  if (name.includes("Neural2"))  return "Neural2";
  if (name.includes("Chirp3-HD")) return "Chirp3-HD";
  if (name.includes("Chirp-HD")) return "Chirp-HD";
  if (name.includes("Studio"))   return "Studio";
  if (name.includes("Wavenet"))  return "Wavenet";
  if (name.includes("News"))     return "News";
  if (name.includes("Casual"))   return "Casual";
  if (name.includes("Polyglot")) return "Polyglot";
  if (name.includes("Standard")) return "Standard";
  return "Other";
}

function getVoiceTier(name) {
  if (name.includes("Neural2"))   return 5;
  if (name.includes("Chirp3-HD")) return 4;
  if (name.includes("Chirp-HD"))  return 3;
  if (name.includes("Studio"))    return 2.5;
  if (name.includes("Wavenet"))   return 2;
  return 1;
}

async function getVoices(req, res) {
  try {
    const [result] = await ttsClient.listVoices({});

    let voices = result.voices.filter((v) => v.languageCodes.includes("en-US"));

    voices.sort((a, b) => {
      const tierDiff = getVoiceTier(b.name) - getVoiceTier(a.name);
      if (tierDiff !== 0) return tierDiff;
      if (a.ssmlGender !== b.ssmlGender) return a.ssmlGender === "FEMALE" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    voices = voices.slice(0, 30).map((v) => ({
      id: v.name,
      name: v.name.split("-").pop(),
      lang: v.languageCodes[0],
      ssmlGender: v.ssmlGender,
      naturalSampleRateHertz: v.naturalSampleRateHertz,
      type: getVoiceType(v.name),
      tier: getVoiceTier(v.name),
    }));

    res.json(voices);
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({ error: "Failed to fetch voices" });
  }
}

module.exports = getVoices;
