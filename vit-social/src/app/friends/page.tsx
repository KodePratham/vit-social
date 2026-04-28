"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ProfileAvatar } from "@/components/profile-avatar";
import { computePeopleYouMayKnow } from "@/lib/friend-suggestions";
import {
  friendRequestSelect,
  getDisplayName,
  getSocialHref,
  profileSelect,
  type FriendRequest,
  type SocialField,
  type UserProfile,
} from "@/lib/profile-shared";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function FriendsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");
  const [busyProfileId, setBusyProfileId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<string | null>(null);
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
    if (!supabase) {
      return;
    }

    let mounted = true;

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

      const currentUser = userData.user;
      setUser(currentUser);

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      const [usersResult, requestsResult] = await Promise.all([
        supabase.from("users").select(profileSelect).order("created_at", { ascending: false }),
        supabase
          .from("friend_requests")
          .select(friendRequestSelect)
          .or(`requester_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) {
        return;
      }

      if (usersResult.error) {
        setErrorMessage(usersResult.error.message);
        setIsLoading(false);
        return;
      }

      if (requestsResult.error) {
        setErrorMessage(requestsResult.error.message);
        setIsLoading(false);
        return;
      }

      const nextProfiles = (usersResult.data ?? []) as UserProfile[];
      const nextProfile = nextProfiles.find((item) => item.id === currentUser.id) ?? null;

      setProfiles(nextProfiles);
      setFriendRequests((requestsResult.data ?? []) as FriendRequest[]);
      setProfile(nextProfile);
      setIsLoading(false);
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

  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);

  const pendingIncomingByRequesterId = useMemo(() => {
    if (!user) {
      return new Map<string, FriendRequest>();
    }

    const incoming = friendRequests.filter(
      (request) => request.receiver_id === user.id && request.status === "pending",
    );
    return new Map(incoming.map((request) => [request.requester_id, request]));
  }, [friendRequests, user]);

  const pendingOutgoingReceiverIds = useMemo(() => {
    if (!user) {
      return new Set<string>();
    }

    return new Set(
      friendRequests
        .filter((request) => request.requester_id === user.id && request.status === "pending")
        .map((request) => request.receiver_id),
    );
  }, [friendRequests, user]);

  const pendingPeerIds = useMemo(() => {
    if (!user) {
      return new Set<string>();
    }

    const set = new Set<string>();
    for (const r of friendRequests) {
      if (r.status !== "pending") {
        continue;
      }
      if (r.requester_id === user.id) {
        set.add(r.receiver_id);
      } else if (r.receiver_id === user.id) {
        set.add(r.requester_id);
      }
    }
    return set;
  }, [friendRequests, user]);

  const friendIds = useMemo(() => {
    if (!user) {
      return new Set<string>();
    }

    return new Set(
      friendRequests
        .filter((request) => request.status === "accepted")
        .map((request) =>
          request.requester_id === user.id ? request.receiver_id : request.requester_id,
        ),
    );
  }, [friendRequests, user]);

  const friends = useMemo(() => {
    return [...friendIds]
      .map((id) => profileById.get(id))
      .filter((item): item is UserProfile => Boolean(item))
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [friendIds, profileById]);

  const peopleYouMayKnow = useMemo(() => {
    if (!profile) {
      return [];
    }

    return computePeopleYouMayKnow(profile, profiles, friendRequests, friendIds, pendingPeerIds);
  }, [profile, profiles, friendRequests, friendIds, pendingPeerIds]);

  const handleSendFriendRequest = async (targetProfile: UserProfile) => {
    if (!supabase || !user) {
      return;
    }

    setBusyProfileId(targetProfile.id);
    setNotice("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("friend_requests")
      .insert({ requester_id: user.id, receiver_id: targetProfile.id })
      .select(friendRequestSelect)
      .single();

    if (error) {
      setErrorMessage(error.message);
      setBusyProfileId("");
      return;
    }

    setFriendRequests((current) => [data as FriendRequest, ...current]);
    setNotice(`Friend request sent to ${getDisplayName(targetProfile)}.`);
    setBusyProfileId("");
    setExpandedSuggestionId((id) => (id === targetProfile.id ? null : id));
  };

  const handleRespondToFriendRequest = async (
    request: FriendRequest,
    status: "accepted" | "rejected",
  ) => {
    if (!supabase) {
      return;
    }

    setBusyRequestId(request.id);
    setNotice("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("friend_requests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", request.id)
      .select(friendRequestSelect)
      .single();

    if (error) {
      setErrorMessage(error.message);
      setBusyRequestId("");
      return;
    }

    setFriendRequests((current) =>
      current.map((item) => (item.id === request.id ? (data as FriendRequest) : item)),
    );
    setNotice(status === "accepted" ? "Friend request accepted." : "Friend request rejected.");
    setBusyRequestId("");
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setIsSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const renderFriendAction = (item: UserProfile) => {
    const incomingRequest = pendingIncomingByRequesterId.get(item.id);

    if (friendIds.has(item.id)) {
      return <span className="text-xs font-semibold text-[#606770]">Friends</span>;
    }

    if (pendingOutgoingReceiverIds.has(item.id)) {
      return <span className="text-xs font-semibold text-[#606770]">Request sent</span>;
    }

    if (incomingRequest) {
      return (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => handleRespondToFriendRequest(incomingRequest, "accepted")}
            disabled={busyRequestId === incomingRequest.id}
            className="border border-[#29487D] bg-[#4267B2] px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => handleRespondToFriendRequest(incomingRequest, "rejected")}
            disabled={busyRequestId === incomingRequest.id}
            className="border border-[#999] bg-[#F5F6F7] px-2 py-1 text-xs font-bold text-[#4B4F56] disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleSendFriendRequest(item)}
        disabled={busyProfileId === item.id}
        className="shrink-0 border border-[#29487D] bg-[#4267B2] px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
      >
        {busyProfileId === item.id ? "Sending..." : "Add Friend"}
      </button>
    );
  };

  const renderExpandedDetails = (item: UserProfile) => (
    <div className="border-t border-[#E9EBEE] bg-[#F9FAFB] px-4 py-3 text-sm">
      {item.branch?.trim() && item.division?.trim() ? (
        <p className="m-0 text-xs font-semibold text-[#4B4F56]">
          {item.branch} · Division {item.division}
        </p>
      ) : (
        <p className="m-0 text-xs text-[#606770]">Branch / division not set</p>
      )}
      {item.bio ? (
        <p className="mt-2 m-0 whitespace-pre-wrap leading-snug text-[#1C1E21]">{item.bio}</p>
      ) : (
        <p className="mt-2 m-0 text-xs text-[#606770]">No bio yet.</p>
      )}
      <div className="mt-3 space-y-1.5">
        {(
          [
            ["instagram_account", "Instagram"],
            ["twitter_account", "Twitter"],
            ["linkedin_account", "LinkedIn"],
            ["github_account", "GitHub"],
          ] as const
        ).map(([field, label]) => {
          const value = item[field];
          return (
            <div key={field} className="flex flex-wrap justify-between gap-2 text-xs">
              <span className="font-semibold text-[#606770]">{label}</span>
              {value ? (
                <a
                  href={getSocialHref(field as SocialField, value)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all font-semibold text-[#385898]"
                >
                  {value}
                </a>
              ) : (
                <span className="text-[#8A8D91]">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

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

      <main className="mx-auto max-w-[980px] space-y-4 px-3 py-4 sm:px-4">
        <div className="rounded border border-[#BDC7D8] bg-white shadow-sm">
          <div className="border-b border-[#DADDE1] bg-[#F5F6F7] px-4 py-3">
            <h1
              className="m-0 text-lg font-bold text-[#0E385F]"
              style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
            >
              Friends
            </h1>
            <p className="mt-1 text-xs text-[#606770]">
              People you are connected with and suggestions from mutual friends and your branch.
            </p>
          </div>

          {errorMessage ? (
            <p className="border-b border-[#E41E3F]/40 bg-[#FFE4E1] p-3 text-xs font-medium text-[#7f1d1d]">
              {errorMessage}
            </p>
          ) : null}
          {notice ? (
            <p className="border-b border-[#9CB4D2] bg-[#F0F2F5] p-3 text-xs font-medium text-[#0E385F]">
              {notice}
            </p>
          ) : null}

          <div className="divide-y divide-[#E9EBEE]">
            {isLoading ? (
              <p className="p-4 text-sm text-[#606770]">Loading...</p>
            ) : !user ? (
              <p className="p-4 text-sm text-[#606770]">Sign in to see friends.</p>
            ) : (
              <>
                <section>
                  <h2 className="border-b border-[#E9EBEE] bg-[#FAFBFC] px-4 py-2 text-sm font-bold text-[#4B4F56]">
                    People you may know
                  </h2>
                  {peopleYouMayKnow.length > 0 ? (
                    peopleYouMayKnow.map((item) => {
                      const name = getDisplayName(item);
                      const isOpen = expandedSuggestionId === item.id;

                      return (
                        <article key={item.id} className="border-b border-[#E9EBEE] last:border-b-0">
                          <div className="flex items-center gap-3 p-4">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSuggestionId((id) => (id === item.id ? null : item.id))
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              aria-expanded={isOpen}
                            >
                              <ProfileAvatar profile={item} name={name} size="h-12 w-12" />
                              <div className="min-w-0 flex-1">
                                <h3 className="m-0 truncate text-sm font-bold text-[#385898]">
                                  {name}
                                </h3>
                                <p className="m-0 mt-1 truncate text-xs text-[#606770]">
                                  {item.email}
                                </p>
                                <p className="m-0 mt-1 text-xs text-[#90949C]">
                                  {isOpen ? "Hide profile" : "View profile"}
                                </p>
                              </div>
                            </button>
                            {renderFriendAction(item)}
                          </div>
                          {isOpen ? renderExpandedDetails(item) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="p-4 text-sm text-[#606770]">
                      No suggestions yet. Add your branch and division on your profile, or connect
                      with classmates so we can suggest mutual friends.
                    </p>
                  )}
                </section>

                <section>
                  <h2 className="border-b border-[#E9EBEE] bg-[#FAFBFC] px-4 py-2 text-sm font-bold text-[#4B4F56]">
                    Your friends ({friends.length})
                  </h2>
                  {friends.length > 0 ? (
                    friends.map((item) => {
                      const name = getDisplayName(item);
                      const isOpen = expandedFriendId === item.id;

                      return (
                        <article key={item.id} className="border-b border-[#E9EBEE] last:border-b-0">
                          <div className="flex items-center gap-3 p-4">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedFriendId((id) => (id === item.id ? null : item.id))
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              aria-expanded={isOpen}
                            >
                              <ProfileAvatar profile={item} name={name} size="h-12 w-12" />
                              <div className="min-w-0 flex-1">
                                <h3 className="m-0 truncate text-sm font-bold text-[#385898]">
                                  {name}
                                </h3>
                                <p className="m-0 mt-1 truncate text-xs text-[#606770]">
                                  {item.email}
                                </p>
                                <p className="m-0 mt-1 text-xs text-[#90949C]">
                                  {isOpen ? "Hide profile" : "View profile"}
                                </p>
                              </div>
                            </button>
                          </div>
                          {isOpen ? renderExpandedDetails(item) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="p-4 text-sm text-[#606770]">You do not have any friends yet.</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
