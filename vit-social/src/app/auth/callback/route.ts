import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AUTH_LOG_PREFIX = "[vit-social auth callback]";

function logCallbackStep(step: string, details?: Record<string, unknown>) {
  console.info(`${AUTH_LOG_PREFIX} ${step}`, details ?? {});
}

function logCallbackError(step: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`${AUTH_LOG_PREFIX} ${step}`, {
    ...details,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  logCallbackStep("request received", {
    origin,
    next,
    hasCode: Boolean(code),
    hasError: searchParams.has("error"),
  });

  if (!code) {
    logCallbackError("missing authorization code", new Error("No code query parameter"), {
      providerError: searchParams.get("error") ?? null,
      providerErrorDescription: searchParams.get("error_description") ?? null,
    });
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  try {
    const supabase = await createClient();
    logCallbackStep("Supabase server client created");

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logCallbackStep("code exchanged for session", { redirectTo: `${origin}${next}` });
      return NextResponse.redirect(`${origin}${next}`);
    }

    logCallbackError("code exchange failed", error, { next });
  } catch (error) {
    logCallbackError("callback handler failed", error, { next });
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
