import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedVitEmail } from "@/lib/auth/email-domain";
import { getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl() as string,
    getSupabaseKey() as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isAllowedVitEmail(user.email)) {
    if (request.nextUrl.pathname.startsWith("/api/posts")) {
      return NextResponse.json({ error: "Only @vit.edu accounts can use this app." }, { status: 403 });
    }

    if (
      request.nextUrl.pathname.startsWith("/profile") ||
      request.nextUrl.pathname.startsWith("/friends") ||
      request.nextUrl.pathname.startsWith("/feed")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "?error=domain";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (
    (request.nextUrl.pathname.startsWith("/profile") ||
      request.nextUrl.pathname.startsWith("/friends") ||
      request.nextUrl.pathname.startsWith("/feed")) &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
