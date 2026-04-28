import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAcceptedFriendIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("requester_id,receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  const ids: string[] = [];
  for (const row of data ?? []) {
    const other = row.requester_id === userId ? row.receiver_id : row.requester_id;
    ids.push(other);
  }
  return ids;
}
