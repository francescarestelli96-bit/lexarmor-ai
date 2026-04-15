import Stripe from "stripe";
import { NextResponse } from "next/server";
import { readConfiguredEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const stripeWebhookSecret = readConfiguredEnv("STRIPE_WEBHOOK_SECRET");

function extractEventSummary(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      return {
        eventType: event.type,
        checkoutSessionId: session.id,
        plan: session.metadata?.plan ?? null,
        mode: session.mode,
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      const subscription = event.data.object as Stripe.Subscription;

      return {
        eventType: event.type,
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id,
      };
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const parentSubscription = invoice.parent?.subscription_details?.subscription;

      return {
        eventType: event.type,
        invoiceId: invoice.id,
        subscriptionId:
          typeof parentSubscription === "string"
            ? parentSubscription
            : parentSubscription?.id,
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id,
      };
    }
    default:
      return {
        eventType: event.type,
        eventId: event.id,
      };
  }
}

export async function POST(request: Request) {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return NextResponse.json(
        {
          error:
            "Webhook Stripe non configurato. Aggiungi STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET.",
        },
        { status: 503 }
      );
    }

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Header stripe-signature mancante." },
        { status: 400 }
      );
    }

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeWebhookSecret
    );

    const summary = extractEventSummary(event);
    console.info("Stripe webhook received", summary);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook error",
      error instanceof Error ? error.message : "unknown_error"
    );

    return NextResponse.json(
      { error: "Webhook Stripe non valido." },
      { status: 400 }
    );
  }
}
