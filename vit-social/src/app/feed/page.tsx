"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SiteHeader } from "@/components/site-header";
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
    seeking_roommate: false,
    roommate_hostel_campus: null,
    roommate_gender: null,
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
    <div className="min-h-screen bg-[var(--fb-bg)] text-[var(--fb-text)]">
      <SiteHeader
        userEmail={user?.email ?? null}
        onSignOut={handleSignOut}
        isBusy={isSigningOut || isLoading}
      />

      <main className="mx-auto max-w-[640px] space-y-4 px-3 py-4 sm:px-4">
        <div className="fb-panel">
          <div className="fb-panel-header">
            <h1 className="fb-section-title m-0 text-lg">Feed</h1>
            <p className="mt-1 text-xs text-[color:var(--fb-text-dim)]">
              Posts from you and your friends. Only accepted friends can see each other&apos;s posts.
            </p>
          </div>

          {errorMessage ? (
            <p className="border-b border-[color:var(--fb-error-border)] bg-[color:var(--fb-error-bg)] p-3 text-xs font-medium text-[color:var(--fb-error-text)]">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">Loading…</p>
          ) : !user ? (
            <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">Sign in to see the feed.</p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="border-b border-[#e9ebee] p-4">
                <label htmlFor="post-body" className="block text-xs font-semibold text-[#4b4f56]">
                  Share something
                </label>
                <textarea
                  id="post-body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  maxLength={8000}
                  placeholder="What's on your mind?"
                  className="fb-input mt-2 resize-y"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[color:var(--fb-text-muted)]">
                    {draft.length} / 8000
                  </span>
                  <button
                    type="submit"
                    disabled={isPosting || !draft.trim()}
                    className="fb-btn-primary"
                  >
                    {isPosting ? "Posting…" : "Post"}
                  </button>
                </div>
              </form>

              <div className="divide-y divide-[#e9ebee]">
                {isLoadingPosts && posts.length === 0 ? (
                  <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">Loading posts…</p>
                ) : posts.length === 0 ? (
                  <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
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
                          <ProfileAvatar
                            profile={authorToProfile(author)}
                            name={display}
                            size="h-10 w-10 text-sm"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[color:var(--fb-panel-border)] bg-[var(--fb-bg)] text-xs font-bold text-[color:var(--fb-blue)]">
                            ?
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="text-sm font-bold text-[#0e385f]">{display}</span>
                            <time
                              className="text-xs text-[color:var(--fb-text-muted)]"
                              dateTime={post.createdAt}
                              title={post.createdAt}
                            >
                              {new Date(post.createdAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </time>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-[var(--fb-text)]">
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
