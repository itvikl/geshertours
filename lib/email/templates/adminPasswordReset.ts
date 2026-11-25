import { escapeHtml, wrapEmail } from "@/lib/email/layout";
import type { EmailContent } from "@/lib/email/templates/bookingConfirmation";

/** "Forgot password?" on the admin sign-in page (lib/actions/adminAccount.ts). */
export function adminPasswordResetEmail(resetLink: string): EmailContent {
  const subject = "איפוס הסיסמה לניהול טיולי גשר";
  const href = escapeHtml(resetLink);
  const body = `
    <p style="margin:0 0 16px;font-size:16px;">התקבלה בקשה לאיפוס הסיסמה של חשבון הניהול שלכם בטיולי גשר.</p>
    <p style="margin:0 0 24px;">
      <a href="${href}" style="display:inline-block;background:#1b3a5c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:6px;">בחירת סיסמה חדשה</a>
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:#5a5245;">הקישור בתוקף לשעה אחת ועובד פעם אחת. האימות הדו-שלבי ממשיך לפעול גם אחרי השינוי.</p>
    <p style="margin:0;font-size:14px;color:#5a5245;">אם לא ביקשתם את זה, התעלמו מהמייל — הסיסמה שלכם לא תשתנה.</p>`;
  const text = `התקבלה בקשה לאיפוס הסיסמה של חשבון הניהול שלכם בטיולי גשר.\n\nבחירת סיסמה חדשה: ${resetLink}\n\nהקישור בתוקף לשעה אחת ועובד פעם אחת. האימות הדו-שלבי ממשיך לפעול גם אחרי השינוי.\nאם לא ביקשתם את זה, התעלמו מהמייל — הסיסמה שלכם לא תשתנה.`;
  return { subject, html: wrapEmail("איפוס סיסמת הניהול", body), text };
}
