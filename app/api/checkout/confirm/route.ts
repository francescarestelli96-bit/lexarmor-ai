import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  ACCESS_COOKIE_NAME,
  type PlanId,
  createAccessToken,
  getCookieOptions,
  toClientAccessState,
  type StoredAccessState,
} from "@/lib/access";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function isPlanId(value: unknown): value is PlanId {
  return value === "basic" || value === "pro";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return Response.json(
        { error: "Sessione Stripe mancante." },
        { status: 400 }
      );
    }

    if (!stripe) {
      return Response.json(
        { error: "Stripe non e' configurato sul server." },
        { status: 503 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const plan = session.metadata?.plan;

    if (!isPlanId(plan)) {
      return Response.json(
        { error: "Piano Stripe non riconosciuto." },
        { status: 400 }
      );
    }

    let access: StoredAccessState;

    if (plan === "basic") {
      if (session.payment_status !== "paid") {
        return Response.json(
          { error: "Il pagamento non risulta completato." },
          { status: 402 }
        );
      }

      access = {
        plan,
        remainingScans: 1,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        checkoutSessionId: session.id,
        issuedAt: new Date().toISOString(),
      };
    } else {
      const subscription =
        typeof session.subscription === "object" && session.subscription
          ? session.subscription
          : null;

      if (
        !subscription ||
        (subscription.status !== "active" && subscription.status !== "trialing")
      ) {
        return Response.json(
          { error: "L'abbonamento non risulta ancora attivo." },
          { status: 402 }
        );
      }

      const currentPeriodEnd =
        subscription.items.data.reduce(
          (latest, item) => Math.max(latest, item.current_period_end),
          0
        ) ||
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      access = {
        plan,
        remainingScans: null,
        expiresAt: new Date(currentPeriodEnd * 1000).toISOString(),
        checkoutSessionId: session.id,
        subscriptionId: subscription.id,
        issuedAt: new Date().toISOString(),
      };
    }

    const response = NextResponse.json({
      access: toClientAccessState(access),
    });

    response.cookies.set(
      ACCESS_COOKIE_NAME,
      createAccessToken(access),
      getCookieOptions(access)
    );

    return response;
  } catch (error) {
    console.error("Checkout confirm error", error);

    return Response.json(
      {
        error:
          "Non sono riuscito a confermare il pagamento. Riprova dalla schermata dei piani.",
      },
      { status: 500 }
    );
  }
}
