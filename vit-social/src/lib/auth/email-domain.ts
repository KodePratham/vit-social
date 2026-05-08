export const ALLOWED_EMAIL_DOMAIN = "vit.edu";
export const ALLOWED_EMAIL_DOMAINS = [ALLOWED_EMAIL_DOMAIN, "viit.ac.in"] as const;

export function isAllowedVitEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(`@${domain}`));
}
