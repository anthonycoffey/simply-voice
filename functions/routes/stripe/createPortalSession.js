const admin = require("firebase-admin");

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://simply-voice-452800.web.app";

async function createPortalSession(req, res) {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const uid = req.user.uid;

    const db = admin.firestore();
    const subDoc = await db.collection("subscriptions").doc(uid).get();

    if (!subDoc.exists || !subDoc.data().stripeCustomerId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subDoc.data().stripeCustomerId,
      return_url: `${FRONTEND_URL}/account`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
}

module.exports = createPortalSession;
