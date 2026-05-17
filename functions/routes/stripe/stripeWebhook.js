const admin = require("firebase-admin");

async function stripeWebhook(req, res) {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const db = admin.firestore();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const uid = session.metadata?.firebaseUID;
        if (!uid) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        await db
          .collection("subscriptions")
          .doc(uid)
          .set(
            {
              tier: "pro",
              status: subscription.status,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

        console.log(`Upgraded user ${uid} to Pro`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const uid = subscription.metadata?.firebaseUID;
        if (!uid) break;

        await db
          .collection("subscriptions")
          .doc(uid)
          .set(
            {
              status: subscription.status,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const uid = subscription.metadata?.firebaseUID;
        if (!uid) break;

        await db
          .collection("subscriptions")
          .doc(uid)
          .set(
            {
              tier: "free",
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

        console.log(`Downgraded user ${uid} to Free`);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

module.exports = stripeWebhook;
