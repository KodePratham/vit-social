export const ALLOWED_EMAIL_DOMAIN = "vit.edu";

export function isAllowedVitEmail(email?: string | null) {
  return email?.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) ?? false;
}
