/** Fallback when no number is saved in Admin → Settings (and for the admin tour preview, which renders outside the site layout). */
export const DEFAULT_SITE_PHONE = "03-5260900";

/** "03-5260900" → "tel:035260900". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
