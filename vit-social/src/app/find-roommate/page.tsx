"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SiteHeader } from "@/components/site-header";
import {
  friendRequestSelect,
  getDisplayName,
  getSocialHref,
  profileSelect,
  type FriendRequest,
  type SocialField,
  type UserProfile,
} from "@/lib/profile-shared";
import {
  formatRoommateGenderLabel,
  isRoommateCampus,
  isRoommateGender,
  ROOMMATE_CAMPUSES,
  ROOMMATE_GENDER_OPTIONS,
} from "@/lib/roommate-finder";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function FindRoommatePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");
  const [busyProfileId, setBusyProfileId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedPeerId, setExpandedPeerId] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  const [campusDraft, setCampusDraft] = useState("");
  const [genderDraft, setGenderDraft] = useState("");

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
      const campus = nextProfile?.roommate_hostel_campus ?? "";
      setCampusDraft(
        nextProfile?.seeking_roommate && campus && isRoommateCampus(campus) ? campus : "",
      );
      const g = nextProfile?.roommate_gender ?? "";
      setGenderDraft(isRoommateGender(g) ? g : "");
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

  const isListedSeeker =
    Boolean(profile?.seeking_roommate) &&
    Boolean(profile?.roommate_hostel_campus) &&
    Boolean(profile?.roommate_gender);

  const roommateMatches = useMemo(() => {
    if (!user || !profile || !isListedSeeker) {
      return [];
    }

    const campus = profile.roommate_hostel_campus;
    const gender = profile.roommate_gender;
    if (!campus || !gender) {
      return [];
    }

    return profiles
      .filter(
        (item) =>
          item.id !== user.id &&
          item.seeking_roommate &&
          item.roommate_hostel_campus === campus &&
          item.roommate_gender === gender,
      )
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [profiles, profile, user, isListedSeeker]);

  const handleJoinListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !user) {
      return;
    }

    if (!campusDraft || !isRoommateCampus(campusDraft)) {
      setErrorMessage("Choose your campus.");
      setNotice("");
      return;
    }
    if (!genderDraft || !isRoommateGender(genderDraft)) {
      setErrorMessage("Choose how you identify for same-gender matching.");
      setNotice("");
      return;
    }

    setIsSavingListing(true);
    setNotice("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("users")
      .update({
        seeking_roommate: true,
        roommate_hostel_campus: campusDraft,
        roommate_gender: genderDraft,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select(profileSelect)
      .single();

    if (error) {
      setErrorMessage(error.message);
      setIsSavingListing(false);
      return;
    }

    const updated = data as UserProfile;
    setProfile(updated);
    setProfiles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setNotice("You are listed. Students with the same campus and gender appear below.");
    setIsSavingListing(false);
  };

  const handleLeaveListing = async () => {
    if (!supabase || !user) {
      return;
    }

    setIsSavingListing(true);
    setNotice("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("users")
      .update({
        seeking_roommate: false,
        roommate_hostel_campus: null,
        roommate_gender: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select(profileSelect)
      .single();

    if (error) {
      setErrorMessage(error.message);
      setIsSavingListing(false);
      return;
    }

    const updated = data as UserProfile;
    setProfile(updated);
    setProfiles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setCampusDraft("");
    setGenderDraft("");
    setNotice("You were removed from the roommate list.");
    setIsSavingListing(false);
  };

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
    setExpandedPeerId((id) => (id === targetProfile.id ? null : id));
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
      return (
        <span className="shrink-0 rounded border border-[#c7d2e3] bg-[#eef1f7] px-2 py-1 text-xs font-semibold text-[color:var(--fb-text-dim)]">
          Friends
        </span>
      );
    }

    if (pendingOutgoingReceiverIds.has(item.id)) {
      return (
        <span className="shrink-0 rounded border border-[#c7d2e3] bg-[#eef1f7] px-2 py-1 text-xs font-semibold text-[color:var(--fb-text-dim)]">
          Request sent
        </span>
      );
    }

    if (incomingRequest) {
      return (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => handleRespondToFriendRequest(incomingRequest, "accepted")}
            disabled={busyRequestId === incomingRequest.id}
            className="fb-btn-primary"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => handleRespondToFriendRequest(incomingRequest, "rejected")}
            disabled={busyRequestId === incomingRequest.id}
            className="fb-btn-secondary"
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
        className="fb-btn-primary shrink-0"
      >
        {busyProfileId === item.id ? "Sending…" : "Add Friend"}
      </button>
    );
  };

  const renderExpandedPeer = (item: UserProfile) => (
    <div className="border-t border-[#e9ebee] bg-[#f9fafb] px-4 py-3 text-sm">
      {item.branch?.trim() && item.division?.trim() ? (
        <p className="m-0 text-xs font-semibold text-[#4b4f56]">
          {item.branch} · Division {item.division}
        </p>
      ) : (
        <p className="m-0 text-xs text-[color:var(--fb-text-dim)]">Branch / division not set</p>
      )}
      {item.bio ? (
        <p className="mt-2 m-0 whitespace-pre-wrap leading-snug text-[var(--fb-text)]">
          {item.bio}
        </p>
      ) : (
        <p className="mt-2 m-0 text-xs text-[color:var(--fb-text-dim)]">No bio yet.</p>
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
              <span className="font-semibold text-[color:var(--fb-text-dim)]">{label}</span>
              {value ? (
                <a
                  href={getSocialHref(field as SocialField, value)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all font-semibold text-[color:var(--fb-link)]"
                >
                  {value}
                </a>
              ) : (
                <span className="text-[color:var(--fb-text-muted)]">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const selectClassName = "fb-input mt-1";

  return (
    <div className="min-h-screen bg-[var(--fb-bg)] text-[var(--fb-text)]">
      <SiteHeader
        userEmail={!isLoading ? user?.email ?? null : null}
        onSignOut={handleSignOut}
        isBusy={isSigningOut || isLoading}
      />

      <main className="mx-auto max-w-[980px] space-y-4 px-3 py-4 sm:px-4">
        <div className="fb-panel">
          <div className="fb-panel-header">
            <h1 className="fb-section-title m-0 text-lg">Find a roommate</h1>
            <p className="mt-1 text-xs text-[color:var(--fb-text-dim)]">
              List yourself as looking for a room with your hostel campus and gender. You only see
              other students who match both.
            </p>
          </div>

          {errorMessage ? (
            <p className="border-b border-[color:var(--fb-error-border)] bg-[color:var(--fb-error-bg)] p-3 text-xs font-medium text-[color:var(--fb-error-text)]">
              {errorMessage}
            </p>
          ) : null}
          {notice ? (
            <p className="border-b border-[color:var(--fb-success-border)] bg-[color:var(--fb-success-bg)] p-3 text-xs font-medium text-[#0e385f]">
              {notice}
            </p>
          ) : null}

          <div className="divide-y divide-[#e9ebee]">
            {isLoading ? (
              <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">Loading…</p>
            ) : !user ? (
              <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
                <Link
                  href="/"
                  className="font-semibold text-[color:var(--fb-link)] underline"
                >
                  Sign in
                </Link>{" "}
                to use the roommate finder.
              </p>
            ) : (
              <>
                <section className="p-4">
                  {!isListedSeeker ? (
                    <form className="max-w-lg space-y-3" onSubmit={handleJoinListing}>
                      <p className="m-0 text-sm text-[#4b4f56]">
                        Join the list so others on the same campus and gender can discover you.
                      </p>
                      <label
                        className="block text-sm font-semibold text-[#4b4f56]"
                        htmlFor="rm-campus"
                      >
                        Hostel campus
                        <select
                          id="rm-campus"
                          value={campusDraft}
                          onChange={(e) => setCampusDraft(e.target.value)}
                          disabled={isSavingListing}
                          className={selectClassName}
                          required
                        >
                          <option value="">Choose campus</option>
                          {ROOMMATE_CAMPUSES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label
                        className="block text-sm font-semibold text-[#4b4f56]"
                        htmlFor="rm-gender"
                      >
                        Gender (for same-gender matches)
                        <select
                          id="rm-gender"
                          value={genderDraft}
                          onChange={(e) => setGenderDraft(e.target.value)}
                          disabled={isSavingListing}
                          className={selectClassName}
                          required
                        >
                          <option value="">Choose</option>
                          {ROOMMATE_GENDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div>
                        <button
                          type="submit"
                          disabled={isSavingListing}
                          className="fb-btn-primary fb-btn-lg"
                        >
                          {isSavingListing ? "Saving…" : "List me — I'm looking for a room"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="m-0 text-sm font-semibold text-[#0e385f]">You are listed</p>
                        <p className="mt-1 m-0 text-sm text-[color:var(--fb-text-dim)]">
                          {profile?.roommate_hostel_campus ?? "—"} ·{" "}
                          {formatRoommateGenderLabel(profile?.roommate_gender ?? null)}
                        </p>
                        <p className="mt-2 m-0 text-xs text-[#90949c]">
                          Update anytime by leaving and joining again with new choices.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleLeaveListing()}
                        disabled={isSavingListing}
                        className="fb-btn-secondary"
                      >
                        {isSavingListing ? "…" : "Leave list"}
                      </button>
                    </div>
                  )}
                </section>

                <section>
                  <div className="fb-panel-subheader">
                    Others looking ({roommateMatches.length})
                  </div>
                  {!isListedSeeker ? (
                    <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
                      Join above to see classmates on your campus who share your gender preference
                      for housing.
                    </p>
                  ) : roommateMatches.length > 0 ? (
                    roommateMatches.map((item) => {
                      const name = getDisplayName(item);
                      const open = expandedPeerId === item.id;
                      return (
                        <article key={item.id} className="border-b border-[#e9ebee] last:border-b-0">
                          <div className="flex items-center gap-3 p-4">
                            <button
                              type="button"
                              onClick={() => setExpandedPeerId(open ? null : item.id)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded bg-transparent text-left hover:bg-[#f5f7fb]"
                              aria-expanded={open}
                            >
                              <ProfileAvatar profile={item} name={name} size="h-12 w-12" />
                              <div className="min-w-0 flex-1">
                                <h3 className="m-0 truncate text-sm font-bold text-[color:var(--fb-link)]">
                                  {name}
                                </h3>
                                <p className="m-0 mt-1 truncate text-xs text-[color:var(--fb-text-dim)]">
                                  {item.email}
                                </p>
                                <p className="m-0 mt-1 text-xs text-[#90949c]">
                                  {open ? "Hide profile" : "View profile"}
                                </p>
                              </div>
                            </button>
                            {renderFriendAction(item)}
                          </div>
                          {open ? renderExpandedPeer(item) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
                      No other students listed yet with the same campus and gender. Invite friends or
                      check back later.
                    </p>
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
