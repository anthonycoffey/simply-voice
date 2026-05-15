const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");

const getVoices = require("./routes/getVoices");
const synthesizeSpeech = require("./routes/synthesizeSpeech");

admin.initializeApp();

const app = express();
app.use(express.json());

// Verify Firebase ID token on every request.
// The frontend sends: Authorization: Bearer <idToken>
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: missing token" });
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res.status(403).json({ error: "Unauthorized: invalid or expired token" });
  }
};

app.use(authenticate);
app.get("/api/tts/voices", getVoices);
app.post("/api/tts/synthesize", synthesizeSpeech);

exports.ttsAPI = onRequest(app);
