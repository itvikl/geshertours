import type { BookingStatus, DepartureStatus, Occupancy, TourStatus } from "@/lib/types";

/**
 * Hebrew labels for the stored English status values, shared by the admin
 * tables, badges and exports. The stored values themselves stay English.
 */
export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  draft: "טיוטה",
  published: "מפורסם",
  archived: "בארכיון",
};

/** Blog posts, offers and SEO pages: draft or published. */
export const PUBLISH_STATUS_LABELS: Record<"draft" | "published", string> = {
  draft: "טיוטה",
  published: "מפורסם",
};

export const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string> = {
  open: "פתוח להרשמה",
  closed: "סגור",
  soldout: "מלא",
  cancelled: "בוטל",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "ממתין לתשלום",
  partial_paid: "שולם חלקית",
  paid_in_full: "שולם במלואו",
  cancelled: "בוטל",
  refunded: "הוחזר",
};

export const OCCUPANCY_LABELS: Record<Occupancy, string> = {
  double: "חדר זוגי",
  single: "חדר ליחיד",
  triple: "חדר לשלושה",
  child: "ילד/ה",
};

export const REVIEW_STATUS_LABELS: Record<"pending" | "approved" | "rejected", string> = {
  pending: "ממתינה לאישור",
  approved: "מאושרת",
  rejected: "נדחתה",
};
