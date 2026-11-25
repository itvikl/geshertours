import { escapeHtml, wrapEmail } from "@/lib/email/layout";
import type { EmailContent } from "@/lib/email/templates/bookingConfirmation";

/** The admin email second factor (lib/auth/emailMfa.ts). */
export function adminSignInCodeEmail(code: string, minutesValid: number): EmailContent {
  const subject = `${code} — קוד הכניסה לניהול טיולי גשר`;
  const body = `
    <p style="margin:0 0 16px;font-size:16px;">קוד הכניסה שלכם לניהול:</p>
    <p dir="ltr" style="margin:0 0 24px;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#1b3a5c;text-align:right;">${escapeHtml(code)}</p>
    <p style="margin:0 0 12px;font-size:14px;color:#5a5245;">הקוד בתוקף ל-${minutesValid} דקות ועובד פעם אחת.</p>
    <p style="margin:0;font-size:14px;color:#5a5245;">אם לא ניסיתם להיכנס עכשיו, מישהו יודע את הסיסמה שלכם — שנו אותה וספרו למנהל/ת אחר/ת.</p>`;
  const text = `קוד הכניסה שלכם לניהול טיולי גשר: ${code}\n\nהקוד בתוקף ל-${minutesValid} דקות ועובד פעם אחת.\nאם לא ניסיתם להיכנס עכשיו, מישהו יודע את הסיסמה שלכם — שנו אותה וספרו למנהל/ת אחר/ת.`;
  return { subject, html: wrapEmail(`קוד הכניסה שלכם: ${code}`, body), text };
}
