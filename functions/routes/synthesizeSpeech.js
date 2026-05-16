const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const admin = require("firebase-admin");

const ttsClient = new TextToSpeechClient();

const FREE_CHAR_LIMIT = 10_000;
const PRO_CHAR_LIMIT = 100_000;
const MAX_CHARS_PER_REQUEST = 4_800;

async function synthesizeSpeech(req, res) {
  try {
    const { text, voiceId, speakingRate, pitch, lang } = req.body;
    const uid = req.user.uid;

    if (!text || !voiceId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (text.length > MAX_CHARS_PER_REQUEST) {
      return res.status(400).json({
        error: `Text exceeds the ${MAX_CHARS_PER_REQUEST.toLocaleString()} character limit per request`,
        max: MAX_CHARS_PER_REQUEST,
      });
    }

    const db = admin.firestore();

    // Read subscription + profile usage in parallel
    const [subDoc, profileDoc] = await Promise.all([
      db.collection("subscriptions").doc(uid).get(),
      db.collection("profiles").doc(uid).get(),
    ]);

    const sub = subDoc.exists ? subDoc.data() : null;
    const tier =
      sub && sub.status === "active" && sub.tier === "pro" ? "pro" : "free";
    const limit = tier === "pro" ? PRO_CHAR_LIMIT : FREE_CHAR_LIMIT;

    const profile = profileDoc.exists ? profileDoc.data() : {};
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const charsUsed =
      profile.period_month === currentMonth
        ? profile.chars_this_month || 0
        : 0;

    if (charsUsed + text.length > limit) {
      return res.status(429).json({
        error: "Monthly character limit exceeded. Upgrade to Pro for more.",
        chars_used: charsUsed,
        chars_requested: text.length,
        limit,
        tier,
      });
    }

    // Synthesize
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { name: voiceId, languageCode: lang },
      audioConfig: {
        audioEncoding: "LINEAR16",
        speakingRate: Math.min(Math.max(speakingRate || 1.0, 0.25), 4.0),
        pitch: Math.min(Math.max(pitch || 0.0, -20), 20),
      },
    });

    // Update usage after successful synthesis
    await db
      .collection("profiles")
      .doc(uid)
      .set(
        {
          chars_this_month: charsUsed + text.length,
          period_month: currentMonth,
        },
        { merge: true }
      );

    res.set("Content-Type", "audio/wav");
    res.set("Content-Disposition", `attachment; filename="speech.wav"`);
    res.send(Buffer.from(response.audioContent));
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    res.status(500).json({ error: "Failed to synthesize speech" });
  }
}

module.exports = synthesizeSpeech;
