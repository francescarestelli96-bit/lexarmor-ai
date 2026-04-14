import { createHmac, timingSafeEqual } from "node:crypto";

export type PlanId = "basic" | "pro";

export type StoredAccessState = {
  plan: PlanId;
  remainingScans: number | null;
  expiresAt: string;
  checkoutSessionId: string;
  subscriptionId?: string;
  issuedAt: string;
};

export type ClientAccessState = {
  hasAccess: boolean;
  plan: PlanId | null;
  remainingScans: number | null;
  expiresAt: string | null;
  label: string | null;
};

export const ACCESS_COOKIE_NAME = "lexarmor_access";

const EMPTY_ACCESS_STATE: ClientAccessState = {
  hasAccess: false,
  plan: null,
  remainingScans: null,
  expiresAt: null,
  label: null,
};

function getSigningSecret() {
  return process.env.LEXARMOR_ACCESS_SECRET || process.env.STRIPE_SECRET_KEY || "";
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

  return {
    hasAccess: true,
    plan: access.plan,
    remainingScans: access.plan === "basic" ? access.remainingScans ?? 0 : null,
    expiresAt: access.expiresAt,
    label: access.plan === "basic" ? "Basic attivo" : "Pro attivo",
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
