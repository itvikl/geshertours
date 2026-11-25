import type { Lead } from "@/lib/types";

/** Shared by the admin leads table, the lead edit page and the Excel export. */
export const LEAD_SOURCE_LABELS: Record<Lead["source"], string> = {
  contact: "טופס צור קשר",
  custom: "טיול בהתאמה אישית",
  evergreen: "טיול בתאריך גמיש",
  manual: "הוזן ידנית",
};

export const LEAD_STATUS_LABELS: Record<Lead["status"], string> = {
  new: "חדשה",
  contacted: "נוצר קשר",
  converted: "הפכה להזמנה",
  closed: "סגורה",
};
