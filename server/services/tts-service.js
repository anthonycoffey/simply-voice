// Delegate to the canonical function route handlers so there is a single
// source of truth for TTS logic. This local Express server is used in dev
// only (no auth middleware — requests coming through Vite's proxy are
// already trusted on localhost).
const express = require("express");
const router = express.Router();

const getVoices = require("../../functions/routes/getVoices");
const synthesizeSpeech = require("../../functions/routes/synthesizeSpeech");

router.get("/voices", getVoices);
router.post("/synthesize", synthesizeSpeech);

module.exports = router;
