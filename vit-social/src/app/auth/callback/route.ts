import { NextResponse } from "next/server";
import { isAllowedVitEmail } from "@/lib/auth/email-domain";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isAllowedVitEmail(user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/?error=domain`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
