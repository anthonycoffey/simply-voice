require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const admin = require('../functions/node_modules/firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'simply-voice-452800',
  });
}

const express = require('express');
const app = express();
const ttsRoutes = require('./services/tts-service');
const stripeWebhook = require('../functions/routes/stripe/stripeWebhook');

// Capture raw body for Stripe signature verification (same pattern as Cloud Function)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Stripe webhook — no auth, verified by Stripe signature
app.post('/api/stripe/webhook', stripeWebhook);

// TTS routes (no auth in local dev — trusted via Vite proxy)
app.use('/api/tts', ttsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Local dev server running on port ${PORT}`);
});
