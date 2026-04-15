import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  getClearedCookieOptions,
  getCookieOptions,
  readAccessToken,
  toClientAccessState,
} from "@/lib/access";
import { readConfiguredEnv } from "@/lib/env";
import { syncStripeBackedAccess } from "@/lib/stripe";

export async function GET() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const access = readAccessToken(rawToken);
  const synced = await syncStripeBackedAccess(access);
  const adminConfigured = Boolean(readConfiguredEnv("LEXARMOR_ADMIN_KEY"));
  const response = NextResponse.json({
    access: toClientAccessState(synced.access),
    adminConfigured,
  });

  if (rawToken && !synced.access) {
    response.cookies.set(ACCESS_COOKIE_NAME, "", getClearedCookieOptions());
  } else if (synced.access && synced.changed) {
    response.cookies.set(
      ACCESS_COOKIE_NAME,
      createAccessToken(synced.access),
      getCookieOptions(synced.access)
    );
  }

  return response;
}
