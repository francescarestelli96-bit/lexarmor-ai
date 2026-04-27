import { createHmac, timingSafeEqual } from "node:crypto";
import { readConfiguredEnv } from "@/lib/env";

export type PlanId = "basic" | "pro";
export type AccessSource = "checkout" | "admin";

export type StoredAccessState = {
  plan: PlanId;
  remainingScans: number | null;
  expiresAt: string;
  checkoutSessionId: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  customerId?: string;
  issuedAt: string;
  source?: AccessSource;
};

export type ClientAccessState = {
  hasAccess: boolean;
  plan: PlanId | null;
  remainingScans: number | null;
  expiresAt: string | null;
  label: string | null;
  isAdmin: boolean;
  source: AccessSource | null;
};

export const ACCESS_COOKIE_NAME = "lexarmor_access";

const EMPTY_ACCESS_STATE: ClientAccessState = {
  hasAccess: false,
  plan: null,
  remainingScans: null,
  expiresAt: null,
  label: null,
  isAdmin: false,
  source: null,
};

function getSigningSecret() {
  return (
    readConfiguredEnv("LEXARMOR_ACCESS_SECRET") ||
    readConfiguredEnv("STRIPE_SECRET_KEY") ||
    readConfiguredEnv("LEXARMOR_ADMIN_KEY") ||
    ""
  );
}

function isAccessSource(value: unknown): value is AccessSource {
  return value === "checkout" || value === "admin";
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createAccessToken(access: StoredAccessState) {
  const payload = Buffer.from(JSON.stringify(access)).toString("base64url");
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function readAccessToken(token: string | undefined | null) {
  if (!token || !getSigningSecret()) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = signPayload(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as StoredAccessState;

    if (
      (parsed.plan !== "basic" && parsed.plan !== "pro") ||
      typeof parsed.expiresAt !== "string" ||
      typeof parsed.checkoutSessionId !== "string" ||
      typeof parsed.issuedAt !== "string" ||
      (parsed.subscriptionStatus !== undefined &&
        typeof parsed.subscriptionStatus !== "string") ||
      (parsed.customerId !== undefined && typeof parsed.customerId !== "string") ||
      (parsed.source !== undefined && !isAccessSource(parsed.source)) ||
      (parsed.remainingScans !== null &&
        (typeof parsed.remainingScans !== "number" || parsed.remainingScans < 0))
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isAccessActive(access: StoredAccessState | null) {
  if (!access) {
    return false;
  }

  if (Number.isNaN(Date.parse(access.expiresAt))) {
    return false;
  }

  if (new Date(access.expiresAt).getTime() <= Date.now()) {
    return false;
  }

  if (access.plan === "basic") {
    return (access.remainingScans ?? 0) > 0;
  }

  return true;
}

export function toClientAccessState(
  access: StoredAccessState | null
): ClientAccessState {
  if (!isAccessActive(access) || !access) {
    return EMPTY_ACCESS_STATE;
  }

  const source = access.source ?? "checkout";
  const label =
    source === "admin"
      ? "Accesso admin di test"
      : access.plan === "basic"
        ? "Basic attivo"
        : "Pro attivo";

  return {
    hasAccess: true,
    plan: access.plan,
    remainingScans: access.plan === "basic" ? access.remainingScans ?? 0 : null,
    expiresAt: access.expiresAt,
    label,
    isAdmin: source === "admin",
    source,
  };
}

export function consumeAccess(access: StoredAccessState) {
  if (access.plan !== "basic") {
    return access;
  }

  const remaining = Math.max(0, (access.remainingScans ?? 0) - 1);

  if (remaining === 0) {
    return null;
  }

  return {
    ...access,
    remainingScans: remaining,
  };
}

export function getCookieMaxAge(access: StoredAccessState) {
  return Math.max(
    1,
    Math.floor((new Date(access.expiresAt).getTime() - Date.now()) / 1000)
  );
}

export function getCookieOptions(access: StoredAccessState) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getCookieMaxAge(access),
  };
}

export function getClearedCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function createAdminAccessState() {
  const now = new Date();

  return {
    plan: "pro" as const,
    remainingScans: null,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    checkoutSessionId: "admin-access",
    issuedAt: now.toISOString(),
    source: "admin" as const,
  };
}
