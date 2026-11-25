/**
 * Gesher Tours' contact details, as shown on geshertours.co.il (header,
 * footer and the צור קשר page, read 2026-11-22). The phone and email are
 * editable in Admin → Settings; these are the fallbacks. The address,
 * WhatsApp and Facebook links aren't editable yet: change them here.
 */
export const DEFAULT_SITE_EMAIL = "yifat@gst1000.co.il";
export const SITE_ADDRESS = "האודם 1, פתח תקווה";
/** International format without "+", as wa.me expects. */
export const SITE_WHATSAPP = "972546360119";
export const SITE_FACEBOOK_URL = "https://www.facebook.com/GesherKosherTours";

export function whatsappHref(number: string = SITE_WHATSAPP): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

/** "972546360119" → "054-6360119", how Israelis write a mobile number. */
export function whatsappDisplay(number: string = SITE_WHATSAPP): string {
  const digits = number.replace(/\D/g, "");
  const local = digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3)}` : local;
}
