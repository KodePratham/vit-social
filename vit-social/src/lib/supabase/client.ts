import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

export { isSupabaseConfigured, getSupabaseKey, getSupabaseUrl } from "./config";

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_PROJECT_REF (or NEXT_PUBLIC_SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.",
    );
  }
  return createBrowserClient(getSupabaseUrl() as string, getSupabaseKey() as string);
}
