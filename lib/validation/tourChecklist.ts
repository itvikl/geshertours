import type { Tour } from "@/lib/types";

export interface ChecklistItem {
  /** Matches the editor field id (`field-<key>`) so a missing item can be scrolled to. */
  key: string;
  label: string;
  ok: boolean;
}

/**
 * Publish-readiness checklist (PRD FR-25: "Checklist שלמות לפני פרסום").
 * Pure/sync so the admin editor can re-run it on every keystroke against
 * live form state, not just at submit time.
 */
export function getPublishChecklist(tour: Tour): ChecklistItem[] {
  return [
    { key: "title", label: "כותרת", ok: tour.title.trim().length > 0 },
    { key: "slug", label: "כתובת (slug)", ok: tour.slug.trim().length > 0 },
    { key: "summary", label: "תקציר", ok: tour.summary.trim().length > 0 },
    { key: "heroImage", label: "תמונה ראשית", ok: tour.heroImage.trim().length > 0 },
    { key: "countries", label: "מדינות", ok: tour.countries.length > 0 },
    {
      key: "pricePerPersonDouble",
      label: "מחיר לאדם (בחדר זוגי)",
      ok: tour.pricing.pricePerPersonDouble > 0,
    },
    {
      key: "supervisionLevel",
      label: "רמת הכשרות",
      ok: tour.kashrutDetails.supervisionLevel.trim().length > 0,
    },
    { key: "itinerary", label: "לפחות יום אחד במסלול", ok: tour.itineraryDays.length > 0 },
  ];
}

export function isReadyToPublish(tour: Tour): boolean {
  return getPublishChecklist(tour).every((item) => item.ok);
}
