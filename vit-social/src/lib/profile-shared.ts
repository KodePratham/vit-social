export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_account: string | null;
  twitter_account: string | null;
  linkedin_account: string | null;
  github_account: string | null;
  branch: string | null;
  division: string | null;
  created_at: string;
};

export type FriendRequest = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
};

export type SocialField =
  | "instagram_account"
  | "twitter_account"
  | "linkedin_account"
  | "github_account";

export const profileSelect =
  "id,email,full_name,avatar_url,bio,instagram_account,twitter_account,linkedin_account,github_account,branch,division,created_at";

export const friendRequestSelect = "id,requester_id,receiver_id,status,created_at,responded_at";

export function getDisplayName(profile: UserProfile, fallbackEmail?: string | null) {
  return profile.full_name?.trim() || fallbackEmail || profile.email || "VIT student";
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getSocialHref(platform: SocialField, account: string) {
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
