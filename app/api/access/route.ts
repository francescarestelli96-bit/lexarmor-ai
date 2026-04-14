import { cookies } from "next/headers";
import {
  ACCESS_COOKIE_NAME,
  readAccessToken,
  toClientAccessState,
} from "@/lib/access";

export async function GET() {
  const cookieStore = await cookies();
  const access = readAccessToken(cookieStore.get(ACCESS_COOKIE_NAME)?.value);

  return Response.json({ access: toClientAccessState(access) });
}
