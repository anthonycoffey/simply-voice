const admin = require("firebase-admin");

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://simply-voice-452800.web.app";

async function createCheckoutSession(req, res) {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const uid = req.user.uid;
    const email = req.user.email;

    // Check if user already has a Stripe customer ID
    const db = admin.firestore();
    const subDoc = await db.collection("subscriptions").doc(uid).get();
    let customerId = subDoc.exists ? subDoc.data().stripeCustomerId : null;

    // Create Stripe customer if they don't have one yet
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUID: uid },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/account?upgraded=true`,
      cancel_url: `${FRONTEND_URL}/pricing`,
      metadata: { firebaseUID: uid },
      subscription_data: {
        metadata: { firebaseUID: uid },
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}

module.exports = createCheckoutSession;
