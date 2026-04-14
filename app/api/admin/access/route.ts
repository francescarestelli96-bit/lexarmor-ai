import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  createAdminAccessState,
  getClearedCookieOptions,
  getCookieOptions,
  toClientAccessState,
} from "@/lib/access";
import { readConfiguredEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const configuredKey = readConfiguredEnv("LEXARMOR_ADMIN_KEY");

    if (!configuredKey) {
      return Response.json(
        { error: "Accesso admin non configurato sul server." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { key?: string };
    const key = body.key?.trim();

    if (!key) {
      return Response.json(
        { error: "Inserisci la chiave admin." },
        { status: 400 }
      );
    }

    if (key !== configuredKey) {
      return Response.json(
        { error: "Chiave admin non valida." },
        { status: 401 }
      );
    }

    const access = createAdminAccessState();
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
    console.error("Admin access error", error);

    return Response.json(
      {
        error:
          "Non sono riuscito ad attivare l'accesso admin. Riprova tra poco.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    access: toClientAccessState(null),
  });

  response.cookies.set(ACCESS_COOKIE_NAME, "", getClearedCookieOptions());

  return response;
}
