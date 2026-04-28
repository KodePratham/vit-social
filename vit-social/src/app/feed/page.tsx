"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ProfileAvatar } from "@/components/profile-avatar";
import { getDisplayName, type UserProfile } from "@/lib/profile-shared";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type FeedAuthor = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type FeedPost = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: FeedAuthor | null;
};

function authorToProfile(author: FeedAuthor): UserProfile {
  return {
    id: author.id,
    email: author.email,
    full_name: author.full_name,
    avatar_url: author.avatar_url,
    bio: null,
    instagram_account: null,
    twitter_account: null,
    linkedin_account: null,
    github_account: null,
    branch: null,
    division: null,
    created_at: "",
  };
}

async function parseApiJson(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Empty response (HTTP ${res.status}). Is MONGODB_URI set on Cloudflare? Check Worker logs.`,
    );
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const preview = trimmed.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`Non-JSON response (HTTP ${res.status}): ${preview}`);
  }
}

export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

  const fetchPostsFromApi = useCallback(async (): Promise<FeedPost[]> => {
    const res = await fetch("/api/posts", { credentials: "same-origin" });
    const payload = await parseApiJson(res);

    if (!res.ok) {
      const err =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : `Request failed (${res.status})`;
      throw new Error(err);
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !("posts" in payload) ||
      !Array.isArray((payload as { posts: unknown }).posts)
    ) {
      throw new Error("Unexpected response shape.");
    }

    return (payload as { posts: FeedPost[] }).posts;
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const loadForUser = async (targetUser: User | null) => {
      if (!targetUser) {
        if (mounted) {
          setPosts([]);
          setIsLoadingPosts(false);
        }
        return;
      }
      try {
        if (mounted) {
          setIsLoadingPosts(true);
        }
        const next = await fetchPostsFromApi();
        if (!mounted) {
          return;
        }
        setPosts(next);
        setErrorMessage("");
      } catch (e) {
        if (!mounted) {
          return;
        }
        setErrorMessage(e instanceof Error ? e.message : "Failed to load posts.");
      } finally {
        if (mounted) {
          setIsLoadingPosts(false);
        }
      }
    };

    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (userError) {
        setErrorMessage(userError.message);
        setIsLoading(false);
        return;
      }

      const initialUser = userData.user;
      setUser(initialUser);
      setIsLoading(false);
      await loadForUser(initialUser);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadForUser(nextUser);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchPostsFromApi]);

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setIsSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || isPosting) {
      return;
    }

    setIsPosting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: draft }),
      });

      let payload: unknown;
      try {
        payload = await parseApiJson(res);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Could not read server response.");
        setIsPosting(false);
        return;
      }

      if (!res.ok) {
        const err =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : `Request failed (${res.status})`;
        setErrorMessage(err);
        setIsPosting(false);
        return;
      }

      setDraft("");
      try {
        const next = await fetchPostsFromApi();
        setPosts(next);
        setErrorMessage("");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Failed to refresh posts.");
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to publish.");
    }

    setIsPosting(false);
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
            vitsocial<span className="font-normal">.xyz</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <Link
              href="/profile"
              className="rounded border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
            >
              Profile
            </Link>
            <Link
              href="/friends"
              className="rounded border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
            >
              Friends
            </Link>
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
              {isSigningOut ? "..." : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] space-y-4 px-3 py-4 sm:px-4">
        <div className="rounded border border-[#BDC7D8] bg-white shadow-sm">
          <div className="border-b border-[#DADDE1] bg-[#F5F6F7] px-4 py-3">
            <h1
              className="m-0 text-lg font-bold text-[#0E385F]"
              style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
            >
              Feed
            </h1>
            <p className="mt-1 text-xs text-[#606770]">
              Posts from you and your friends. Only accepted friends can see each other&apos;s posts.
            </p>
          </div>

          {errorMessage ? (
            <p className="border-b border-[#E41E3F]/40 bg-[#FFE4E1] p-3 text-xs font-medium text-[#7f1d1d]">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="p-4 text-sm text-[#606770]">Loading...</p>
          ) : !user ? (
            <p className="p-4 text-sm text-[#606770]">Sign in to see the feed.</p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="border-b border-[#E9EBEE] p-4">
                <label htmlFor="post-body" className="block text-xs font-semibold text-[#4B4F56]">
                  Share something
                </label>
                <textarea
                  id="post-body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  maxLength={8000}
                  placeholder="What’s on your mind?"
                  className="mt-2 w-full resize-y rounded-none border border-[#BDC7D8] bg-white p-2 text-sm text-[#1C1E21] outline-none focus:border-[#3B5998]"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-[#8A8D91]">{draft.length} / 8000</span>
                  <button
                    type="submit"
                    disabled={isPosting || !draft.trim()}
                    className="border border-[#29487D] bg-[#4267B2] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {isPosting ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>

              <div className="divide-y divide-[#E9EBEE]">
                {isLoadingPosts && posts.length === 0 ? (
                  <p className="p-4 text-sm text-[#606770]">Loading posts...</p>
                ) : posts.length === 0 ? (
                  <p className="p-4 text-sm text-[#606770]">
                    No posts yet. Add friends to see their updates, or write the first post.
                  </p>
                ) : (
                  posts.map((post) => {
                    const author = post.author;
                    const display = author
                      ? getDisplayName(authorToProfile(author), author.email)
                      : "VIT student";

                    return (
                      <article key={post.id} className="flex gap-3 p-4">
                        {author ? (
                          <ProfileAvatar profile={authorToProfile(author)} name={display} size="h-10 w-10 text-sm" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#BDC7D8] bg-[#E7EBF2] text-xs font-bold text-[#3B5998]">
                            ?
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="text-sm font-bold text-[#0E385F]">{display}</span>
                            <time
                              className="text-xs text-[#8A8D91]"
                              dateTime={post.createdAt}
                              title={post.createdAt}
                            >
                              {new Date(post.createdAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </time>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-[#1C1E21]">
                            {post.body}
                          </p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
