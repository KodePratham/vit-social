const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function isValidHttpUrl(value?: string) {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolves the Supabase API URL. Prefer a full `NEXT_PUBLIC_SUPABASE_URL`, or
 * build the default hosted URL from the project ref / id (`*.supabase.co`).
 */
function getResolvedSupabaseUrl(): string | undefined {
  const direct = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (direct && isValidHttpUrl(direct)) {
    return direct.replace(/\/$/, "");
  }

  const ref = (
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID?.trim() ??
    ""
  );
  if (ref && /^[a-z0-9-]+$/i.test(ref)) {
    return `https://${ref}.supabase.co`;
  }

  return undefined;
}

const resolvedUrl = getResolvedSupabaseUrl();

export function getSupabaseUrl() {
  return resolvedUrl;
}

export function getSupabaseKey() {
  return key;
}

export const isSupabaseConfigured = Boolean(
  resolvedUrl && key && String(key).length > 0,
);
