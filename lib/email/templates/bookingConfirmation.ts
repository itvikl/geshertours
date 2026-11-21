import { formatUsd } from "@/lib/pricing";
import { escapeHtml, formatDateRange, summaryRow, summaryTable, wrapEmail } from "@/lib/email/layout";
import type { ContactPreference } from "@/lib/types";

export interface BookingConfirmationData {
  bookingId: string;
  contactName: string;
  tourTitle: string;
  startDate: string;
  endDate: string;
  travelerCount: number;
  grandTotal: number;
  depositAmount: number;
  balanceAmount: number;
  contactPreference: ContactPreference;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function bookingConfirmationEmail(data: BookingConfirmationData): EmailContent {
  const dates = formatDateRange(data.startDate, data.endDate);
  const travelerLabel = data.travelerCount === 1 ? "מטייל אחד" : `${data.travelerCount} מטיילים`;

  const noDeposit = data.depositAmount <= 0;
  const nextStep = noDeposit
    ? "אין צורך במקדמה כדי לשריין את מקומכם. הצוות שלנו ייצור איתכם קשר בקרוב לאישור ההזמנה ולהסדרת התשלום."
    : data.contactPreference === "pay_online"
      ? `השלימו את תשלום המקדמה בסך ${formatUsd(data.depositAmount)} באתר כדי להבטיח את מקומכם.`
      : `הצוות שלנו יתקשר אליכם בקרוב לגביית המקדמה בסך ${formatUsd(data.depositAmount)} ולאישור מקומכם.`;

  const rows =
    summaryRow("מספר הזמנה", data.bookingId) +
    summaryRow("סה״כ לטיול", formatUsd(data.grandTotal)) +
    summaryRow("מקדמה לתשלום", noDeposit ? "ללא" : formatUsd(data.depositAmount)) +
    summaryRow("יתרה לתשלום", formatUsd(data.balanceAmount));

  const html = wrapEmail(
    `ההרשמה שלכם ל${data.tourTitle} התקבלה.`,
    `<h1 style="margin:0 0 16px;font-size:20px;color:#1b3a5c;">ההרשמה התקבלה</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">שלום ${escapeHtml(data.contactName)},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
      קיבלנו את ההרשמה שלכם ל<strong>${escapeHtml(data.tourTitle)}</strong> (${dates}).
      המקום שמור עבור ${travelerLabel} — ההזמנה עדיין לא שולמה.
    </p>
    ${summaryTable(rows)}
    <p style="margin:0;font-size:15px;line-height:1.6;">${nextStep}</p>`
  );

  const text = `שלום ${data.contactName},

קיבלנו את ההרשמה שלכם ל${data.tourTitle} (${dates}). המקום שמור עבור ${travelerLabel} — ההזמנה עדיין לא שולמה.

מספר הזמנה: ${data.bookingId}
סה״כ לטיול: ${formatUsd(data.grandTotal)}
מקדמה לתשלום: ${noDeposit ? "ללא" : formatUsd(data.depositAmount)}
יתרה לתשלום: ${formatUsd(data.balanceAmount)}

${nextStep}`;

  return { subject: `ההרשמה התקבלה — ${data.tourTitle}`, html, text };
}
