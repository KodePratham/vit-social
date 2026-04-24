"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data.user);
        setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setIsSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#E7EBF2] text-[#1C1E21]">
      <header
        className="border-b border-[#1E3A5F]/30 bg-gradient-to-b from-[#3B5998] to-[#3B5998] py-3 pl-2 pr-3 text-white"
        style={{ fontFamily: "inherit" }}
      >
        <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3 px-1">
          <Link
            href="/"
            className="select-none text-[1.4rem] font-bold leading-none tracking-[-0.5px] text-white decoration-white hover:underline sm:text-[1.6rem]"
            style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
          >
            vit<span className="font-normal">.social</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {!isLoading && user?.email ? (
              <span className="hidden max-w-[12rem] truncate text-xs text-white/90 sm:inline">
                {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut || isLoading}
              className="rounded border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold text-white enabled:hover:bg-white/20 disabled:opacity-50"
            >
              {isSigningOut ? "…" : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[980px] px-4 py-12 sm:px-6">
        <h1
          className="m-0 text-2xl font-bold text-[#0E385F] sm:text-3xl"
          style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
        >
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-[#606770]">Your home base on vit.social.</p>

        <div className="mt-8 rounded border border-[#BDC7D8] bg-white p-8 text-center shadow-sm">
          <p
            className="m-0 text-lg font-bold text-[#0E385F] sm:text-xl"
            style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
          >
            Coming soon
          </p>
          <p className="mt-2 m-0 text-sm text-[#606770]">
            We are building the rest of the experience. Check back for feeds, events, and more.
          </p>
        </div>
      </main>
    </div>
  );
}
