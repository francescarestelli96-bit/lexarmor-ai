import { cookies } from "next/headers";
import {
  ACCESS_COOKIE_NAME,
  readAccessToken,
  toClientAccessState,
} from "@/lib/access";
import { readConfiguredEnv } from "@/lib/env";

export async function GET() {
  const cookieStore = await cookies();
  const access = readAccessToken(cookieStore.get(ACCESS_COOKIE_NAME)?.value);
  const adminConfigured = Boolean(readConfiguredEnv("LEXARMOR_ADMIN_KEY"));

  return Response.json({
    access: toClientAccessState(access),
    adminConfigured,
  });
}
