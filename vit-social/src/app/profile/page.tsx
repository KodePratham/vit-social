"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SiteHeader } from "@/components/site-header";
import { BRANCH_CONFIG, getDivisionsForBranch, isValidBranchDivision } from "@/lib/branches";
import {
  friendRequestSelect,
  getDisplayName,
  getSocialHref,
  profileSelect,
  type FriendRequest,
  type UserProfile,
} from "@/lib/profile-shared";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ProfileForm = {
  bio: string;
  instagram_account: string;
  twitter_account: string;
  linkedin_account: string;
  github_account: string;
  branch: string;
  division: string;
};

const emptyProfileForm: ProfileForm = {
  bio: "",
  instagram_account: "",
  twitter_account: "",
  linkedin_account: "",
  github_account: "",
  branch: "",
  division: "",
};

function normalizeProfileValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveCampusForSave(
  branchRaw: string,
  divisionRaw: string,
):
  | { ok: true; branch: string | null; division: string | null }
  | { ok: false; message: string } {
  const b = branchRaw.trim();
  const d = divisionRaw.trim();
  if (!b && !d) {
    return { ok: true, branch: null, division: null };
  }
  if (!b || !d) {
    return { ok: false, message: "Choose both your branch and division." };
  }
  if (!isValidBranchDivision(b, d)) {
    return { ok: false, message: "That division is not valid for the selected branch." };
  }
  return { ok: true, branch: b, division: d };
}

function BranchDivisionFields({
  branch,
  division,
  onBranchChange,
  onDivisionChange,
  disabled,
  idPrefix,
}: {
  branch: string;
  division: string;
  onBranchChange: (value: string) => void;
  onDivisionChange: (value: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const divisions = getDivisionsForBranch(branch);
  const selectClassName = "fb-input mt-1";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-[#4B4F56]" htmlFor={`${idPrefix}-branch`}>
        Branch
        <select
          id={`${idPrefix}-branch`}
          value={branch}
          onChange={(event) => onBranchChange(event.target.value)}
          disabled={disabled}
          className={selectClassName}
        >
          <option value="">Select branch</option>
          {BRANCH_CONFIG.map((row) => (
            <option key={row.branch} value={row.branch}>
              {row.branch}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-[#4B4F56]" htmlFor={`${idPrefix}-division`}>
        Division
        <select
          id={`${idPrefix}-division`}
          value={division}
          onChange={(event) => onDivisionChange(event.target.value)}
          disabled={disabled || !branch}
          className={selectClassName}
        >
          <option value="">Select division</option>
          {divisions.map((letter) => (
            <option key={letter} value={letter}>
              {letter}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCampus, setIsSavingCampus] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");
  const [busyProfileId, setBusyProfileId] = useState("");
  const [notice, setNotice] = useState("");
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

      const nextBranch = nextProfile?.branch?.trim() ?? "";
      let nextDivision = nextProfile?.division?.trim() ?? "";
      if (nextBranch && nextDivision && !isValidBranchDivision(nextBranch, nextDivision)) {
        nextDivision = "";
      }

      setProfiles(nextProfiles);
      setFriendRequests((requestsResult.data ?? []) as FriendRequest[]);
      setProfile(nextProfile);
      setProfileForm({
        bio: nextProfile?.bio ?? "",
        instagram_account: nextProfile?.instagram_account ?? "",
        twitter_account: nextProfile?.twitter_account ?? "",
        linkedin_account: nextProfile?.linkedin_account ?? "",
        github_account: nextProfile?.github_account ?? "",
        branch: nextBranch,
        division: nextDivision,
      });
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

  const displayName = useMemo(() => {
    if (profile) {
      return getDisplayName(profile, user?.email);
    }

    return user?.user_metadata?.full_name || user?.email || "VIT student";
  }, [profile, user]);

  const needsCampusChoice = useMemo(() => {
    if (!profile) {
      return false;
    }

    const b = profile.branch?.trim() ?? "";
    const d = profile.division?.trim() ?? "";
    if (!b || !d) {
      return true;
    }

    return !isValidBranchDivision(b, d);
  }, [profile]);

  const profileById = useMemo(() => {
    return new Map(profiles.map((item) => [item.id, item]));
  }, [profiles]);

  const pendingIncomingRequests = useMemo(() => {
    if (!user) {
      return [];
    }

    return friendRequests.filter(
      (request) => request.receiver_id === user.id && request.status === "pending",
    );
  }, [friendRequests, user]);

  const pendingIncomingByRequesterId = useMemo(() => {
    return new Map(pendingIncomingRequests.map((request) => [request.requester_id, request]));
  }, [pendingIncomingRequests]);

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

  const friends = useMemo(() => {
    return [...friendIds]
      .map((id) => profileById.get(id))
      .filter((item): item is UserProfile => Boolean(item));
  }, [friendIds, profileById]);

  const searchResults = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query || !user) {
      return [];
    }

    return profiles.filter((item) => {
      if (item.id === user.id) {
        return false;
      }

      return [item.full_name, item.email, item.bio]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [activeSearch, profiles, user]);

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    if (field === "branch") {
      setProfileForm((current) => ({
        ...current,
        branch: value,
        division: "",
      }));
    } else {
      setProfileForm((current) => ({ ...current, [field]: value }));
    }
    setNotice("");
    setErrorMessage("");
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !user) {
      return;
    }

    setIsSavingProfile(true);
    setNotice("");
    setErrorMessage("");

    const campus = resolveCampusForSave(profileForm.branch, profileForm.division);
    if (!campus.ok) {
      setErrorMessage(campus.message);
      setIsSavingProfile(false);
      return;
    }

    const updates = {
      bio: normalizeProfileValue(profileForm.bio),
      instagram_account: normalizeProfileValue(profileForm.instagram_account),
      twitter_account: normalizeProfileValue(profileForm.twitter_account),
      linkedin_account: normalizeProfileValue(profileForm.linkedin_account),
      github_account: normalizeProfileValue(profileForm.github_account),
      branch: campus.branch,
      division: campus.division,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select(profileSelect)
      .single();

    if (error) {
      setErrorMessage(error.message);
      setIsSavingProfile(false);
      return;
    }

    const updatedProfile = data as UserProfile;
    setProfile(updatedProfile);
    setProfiles((current) =>
      current.map((item) => (item.id === updatedProfile.id ? updatedProfile : item)),
    );
    setProfileForm({
      bio: updatedProfile.bio ?? "",
      instagram_account: updatedProfile.instagram_account ?? "",
      twitter_account: updatedProfile.twitter_account ?? "",
      linkedin_account: updatedProfile.linkedin_account ?? "",
      github_account: updatedProfile.github_account ?? "",
      branch: updatedProfile.branch?.trim() ?? "",
      division: updatedProfile.division?.trim() ?? "",
    });
    setNotice("Profile updated.");
    setIsSavingProfile(false);
  };

  const handleCampusContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !user) {
      return;
    }

    const campus = resolveCampusForSave(profileForm.branch, profileForm.division);
    if (!campus.ok) {
      setErrorMessage(campus.message);
      return;
    }

    if (!campus.branch || !campus.division) {
      setErrorMessage("Choose your branch and class division to finish signing up.");
      return;
    }

    setIsSavingCampus(true);
    setNotice("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("users")
      .update({
        branch: campus.branch,
        division: campus.division,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select(profileSelect)
      .single();

    if (error) {
      setErrorMessage(error.message);
      setIsSavingCampus(false);
      return;
    }

    const updatedProfile = data as UserProfile;
    setProfile(updatedProfile);
    setProfiles((current) =>
      current.map((item) => (item.id === updatedProfile.id ? updatedProfile : item)),
    );
    setProfileForm((current) => ({
      ...current,
      branch: updatedProfile.branch?.trim() ?? "",
      division: updatedProfile.division?.trim() ?? "",
    }));
    setNotice("You are all set — welcome to vitsocial.xyz.");
    setIsSavingCampus(false);
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

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
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

  return (
    <div className="min-h-screen bg-[var(--fb-bg)] text-[var(--fb-text)]">
      <SiteHeader
        userEmail={!isLoading ? user?.email ?? null : null}
        onSignOut={handleSignOut}
        isBusy={isSigningOut || isLoading}
      />

      <main className="mx-auto grid max-w-[980px] gap-4 px-3 py-4 sm:px-4 md:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <section className="fb-panel overflow-hidden">
            <div
              className="h-24"
              style={{ background: "linear-gradient(to bottom, #6d84b4 0%, #3b5998 100%)" }}
            />
            <div className="px-3 pb-4">
              {profile ? (
                <div className="-mt-10">
                  <ProfileAvatar profile={profile} name={displayName} size="h-20 w-20 text-2xl" />
                </div>
              ) : null}
              <h1 className="fb-section-title m-0 mt-3 text-xl leading-tight">{displayName}</h1>
              <p className="mt-1 break-words text-xs text-[color:var(--fb-text-dim)]">
                {user?.email}
              </p>
              {profile?.branch?.trim() && profile.division?.trim() ? (
                <p className="mt-2 text-xs font-semibold text-[#4b4f56]">
                  {profile.branch} · Division {profile.division}
                </p>
              ) : profile ? (
                <p className="mt-2 text-xs text-[color:var(--fb-text-dim)]">
                  Complete the setup form to add yours.
                </p>
              ) : null}
              <p className="mt-3 min-h-10 text-sm leading-snug text-[var(--fb-text)]">
                {profile?.bio || "Add a short bio so other VIT students know you."}
              </p>
            </div>
          </section>

          {!needsCampusChoice ? (
            <>
              <section className="fb-panel">
                <h2 className="fb-panel-header m-0 text-sm font-bold text-[#4b4f56]">
                  Contact Info
                </h2>
            <div className="space-y-2 p-3 text-sm">
              {(
                [
                  ["instagram_account", "Instagram"],
                  ["twitter_account", "Twitter"],
                  ["linkedin_account", "LinkedIn"],
                  ["github_account", "GitHub"],
                ] as const
              ).map(([field, label]) => {
                const value = profile?.[field];

                return (
                  <div key={field} className="flex justify-between gap-3">
                    <span className="font-semibold text-[color:var(--fb-text-dim)]">{label}</span>
                    {value ? (
                      <a
                        href={getSocialHref(field, value)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate text-right font-semibold text-[color:var(--fb-link)]"
                      >
                        {value}
                      </a>
                    ) : (
                      <span className="text-[color:var(--fb-text-muted)]">Not added</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="fb-panel">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--fb-divider)] bg-[color:var(--fb-panel-header)] px-3 py-2">
              <h2 className="m-0 text-sm font-bold text-[#4b4f56]">Friends</h2>
              <Link
                href="/friends"
                className="shrink-0 text-xs font-semibold text-[color:var(--fb-link)] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#e9ebee]">
              {friends.length > 0 ? (
                friends.map((item) => {
                  const name = getDisplayName(item);

                  return (
                    <article key={item.id} className="flex items-center gap-2 p-3">
                      <ProfileAvatar profile={item} name={name} size="h-9 w-9" />
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-sm font-bold text-[color:var(--fb-link)]">
                          {name}
                        </h3>
                        <p className="m-0 truncate text-xs text-[color:var(--fb-text-dim)]">
                          {item.email}
                        </p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="p-3 text-sm text-[color:var(--fb-text-dim)]">No friends yet.</p>
              )}
            </div>
          </section>
            </>
          ) : null}
        </aside>

        <div className="space-y-4">
          {user && profile && needsCampusChoice ? (
            <section className="fb-panel border-2 border-[color:var(--fb-blue)]">
              <div className="border-b border-[color:var(--fb-divider)] bg-[#e8eef7] px-4 py-3">
                <h2 className="fb-section-title m-0 text-base">
                  Welcome — choose your branch and division
                </h2>
                <p className="mt-1 text-xs text-[color:var(--fb-text-dim)]">
                  Pick your programme branch and class division. You need both to use the directory
                  and friend features.
                </p>
              </div>
              <form className="space-y-3 p-4" onSubmit={handleCampusContinue}>
                {errorMessage ? (
                  <p className="border border-[color:var(--fb-error-border)] bg-[color:var(--fb-error-bg)] p-2 text-xs font-medium text-[color:var(--fb-error-text)]">
                    {errorMessage}
                  </p>
                ) : null}
                {notice ? (
                  <p className="border border-[color:var(--fb-success-border)] bg-[color:var(--fb-success-bg)] p-2 text-xs font-medium text-[#0e385f]">
                    {notice}
                  </p>
                ) : null}
                <BranchDivisionFields
                  branch={profileForm.branch}
                  division={profileForm.division}
                  onBranchChange={(value) => handleProfileChange("branch", value)}
                  onDivisionChange={(value) => handleProfileChange("division", value)}
                  disabled={isSavingCampus}
                  idPrefix="onboarding"
                />
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={isLoading || isSavingCampus || !user}
                    className="fb-btn-primary fb-btn-lg"
                  >
                    {isSavingCampus ? "Saving…" : "Continue"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}
          {!needsCampusChoice ? (
            <>
          <section className="fb-panel">
            <div className="fb-panel-header">
              <h2 className="fb-section-title m-0 text-base">Edit Profile</h2>
              <p className="mt-1 text-xs text-[color:var(--fb-text-dim)]">
                Share a little about yourself and where classmates can find you.
              </p>
            </div>

            <form className="space-y-3 p-4" onSubmit={handleProfileSave}>
              {errorMessage ? (
                <p className="border border-[color:var(--fb-error-border)] bg-[color:var(--fb-error-bg)] p-2 text-xs font-medium text-[color:var(--fb-error-text)]">
                  {errorMessage}
                </p>
              ) : null}
              {notice ? (
                <p className="border border-[color:var(--fb-success-border)] bg-[color:var(--fb-success-bg)] p-2 text-xs font-medium text-[#0e385f]">
                  {notice}
                </p>
              ) : null}

              <label className="block text-sm font-semibold text-[#4b4f56]">
                Bio
                <textarea
                  value={profileForm.bio}
                  onChange={(event) => handleProfileChange("bio", event.target.value)}
                  maxLength={280}
                  rows={4}
                  className="fb-input mt-1 resize-none"
                  placeholder="Write a short intro..."
                />
              </label>

              <BranchDivisionFields
                branch={profileForm.branch}
                division={profileForm.division}
                onBranchChange={(value) => handleProfileChange("branch", value)}
                onDivisionChange={(value) => handleProfileChange("division", value)}
                disabled={isSavingProfile}
                idPrefix="edit"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["instagram_account", "Instagram", "@username"],
                    ["twitter_account", "Twitter", "@username"],
                    ["linkedin_account", "LinkedIn", "profile-name"],
                    ["github_account", "GitHub", "username"],
                  ] as const
                ).map(([field, label, placeholder]) => (
                  <label key={field} className="block text-sm font-semibold text-[#4b4f56]">
                    {label}
                    <input
                      value={profileForm[field]}
                      onChange={(event) => handleProfileChange(field, event.target.value)}
                      maxLength={120}
                      className="fb-input mt-1"
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>

              <div className="border-t border-[color:var(--fb-divider)] pt-3 text-right">
                <button
                  type="submit"
                  disabled={isLoading || isSavingProfile || !user}
                  className="fb-btn-primary fb-btn-lg"
                >
                  {isSavingProfile ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="fb-panel">
            <div className="fb-panel-header">
              <h2 className="fb-section-title m-0 text-base">Friend Requests</h2>
              <p className="mt-1 text-xs text-[color:var(--fb-text-dim)]">
                Accept or reject people who want to connect with you.
              </p>
            </div>
            <div className="divide-y divide-[#e9ebee]">
              {pendingIncomingRequests.length > 0 ? (
                pendingIncomingRequests.map((request) => {
                  const requester = profileById.get(request.requester_id);
                  if (!requester) {
                    return null;
                  }

                  const name = getDisplayName(requester);

                  return (
                    <article key={request.id} className="flex items-center gap-3 p-4">
                      <ProfileAvatar profile={requester} name={name} size="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 truncate text-sm font-bold text-[color:var(--fb-link)]">
                          {name}
                        </h3>
                        <p className="m-0 mt-1 truncate text-xs text-[color:var(--fb-text-dim)]">
                          {requester.email}
                        </p>
                      </div>
                      {renderFriendAction(requester)}
                    </article>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
                  No pending friend requests.
                </p>
              )}
            </div>
          </section>

          <section className="fb-panel">
            <div className="fb-panel-header">
              <h2 className="fb-section-title m-0 text-base">Search People on vitsocial.xyz</h2>
              <p className="mt-1 text-xs text-[color:var(--fb-text-dim)]">
                Search by name, email, or bio to send friend requests.
              </p>
            </div>

            <form className="flex gap-2 border-b border-[#e9ebee] p-4" onSubmit={handleSearch}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="fb-input flex-1"
                placeholder="Search people..."
              />
              <button type="submit" className="fb-btn-primary">
                Search
              </button>
            </form>

            <div className="divide-y divide-[#e9ebee]">
              {isLoading ? (
                <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">Loading people…</p>
              ) : !activeSearch ? (
                <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
                  Enter a search term to find VIT students.
                </p>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const name = getDisplayName(item);

                  return (
                    <article key={item.id} className="flex items-center gap-3 p-4">
                      <ProfileAvatar profile={item} name={name} size="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 truncate text-sm font-bold text-[color:var(--fb-link)]">
                          {name}
                        </h3>
                        <p className="m-0 mt-1 truncate text-xs text-[color:var(--fb-text-dim)]">
                          {item.email}
                        </p>
                        {item.bio ? (
                          <p className="m-0 mt-2 text-sm leading-snug text-[var(--fb-text)]">
                            {item.bio}
                          </p>
                        ) : null}
                      </div>
                      {renderFriendAction(item)}
                    </article>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-[color:var(--fb-text-dim)]">
                  No people matched your search.
                </p>
              )}
            </div>
          </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
