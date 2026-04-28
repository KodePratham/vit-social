import type { FriendRequest, UserProfile } from "@/lib/profile-shared";
import { getDisplayName } from "@/lib/profile-shared";

function friendsOfUser(userId: string, friendRequests: FriendRequest[]): Set<string> {
  const set = new Set<string>();
  for (const r of friendRequests) {
    if (r.status !== "accepted") {
      continue;
    }
    if (r.requester_id === userId) {
      set.add(r.receiver_id);
    } else if (r.receiver_id === userId) {
      set.add(r.requester_id);
    }
  }
  return set;
}

type Scored = {
  profile: UserProfile;
  mutualCount: number;
  sameBranchDivision: boolean;
};

/** Up to 5 non-friends: prioritized by mutual friends, then same branch + division. */
export function computePeopleYouMayKnow(
  me: UserProfile,
  profiles: UserProfile[],
  friendRequests: FriendRequest[],
  friendIds: Set<string>,
  pendingPeerIds: Set<string>,
): UserProfile[] {
  const myFriends = friendsOfUser(me.id, friendRequests);

  const scored: Scored[] = [];

  for (const p of profiles) {
    if (p.id === me.id) {
      continue;
    }
    if (friendIds.has(p.id)) {
      continue;
    }
    if (pendingPeerIds.has(p.id)) {
      continue;
    }

    const theirFriends = friendsOfUser(p.id, friendRequests);
    let mutualCount = 0;
    for (const f of myFriends) {
      if (theirFriends.has(f)) {
        mutualCount += 1;
      }
    }

    const bMe = me.branch?.trim() ?? "";
    const dMe = me.division?.trim() ?? "";
    const bP = p.branch?.trim() ?? "";
    const dP = p.division?.trim() ?? "";
    const sameBranchDivision =
      Boolean(bMe && dMe && bP && dP) && bMe === bP && dMe === dP;

    if (mutualCount >= 1 || sameBranchDivision) {
      scored.push({ profile: p, mutualCount, sameBranchDivision });
    }
  }

  scored.sort((a, b) => {
    if (b.mutualCount !== a.mutualCount) {
      return b.mutualCount - a.mutualCount;
    }
    if (a.sameBranchDivision !== b.sameBranchDivision) {
      return a.sameBranchDivision ? -1 : 1;
    }
    return getDisplayName(a.profile).localeCompare(getDisplayName(b.profile));
  });

  return scored.slice(0, 5).map((row) => row.profile);
}
