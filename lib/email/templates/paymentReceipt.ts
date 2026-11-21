import { formatUsd } from "@/lib/pricing";
import { escapeHtml, formatDateRange, summaryRow, summaryTable, wrapEmail } from "@/lib/email/layout";
import type { EmailContent } from "@/lib/email/templates/bookingConfirmation";

export interface PaymentReceiptData {
  bookingId: string;
  contactName: string;
  tourTitle: string;
  startDate: string;
  endDate: string;
  amountPaid: number;
  totalPaid: number;
  grandTotal: number;
  balanceRemaining: number;
  paymentRef?: string;
  paidInFull: boolean;
}

export function paymentReceiptEmail(data: PaymentReceiptData): EmailContent {
  const dates = formatDateRange(data.startDate, data.endDate);
  const heading = data.paidInFull ? "התשלום התקבל — שולם במלואו" : "התשלום התקבל";
  const statusLine = data.paidInFull
    ? "הטיול שולם במלואו — אין יתרה לתשלום."
    : `היתרה בסך ${formatUsd(data.balanceRemaining)} לתשלום לפני היציאה.`;

  const rows =
    summaryRow("מספר הזמנה", data.bookingId) +
    summaryRow("סכום שחויב", formatUsd(data.amountPaid)) +
    (data.paymentRef ? summaryRow("אסמכתת תשלום", data.paymentRef) : "") +
    summaryRow("שולם עד כה", formatUsd(data.totalPaid)) +
    summaryRow("סה״כ לטיול", formatUsd(data.grandTotal)) +
    summaryRow("יתרה לתשלום", formatUsd(data.balanceRemaining));

  const html = wrapEmail(
    `קבלה על התשלום עבור ${data.tourTitle}.`,
    `<h1 style="margin:0 0 16px;font-size:20px;color:#1b3a5c;">${heading}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">שלום ${escapeHtml(data.contactName)},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
      תודה — חייבנו את הכרטיס שלכם ב-${formatUsd(data.amountPaid)} עבור <strong>${escapeHtml(data.tourTitle)}</strong> (${dates}). הודעה זו משמשת כקבלה.
    </p>
    ${summaryTable(rows)}
    <p style="margin:0;font-size:15px;line-height:1.6;">${statusLine}</p>`
  );

  const text = `שלום ${data.contactName},

תודה — חייבנו את הכרטיס שלכם ב-${formatUsd(data.amountPaid)} עבור ${data.tourTitle} (${dates}). הודעה זו משמשת כקבלה.

מספר הזמנה: ${data.bookingId}
סכום שחויב: ${formatUsd(data.amountPaid)}${data.paymentRef ? `\nאסמכתת תשלום: ${data.paymentRef}` : ""}
שולם עד כה: ${formatUsd(data.totalPaid)}
סה״כ לטיול: ${formatUsd(data.grandTotal)}
יתרה לתשלום: ${formatUsd(data.balanceRemaining)}

${statusLine}`;

  return { subject: `קבלה על תשלום — ${data.tourTitle}`, html, text };
}
