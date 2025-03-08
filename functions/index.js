
// const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");

const getVoices = require("./routes/getVoices");
const synthesizeSpeech = require("./routes/synthesizeSpeech");

const app = express();
app.use(express.json());

app.get("/api/tts/voices", getVoices);
app.post("/api/tts/synthesize", synthesizeSpeech);

exports.ttsAPI = onRequest(app);
