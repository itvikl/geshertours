import { countryLabel } from "@/lib/countryNames";
import type { Review, Tour } from "@/lib/types";

/** Firestore collection of per-destination settings (TestimonialDestination). */
export const TESTIMONIAL_DESTINATIONS_COLLECTION = "testimonialDestinations";

/**
 * Anchor/doc id for a destination: "Spain & Portugal" → "spain-portugal".
 * Matches the old site's /testemonials-<slug>/ URLs, so their redirects can
 * land on /testimonials#<slug>.
 */
export function destinationSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The group a review is shown under on /testimonials. */
export function reviewDestination(review: Review, tour?: Tour): string {
  return review.destination?.trim() || tour?.countries?.[0] || "Other destinations";
}

/**
 * A destination as shown to visitors, in Hebrew: "Spain & Portugal" →
 * "ספרד ופורטוגל". The stored value stays English, since tour pages and the
 * /testimonials anchors match on it. Parts that aren't known countries are
 * shown as stored.
 */
export function destinationLabel(destination: string): string {
  if (destination === "Other destinations") return "יעדים נוספים";
  const labels = destination
    .split(/\s*(?:&|,)\s*/)
    .filter(Boolean)
    .map(countryLabel);
  if (labels.length < 2) return labels[0] ?? destination;
  return `${labels.slice(0, -1).join(", ")} ו${labels[labels.length - 1]}`;
}

/**
 * Whether a review belongs on a tour's page. A review with a destination
 * shows on every tour visiting a country it names ("Spain & Portugal" →
 * Spain and Portugal tours); without one, only on its own tour.
 */
export function reviewMatchesTour(review: Review, tour: Tour): boolean {
  const destination = review.destination?.trim().toLowerCase();
  if (!destination) return review.tourId === tour.tourId;
  return (tour.countries ?? []).some((country) => destination.includes(country.toLowerCase()));
}
