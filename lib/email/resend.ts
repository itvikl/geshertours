import "server-only";
import { Resend } from "resend";
import { DEFAULT_SITE_EMAIL } from "@/lib/siteContact";

/**
 * Resend SDK — server-only. Free tier for now (PRD email confirmations);
 * swap RESEND_API_KEY/EMAIL_FROM for a verified-domain provider before launch.
 */
let resendSingleton: Resend | null = null;

export function resendClient(): Resend {
  if (resendSingleton) return resendSingleton;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  resendSingleton = new Resend(apiKey);
  return resendSingleton;
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "טיולי גשר <onboarding@resend.dev>";
}

/** Where customer replies go (EMAIL_REPLY_TO) — spread into an emails.send() call. */
export function emailReplyTo(): { replyTo?: string } {
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_SITE_EMAIL;
  return { replyTo };
}
