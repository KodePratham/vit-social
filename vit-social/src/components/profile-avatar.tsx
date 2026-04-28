import { getInitials } from "@/lib/profile-shared";
import type { UserProfile } from "@/lib/profile-shared";

export function ProfileAvatar({
  profile,
  name,
  size,
}: {
  profile: UserProfile;
  name: string;
  size: string;
}) {
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
