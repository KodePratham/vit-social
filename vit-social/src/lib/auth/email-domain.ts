export const ALLOWED_EMAIL_DOMAIN = "vit.edu";
export const ALLOWED_EMAIL_DOMAINS = [ALLOWED_EMAIL_DOMAIN, "viit.ac.in"] as const;

const allowedEmailDomains = new Set<string>(ALLOWED_EMAIL_DOMAINS);

export function isAllowedVitEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const [, domain = ""] = normalizedEmail.split("@");
  return allowedEmailDomains.has(domain);
}
