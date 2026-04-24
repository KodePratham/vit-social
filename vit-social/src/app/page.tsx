"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LANDING_IMAGE_URL =
  "https://image-static.collegedunia.com/public/reviewPhotos/1150994/Screenshot%202025-11-29%20121734.png";

const ALLOWED_DOMAIN = "vit.edu";

function isAllowedVitEmail(email?: string | null) {
  return email?.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`) ?? false;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(isSupabaseConfigured);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err === "auth") {
      setAuthError("Sign-in could not be completed. Please try again.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;

    let isMounted = true;

    const hydrateSession = async () => {
      const { data, error } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
        setIsLoadingSession(false);
        return;
      }

      const nextSession = data.session;
      if (nextSession?.user?.email && !isAllowedVitEmail(nextSession.user.email)) {
        await client.auth.signOut();
        if (!isMounted) {
          return;
        }

        setSession(null);
        setAuthError("Only @vit.edu email addresses can sign in right now.");
        setIsLoadingSession(false);
        return;
      }

      setSession(nextSession);
      setIsLoadingSession(false);
    };

    void hydrateSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      if (nextSession?.user?.email && !isAllowedVitEmail(nextSession.user.email)) {
        window.setTimeout(async () => {
          await client.auth.signOut();
          if (!isMounted) {
            return;
          }

          setSession(null);
          setAuthError("Only @vit.edu email addresses can sign in right now.");
        }, 0);
        return;
      }

      setSession(nextSession);
      setAuthError("");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const user = useMemo<User | null>(() => session?.user ?? null, [session]);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_PROJECT_REF (or URL) and a public API key — see .env.example.",
      );
      return;
    }

    setIsAuthBusy(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
        options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: {
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setAuthError(error.message);
    }
    setIsAuthBusy(false);
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    setIsAuthBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
    setIsAuthBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#E7EBF2] text-[#1C1E21]">
      <header
        className="border-b border-[#1E3A5F]/30 bg-gradient-to-b from-[#3B5998] to-[#3B5998] py-3 pl-2 pr-3 text-white"
        style={{ fontFamily: "inherit" }}
      >
        <div className="mx-auto flex max-w-[980px] items-end justify-start gap-2 px-1">
          <span
            className="cursor-default select-none text-[2.1rem] font-bold leading-none tracking-[-0.5px] text-white sm:text-[2.5rem]"
            style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
          >
            vit<span className="font-normal">.social</span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[980px] flex-col items-stretch justify-center gap-0 px-2 pb-20 pt-10 sm:px-4 sm:pt-14 md:flex-row md:items-start md:pr-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 pl-0 pr-0 sm:pl-1 sm:flex-row sm:items-start md:pr-6">
          <div className="relative w-full shrink-0 overflow-hidden rounded border border-[#BDC7D8] bg-white shadow-sm sm:max-w-[min(100%,18rem)] md:max-w-[14rem]">
            <Image
              src={LANDING_IMAGE_URL}
              alt="Campus preview"
              width={560}
              height={420}
              className="h-auto w-full object-cover object-top"
              sizes="(min-width: 640px) 14rem, 100vw"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1
              className="m-0 max-w-[40rem] text-[1.1rem] font-bold leading-tight sm:text-[1.2rem] md:pr-4"
              style={{ color: "#0E385F" }}
            >
              vit.social helps you connect and share with the people in your life at VIT.
            </h1>
            <div className="mt-2 hidden h-px w-full max-w-md bg-[#9CB4D2]/60 sm:block" />
            {user ? (
              <p className="mt-3 text-sm">
                <Link
                  href="/dashboard"
                  className="font-semibold text-[#385898] underline decoration-[#385898] underline-offset-2 hover:text-[#0E385F]"
                >
                  Open your dashboard
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 w-full shrink-0 py-0 md:mt-0 md:w-[380px]">
          <div className="box-border rounded border border-[#BDC7D8] bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
            <h2
              className="m-0 text-[1.1rem] font-bold text-[#0E385F] sm:text-lg"
              style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
            >
              Log in to vit.social
            </h2>
            <p className="mt-2 text-[0.7rem] leading-snug text-[#606770] sm:text-xs">
              Use your <strong className="text-[#4b4f56]">@vit.edu</strong> Google account. Other
              email domains are not allowed.
            </p>

            {authError ? (
              <p className="mt-3 border border-[#E41E3F]/40 bg-[#FFE4E1] p-2 text-center text-xs font-medium text-[#7f1d1d]">
                {authError}
              </p>
            ) : null}

            <div
              className="mt-3 rounded border border-[#E9EBEE] bg-[#F0F2F5] p-2 text-center text-xs text-[#606770]"
              role="status"
            >
              {isLoadingSession
                ? "Checking your session…"
                : user?.email
                  ? `Signed in as ${user.email}`
                  : "Not signed in"}
            </div>

            <div className="mt-3 border-t border-[#DADDE1] pt-3">
              <button
                type="button"
                onClick={user ? handleSignOut : handleGoogleLogin}
                disabled={isAuthBusy || isLoadingSession || !isSupabaseConfigured}
                className="h-[26px] w-full min-w-0 border border-[#29487D] bg-[#4267B2] px-3 text-center text-sm font-bold leading-[24px] text-white shadow-[0_1px_1px_rgba(0,0,0,0.1)] enabled:cursor-pointer enabled:hover:bg-[#365899] enabled:active:bg-[#29487D] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
              >
                {isAuthBusy
                  ? "Please wait…"
                  : user
                    ? "Log Out"
                    : "Log in with Google (@vit.edu)"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="mx-auto mt-auto max-w-[980px] border-t border-[#BDC7D8] px-3 py-3 text-center text-xs text-[#606770] sm:px-4"
        style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
      >
        <p className="m-0">
          <span className="text-[#385898]">About</span>
          <span className="mx-2 text-[#9CB4D2]">|</span>
          <span className="text-[#385898]">Help</span>
          <span className="mx-2 text-[#9CB4D2]">|</span>
          <span className="text-[#385898]">Campus</span>
        </p>
        <p className="m-0 mt-2 text-[#8a8d91]">vit.social &middot; For VIT students &middot; 2026</p>
      </footer>
    </div>
  );
}
