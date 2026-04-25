"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_account: string | null;
  twitter_account: string | null;
  linkedin_account: string | null;
  github_account: string | null;
  created_at: string;
};

type FriendRequest = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
};

type ProfileForm = {
  bio: string;
  instagram_account: string;
  twitter_account: string;
  linkedin_account: string;
  github_account: string;
};

type SocialField =
  | "instagram_account"
  | "twitter_account"
  | "linkedin_account"
  | "github_account";

const profileSelect =
  "id,email,full_name,avatar_url,bio,instagram_account,twitter_account,linkedin_account,github_account,created_at";

const friendRequestSelect = "id,requester_id,receiver_id,status,created_at,responded_at";

const emptyProfileForm: ProfileForm = {
  bio: "",
  instagram_account: "",
  twitter_account: "",
  linkedin_account: "",
  github_account: "",
};

function getDisplayName(profile: UserProfile, fallbackEmail?: string | null) {
  return profile.full_name?.trim() || fallbackEmail || profile.email || "VIT student";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeProfileValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSocialHref(platform: SocialField, account: string) {
  if (/^https?:\/\//i.test(account)) {
    return account;
  }

  const cleanAccount = account.replace(/^@/, "");
  const encodedAccount = encodeURIComponent(cleanAccount);

  if (platform === "instagram_account") {
    return `https://instagram.com/${encodedAccount}`;
  }

  if (platform === "twitter_account") {
    return `https://twitter.com/${encodedAccount}`;
  }

  if (platform === "github_account") {
    return `https://github.com/${encodedAccount}`;
  }

  return `https://linkedin.com/in/${encodedAccount}`;
}

function ProfileAvatar({ profile, name, size }: { profile: UserProfile; name: string; size: string }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded border border-[#BDC7D8] bg-[#E7EBF2] text-sm font-bold text-[#3B5998]`}
    >
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        getInitials(name)
      )}
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

      setProfiles(nextProfiles);
      setFriendRequests((requestsResult.data ?? []) as FriendRequest[]);
      setProfile(nextProfile);
      setProfileForm({
        bio: nextProfile?.bio ?? "",
        instagram_account: nextProfile?.instagram_account ?? "",
        twitter_account: nextProfile?.twitter_account ?? "",
        linkedin_account: nextProfile?.linkedin_account ?? "",
        github_account: nextProfile?.github_account ?? "",
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
    setProfileForm((current) => ({ ...current, [field]: value }));
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

    const updates = {
      bio: normalizeProfileValue(profileForm.bio),
      instagram_account: normalizeProfileValue(profileForm.instagram_account),
      twitter_account: normalizeProfileValue(profileForm.twitter_account),
      linkedin_account: normalizeProfileValue(profileForm.linkedin_account),
      github_account: normalizeProfileValue(profileForm.github_account),
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
    });
    setNotice("Profile updated.");
    setIsSavingProfile(false);
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
      return <span className="text-xs font-semibold text-[#606770]">Friends</span>;
    }

    if (pendingOutgoingReceiverIds.has(item.id)) {
      return <span className="text-xs font-semibold text-[#606770]">Request sent</span>;
    }

    if (incomingRequest) {
      return (
        <div className="flex gap-2">
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
        className="border border-[#29487D] bg-[#4267B2] px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
      >
        {busyProfileId === item.id ? "Sending..." : "Add Friend"}
      </button>
    );
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
              {isSigningOut ? "..." : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[980px] gap-4 px-3 py-4 sm:px-4 md:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <section className="overflow-hidden rounded border border-[#BDC7D8] bg-white shadow-sm">
            <div className="h-24 bg-gradient-to-b from-[#6D84B4] to-[#3B5998]" />
            <div className="px-3 pb-4">
              {profile ? (
                <div className="-mt-10">
                  <ProfileAvatar profile={profile} name={displayName} size="h-20 w-20 text-2xl" />
                </div>
              ) : null}
              <h1
                className="m-0 mt-3 text-xl font-bold leading-tight text-[#0E385F]"
                style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
              >
                {displayName}
              </h1>
              <p className="mt-1 break-words text-xs text-[#606770]">{user?.email}</p>
              <p className="mt-3 min-h-10 text-sm leading-snug text-[#1C1E21]">
                {profile?.bio || "Add a short bio so other VIT students know you."}
              </p>
            </div>
          </section>

          <section className="rounded border border-[#BDC7D8] bg-white shadow-sm">
            <h2 className="border-b border-[#DADDE1] bg-[#F5F6F7] px-3 py-2 text-sm font-bold text-[#4B4F56]">
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
                    <span className="font-semibold text-[#606770]">{label}</span>
                    {value ? (
                      <a
                        href={getSocialHref(field, value)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate text-right font-semibold text-[#385898]"
                      >
                        {value}
                      </a>
                    ) : (
                      <span className="text-[#8A8D91]">Not added</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded border border-[#BDC7D8] bg-white shadow-sm">
            <h2 className="border-b border-[#DADDE1] bg-[#F5F6F7] px-3 py-2 text-sm font-bold text-[#4B4F56]">
              Friends
            </h2>
            <div className="divide-y divide-[#E9EBEE]">
              {friends.length > 0 ? (
                friends.map((item) => {
                  const name = getDisplayName(item);

                  return (
                    <article key={item.id} className="flex items-center gap-2 p-3">
                      <ProfileAvatar profile={item} name={name} size="h-9 w-9" />
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-sm font-bold text-[#385898]">{name}</h3>
                        <p className="m-0 truncate text-xs text-[#606770]">{item.email}</p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="p-3 text-sm text-[#606770]">No friends yet.</p>
              )}
            </div>
          </section>
        </aside>

        <div className="space-y-4">
          <section className="rounded border border-[#BDC7D8] bg-white shadow-sm">
            <div className="border-b border-[#DADDE1] bg-[#F5F6F7] px-4 py-2">
              <h2
                className="m-0 text-base font-bold text-[#0E385F]"
                style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
              >
                Edit Profile
              </h2>
              <p className="mt-1 text-xs text-[#606770]">
                Share a little about yourself and where classmates can find you.
              </p>
            </div>

            <form className="space-y-3 p-4" onSubmit={handleProfileSave}>
              {errorMessage ? (
                <p className="border border-[#E41E3F]/40 bg-[#FFE4E1] p-2 text-xs font-medium text-[#7f1d1d]">
                  {errorMessage}
                </p>
              ) : null}
              {notice ? (
                <p className="border border-[#9CB4D2] bg-[#F0F2F5] p-2 text-xs font-medium text-[#0E385F]">
                  {notice}
                </p>
              ) : null}

              <label className="block text-sm font-semibold text-[#4B4F56]">
                Bio
                <textarea
                  value={profileForm.bio}
                  onChange={(event) => handleProfileChange("bio", event.target.value)}
                  maxLength={280}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-none border border-[#BDC7D8] bg-white p-2 text-sm font-normal text-[#1C1E21] outline-none focus:border-[#3B5998]"
                  placeholder="Write a short intro..."
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["instagram_account", "Instagram", "@username"],
                    ["twitter_account", "Twitter", "@username"],
                    ["linkedin_account", "LinkedIn", "profile-name"],
                    ["github_account", "GitHub", "username"],
                  ] as const
                ).map(([field, label, placeholder]) => (
                  <label key={field} className="block text-sm font-semibold text-[#4B4F56]">
                    {label}
                    <input
                      value={profileForm[field]}
                      onChange={(event) => handleProfileChange(field, event.target.value)}
                      maxLength={120}
                      className="mt-1 h-9 w-full rounded-none border border-[#BDC7D8] bg-white px-2 text-sm font-normal text-[#1C1E21] outline-none focus:border-[#3B5998]"
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>

              <div className="border-t border-[#DADDE1] pt-3 text-right">
                <button
                  type="submit"
                  disabled={isLoading || isSavingProfile || !user}
                  className="h-[26px] border border-[#29487D] bg-[#4267B2] px-4 text-sm font-bold leading-[24px] text-white shadow-[0_1px_1px_rgba(0,0,0,0.1)] enabled:cursor-pointer enabled:hover:bg-[#365899] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded border border-[#BDC7D8] bg-white shadow-sm">
            <div className="border-b border-[#DADDE1] bg-[#F5F6F7] px-4 py-2">
              <h2
                className="m-0 text-base font-bold text-[#0E385F]"
                style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
              >
                Friend Requests
              </h2>
              <p className="mt-1 text-xs text-[#606770]">
                Accept or reject people who want to connect with you.
              </p>
            </div>
            <div className="divide-y divide-[#E9EBEE]">
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
                        <h3 className="m-0 truncate text-sm font-bold text-[#385898]">{name}</h3>
                        <p className="m-0 mt-1 truncate text-xs text-[#606770]">
                          {requester.email}
                        </p>
                      </div>
                      {renderFriendAction(requester)}
                    </article>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-[#606770]">No pending friend requests.</p>
              )}
            </div>
          </section>

          <section className="rounded border border-[#BDC7D8] bg-white shadow-sm">
            <div className="border-b border-[#DADDE1] bg-[#F5F6F7] px-4 py-2">
              <h2
                className="m-0 text-base font-bold text-[#0E385F]"
                style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
              >
                Search People on vitsocial.xyz
              </h2>
              <p className="mt-1 text-xs text-[#606770]">
                Search by name, email, or bio to send friend requests.
              </p>
            </div>

            <form className="flex gap-2 border-b border-[#E9EBEE] p-4" onSubmit={handleSearch}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-none border border-[#BDC7D8] bg-white px-2 text-sm text-[#1C1E21] outline-none focus:border-[#3B5998]"
                placeholder="Search people..."
              />
              <button
                type="submit"
                className="h-9 border border-[#29487D] bg-[#4267B2] px-4 text-sm font-bold text-white"
              >
                Search
              </button>
            </form>

            <div className="divide-y divide-[#E9EBEE]">
              {isLoading ? (
                <p className="p-4 text-sm text-[#606770]">Loading people...</p>
              ) : !activeSearch ? (
                <p className="p-4 text-sm text-[#606770]">
                  Enter a search term to find VIT students.
                </p>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const name = getDisplayName(item);

                  return (
                    <article key={item.id} className="flex items-center gap-3 p-4">
                      <ProfileAvatar profile={item} name={name} size="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 truncate text-sm font-bold text-[#385898]">{name}</h3>
                        <p className="m-0 mt-1 truncate text-xs text-[#606770]">{item.email}</p>
                        {item.bio ? (
                          <p className="m-0 mt-2 text-sm leading-snug text-[#1C1E21]">
                            {item.bio}
                          </p>
                        ) : null}
                      </div>
                      {renderFriendAction(item)}
                    </article>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-[#606770]">No people matched your search.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
