const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const express = require("express");

const getVoices = require("./routes/getVoices");
const synthesizeSpeech = require("./routes/synthesizeSpeech");
const createCheckoutSession = require("./routes/stripe/createCheckoutSession");
const createPortalSession = require("./routes/stripe/createPortalSession");
const stripeWebhook = require("./routes/stripe/stripeWebhook");

admin.initializeApp();

// Declare secrets — injected as process.env.* at runtime
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const stripeProPriceId = defineSecret("STRIPE_PRO_PRICE_ID");

const app = express();

// ─── JSON body parser — verify callback saves rawBody for Stripe signature ───
// Firebase Functions Gen 2 (Cloud Run) doesn't play well with express.raw()
// on a specific route; the body stream is consumed before route-level middleware
// can buffer it. Capturing via the verify hook is the reliable workaround.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─── Stripe webhook (no Firebase auth — verified by Stripe signature instead) ─
app.post("/api/stripe/webhook", stripeWebhook);

// ─── Firebase ID token auth middleware ────────────────────────────────────────
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
    return res
      .status(403)
      .json({ error: "Unauthorized: invalid or expired token" });
  }
};

app.use(authenticate);

// ─── TTS routes ───────────────────────────────────────────────────────────────
app.get("/api/tts/voices", getVoices);
app.post("/api/tts/synthesize", synthesizeSpeech);

// ─── Stripe routes (authenticated) ───────────────────────────────────────────
app.post("/api/stripe/create-checkout-session", createCheckoutSession);
app.post("/api/stripe/create-portal-session", createPortalSession);

exports.ttsAPI = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret, stripeProPriceId] },
  app
);
