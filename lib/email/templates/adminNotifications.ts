import { formatUsd } from "@/lib/pricing";
import { escapeHtml, formatDateRange, summaryRow, summaryTable, wrapEmail } from "@/lib/email/layout";
import { LEAD_SOURCE_LABELS } from "@/lib/leadLabels";
import type { EmailContent } from "@/lib/email/templates/bookingConfirmation";
import type { ContactPreference, LeadSource, RoomConfiguration } from "@/lib/types";

export interface BookingNotificationData {
  bookingId: string;
  tourTitle: string;
  startDate: string;
  endDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactPreference: ContactPreference;
  travelerNames: string[];
  roomConfiguration: RoomConfiguration;
  grandTotal: number;
  depositAmount: number;
  initialPaymentAmount: number;
  adminUrl: string;
}

const CONTACT_PREFERENCE_LABELS: Record<ContactPreference, string> = {
  callback: "לחזור אליו/ה בטלפון",
  pay_online: "תשלום באתר",
};

function roomsLabel(rooms: RoomConfiguration): string {
  const parts = [
    rooms.doubleRooms && `${rooms.doubleRooms} זוגי`,
    rooms.singleRooms && `${rooms.singleRooms} ליחיד`,
    rooms.triples && `${rooms.triples} לשלושה`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function adminLink(url: string, label: string): string {
  return `<p style="margin:0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1b3a5c;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;">${escapeHtml(label)}</a></p>`;
}

/** Staff-facing "a new booking just came in" alert — not sent to the customer. */
export function bookingNotificationEmail(data: BookingNotificationData): EmailContent {
  const dates = formatDateRange(data.startDate, data.endDate);
  const travelers = data.travelerNames.join(", ");

  const fields: [string, string][] = [
    ["טיול", data.tourTitle],
    ["תאריכים", dates],
    ["שם", data.contactName],
    ["אימייל", data.contactEmail],
    ["טלפון", data.contactPhone || "—"],
    ["השלב הבא", CONTACT_PREFERENCE_LABELS[data.contactPreference]],
    [`מטיילים (${data.travelerNames.length})`, travelers],
    ["חדרים", roomsLabel(data.roomConfiguration)],
    ["מחיר הטיול", formatUsd(data.grandTotal)],
    ["מקדמה (מינימום)", formatUsd(data.depositAmount)],
    ["תשלום ראשון שנבחר", formatUsd(data.initialPaymentAmount)],
    ["מספר הזמנה", data.bookingId],
  ];

  const html = wrapEmail(
    `${data.contactName} נרשם/ה ל${data.tourTitle}.`,
    `<h1 style="margin:0 0 16px;font-size:20px;color:#1b3a5c;">הזמנה חדשה</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
      <strong>${escapeHtml(data.contactName)}</strong> נרשם/ה ל<strong>${escapeHtml(data.tourTitle)}</strong> (${dates}).
    </p>
    ${summaryTable(fields.map(([label, value]) => summaryRow(label, value)).join(""))}
    ${adminLink(data.adminUrl, "פתיחה בניהול")}`
  );

  const text = `הזמנה חדשה

${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}

פתיחה בניהול: ${data.adminUrl}`;

  return {
    subject: `הזמנה חדשה — ${data.tourTitle} (${data.travelerNames.length === 1 ? "מטייל אחד" : `${data.travelerNames.length} מטיילים`})`,
    html,
    text,
  };
}

export interface LeadNotificationData {
  leadId: string;
  source: LeadSource;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  destination?: string;
  groupSize?: number;
  travelStartDate?: string;
  travelEndDate?: string;
  tourTitle?: string;
  message?: string;
  adminUrl: string;
}

/** Staff-facing "a new lead just came in" alert. */
export function leadNotificationEmail(data: LeadNotificationData): EmailContent {
  const sourceLabel = LEAD_SOURCE_LABELS[data.source];
  const who = data.name || data.email || data.phone || "מישהו";

  const fields: [string, string | undefined][] = [
    ["מקור", sourceLabel],
    ["שם", data.name],
    ["אימייל", data.email],
    ["טלפון", data.phone],
    ["מדינה", data.country],
    ["טיול", data.tourTitle],
    ["יעד", data.destination],
    ["גודל הקבוצה", data.groupSize !== undefined ? String(data.groupSize) : undefined],
    ["מתאריך", data.travelStartDate],
    ["עד תאריך", data.travelEndDate],
  ];
  const shown = fields.filter((f): f is [string, string] => Boolean(f[1]));

  const messageHtml = data.message
    ? `<p style="margin:0 0 6px;font-size:14px;color:#5a5245;">הודעה</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</p>`
    : "";

  const html = wrapEmail(
    `פנייה חדשה מ${who}.`,
    `<h1 style="margin:0 0 16px;font-size:20px;color:#1b3a5c;">פנייה חדשה — ${escapeHtml(sourceLabel)}</h1>
    ${summaryTable(shown.map(([label, value]) => summaryRow(label, value)).join(""))}
    ${messageHtml}
    ${adminLink(data.adminUrl, "פתיחה בניהול")}`
  );

  const text = `פנייה חדשה — ${sourceLabel}

${shown.map(([label, value]) => `${label}: ${value}`).join("\n")}${data.message ? `\n\nהודעה:\n${data.message}` : ""}

פתיחה בניהול: ${data.adminUrl}`;

  return { subject: `פנייה חדשה — ${who} (${sourceLabel})`, html, text };
}
