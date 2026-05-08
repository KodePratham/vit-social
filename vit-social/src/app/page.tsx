"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { ALLOWED_EMAIL_DOMAIN, isAllowedVitEmail } from "@/lib/auth/email-domain";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LANDING_IMAGE_URL =
  "https://image-static.collegedunia.com/public/reviewPhotos/1150994/Screenshot%202025-11-29%20121734.png";

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

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSupabase(createClient());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const err = new URLSearchParams(window.location.search).get("error");
      if (err === "auth") {
        setAuthError("Sign-in could not be completed. Please try again.");
        window.history.replaceState(null, "", window.location.pathname);
      } else if (err === "domain") {
        setAuthError("Only @vit.edu email addresses can sign in right now.");
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
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
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        queryParams: {
          hd: ALLOWED_EMAIL_DOMAIN,
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
    <div className="flex min-h-screen flex-col bg-[var(--fb-bg)] text-[var(--fb-text)]">
      <header
        className="border-b border-[color:var(--fb-blue-darker)] text-white shadow-[0_1px_0_rgba(0,0,0,0.15)]"
        style={{
          background: "linear-gradient(to bottom, #4c6bb8 0%, #3b5998 55%, #365899 100%)",
          fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif",
        }}
      >
        <div className="mx-auto flex max-w-[980px] items-end justify-start gap-2 px-3 py-3">
          <span
            className="cursor-default select-none text-[2.1rem] font-bold leading-none tracking-[-0.5px] text-white sm:text-[2.5rem]"
            style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
          >
            vitsocial<span className="font-normal">.xyz</span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[980px] flex-col items-stretch justify-center gap-6 px-3 pb-12 pt-8 sm:px-4 sm:pt-14 md:flex-row md:items-start md:gap-8 md:pr-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative w-full shrink-0 overflow-hidden rounded border border-[color:var(--fb-panel-border)] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:max-w-[min(100%,18rem)] md:max-w-[14rem]">
            <Image
              src={LANDING_IMAGE_URL}
              alt="VIT campus preview"
              width={560}
              height={420}
              className="h-auto w-full object-cover object-top"
              sizes="(min-width: 640px) 14rem, 100vw"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1
              className="m-0 max-w-[40rem] text-[1.15rem] font-bold leading-tight text-[#0e385f] sm:text-[1.25rem] md:pr-4"
              style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
            >
              vitsocial.xyz helps you connect and share with the people in your life at VIT.
            </h1>

            <div className="mt-3 hidden h-px w-full max-w-md bg-[color:var(--fb-blue-light)]/60 sm:block" />

            <ul className="mt-4 space-y-1.5 text-sm text-[#4b4f56]">
              <li>— Google sign-in, limited to <strong className="text-[#1c1e21]">@vit.edu</strong></li>
              <li>— Build your profile with branch, division and social links</li>
              <li>— Add friends and share updates in a private feed</li>
              <li>— Find a roommate who matches your hostel campus</li>
            </ul>

            {user ? (
              <p className="mt-4 text-sm">
                <Link
                  href="/profile"
                  className="font-semibold text-[color:var(--fb-link)] underline decoration-[color:var(--fb-link)] underline-offset-2 hover:text-[#0e385f]"
                >
                  Open your profile →
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="w-full shrink-0 md:w-[360px]">
          <div className="fb-panel box-border p-4">
            <h2
              className="m-0 text-[1.1rem] font-bold text-[#0e385f] sm:text-lg"
              style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
            >
              Log in to vitsocial.xyz
            </h2>
            <p className="mt-2 text-xs leading-snug text-[color:var(--fb-text-dim)]">
              Use your <strong className="text-[#4b4f56]">@vit.edu</strong> Google account. Other
              email domains are not allowed.
            </p>

            {authError ? (
              <p className="mt-3 border border-[color:var(--fb-error-border)] bg-[color:var(--fb-error-bg)] p-2 text-center text-xs font-medium text-[color:var(--fb-error-text)]">
                {authError}
              </p>
            ) : null}

            <div
              className="mt-3 rounded border border-[#e9ebee] bg-[#f0f2f5] p-2 text-center text-xs text-[color:var(--fb-text-dim)]"
              role="status"
              aria-live="polite"
            >
              {isLoadingSession
                ? "Checking your session…"
                : user?.email
                  ? `Signed in as ${user.email}`
                  : "Not signed in"}
            </div>

            <div className="mt-4 border-t border-[color:var(--fb-divider)] pt-3">
              <button
                type="button"
                onClick={user ? handleSignOut : handleGoogleLogin}
                disabled={isAuthBusy || isLoadingSession || !isSupabaseConfigured}
                className="fb-btn-primary fb-btn-lg w-full"
              >
                {isAuthBusy
                  ? "Please wait…"
                  : user
                    ? "Log out"
                    : "Log in with Google (@vit.edu)"}
              </button>

              {!isSupabaseConfigured ? (
                <p className="mt-2 text-center text-[11px] text-[color:var(--fb-text-muted)]">
                  Supabase is not configured — see <code>.env.example</code>.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <footer
        className="mt-auto border-t border-[color:var(--fb-panel-border)] bg-white/60"
        style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
      >
        <div className="mx-auto max-w-[980px] px-4 py-4 text-center text-xs text-[color:var(--fb-text-dim)]">
          <p className="m-0">
            <a
              href="https://github.com/vit-social/vit-social"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--fb-link)] hover:underline"
            >
              GitHub
            </a>
            <span className="mx-2 text-[color:var(--fb-blue-light)]">|</span>
            <Link href="/" className="text-[color:var(--fb-link)] hover:underline">
              About
            </Link>
            <span className="mx-2 text-[color:var(--fb-blue-light)]">|</span>
            <Link href="/exams" className="text-[color:var(--fb-link)] hover:underline">
              Exams
            </Link>
            <span className="mx-2 text-[color:var(--fb-blue-light)]">|</span>
            <span className="text-[color:var(--fb-text-muted)]">For VIT students only</span>
          </p>
          <p className="m-0 mt-2 text-[color:var(--fb-text-muted)]">
            vitsocial.xyz · Open source · 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
