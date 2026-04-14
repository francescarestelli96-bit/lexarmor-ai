import Stripe from "stripe";
import type { StoredAccessState } from "@/lib/access";
import { readConfiguredEnv } from "@/lib/env";

const stripeSecretKey = readConfiguredEnv("STRIPE_SECRET_KEY");

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const itemPeriodEnd = subscription.items.data.reduce(
    (latest, item) =>
      typeof item.current_period_end === "number"
        ? Math.max(latest, item.current_period_end)
        : latest,
    0
  );

  return itemPeriodEnd || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}

export async function syncStripeBackedAccess(access: StoredAccessState | null) {
  if (!access || access.source === "admin" || access.plan !== "pro") {
    return { access, changed: false };
  }

  if (!stripe || !access.subscriptionId) {
    return { access, changed: false };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(access.subscriptionId);

    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      return { access: null, changed: true };
    }

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;
    const expiresAt = new Date(
      getSubscriptionPeriodEnd(subscription) * 1000
    ).toISOString();
    const nextAccess: StoredAccessState = {
      ...access,
      expiresAt,
      customerId,
      subscriptionStatus: subscription.status,
    };

    const changed =
      nextAccess.expiresAt !== access.expiresAt ||
      nextAccess.customerId !== access.customerId ||
      nextAccess.subscriptionStatus !== access.subscriptionStatus;

    return {
      access: nextAccess,
      changed,
    };
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      return { access: null, changed: true };
    }

    return { access, changed: false };
  }
}
