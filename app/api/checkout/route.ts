import Stripe from "stripe";
import { readConfiguredEnv } from "@/lib/env";

type PlanId = "basic" | "pro";

const stripeSecretKey = readConfiguredEnv("STRIPE_SECRET_KEY");

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const planConfig: Record<
  PlanId,
  {
    label: string;
    mode: "payment" | "subscription";
    priceEnvKey: "STRIPE_BASIC_PRICE_ID" | "STRIPE_PRO_PRICE_ID";
  }
> = {
  basic: {
    label: "Basic",
    mode: "payment",
    priceEnvKey: "STRIPE_BASIC_PRICE_ID",
  },
  pro: {
    label: "Pro",
    mode: "subscription",
    priceEnvKey: "STRIPE_PRO_PRICE_ID",
  },
};

function isPlanId(value: unknown): value is PlanId {
  return value === "basic" || value === "pro";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { plan?: unknown };
    const plan = body.plan;

    if (!isPlanId(plan)) {
      return Response.json({ error: "Piano non valido." }, { status: 400 });
    }

    if (!stripe) {
      return Response.json(
        {
          error:
            "Stripe non e' configurato. Aggiungi STRIPE_SECRET_KEY nelle variabili ambiente.",
        },
        { status: 503 }
      );
    }

    const config = planConfig[plan];
    const priceId = process.env[config.priceEnvKey];

    if (!priceId) {
      return Response.json(
        {
          error: `Manca ${config.priceEnvKey}. Crea il prezzo in Stripe e aggiungilo alle variabili ambiente.`,
        },
        { status: 503 }
      );
    }

    const origin = new URL(request.url).origin;
    const successUrl = new URL("/", origin);
    successUrl.searchParams.set("tab", "analysis");
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("plan", plan);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    const cancelUrl = new URL("/", origin);
    cancelUrl.searchParams.set("tab", "plans");
    cancelUrl.searchParams.set("checkout", "cancel");
    cancelUrl.searchParams.set("plan", plan);

    const session = await stripe.checkout.sessions.create({
      mode: config.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      locale: "it",
      metadata: {
        plan,
        product_label: config.label,
      },
      payment_intent_data:
        config.mode === "payment"
          ? {
              metadata: {
                plan,
                product_label: config.label,
              },
            }
          : undefined,
      subscription_data:
        config.mode === "subscription"
          ? {
              metadata: {
                plan,
                product_label: config.label,
              },
            }
          : undefined,
    });

    if (!session.url) {
      throw new Error("Checkout URL non disponibile.");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout route error", error);

    return Response.json(
      {
        error:
          "Non sono riuscito a creare il checkout. Controlla Stripe oppure riprova tra poco.",
      },
      { status: 500 }
    );
  }
}
