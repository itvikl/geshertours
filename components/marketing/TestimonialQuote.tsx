import Link from "next/link";
import type { Review, Tour } from "@/lib/types";
import { destinationLabel, reviewDestination } from "@/lib/testimonials";

/**
 * One traveler letter on /testimonials: a quote panel with large quote marks
 * either side, the traveler's name, and the tour (linked while it's live) or
 * destination underneath.
 */
export default function TestimonialQuote({
  review,
  tour,
  id,
}: {
  review: Review;
  tour?: Tour;
  /** Anchor for the old site's /testemonials-<slug>/ redirects (set on a destination's first letter). */
  id?: string;
}) {
  const linkTour = tour?.status === "published" ? tour : undefined;

  return (
    <figure
      id={id}
      className="glass-panel relative scroll-mt-28 rounded-3xl px-12 py-8 text-center sm:px-16 sm:py-10"
    >
      <span
        aria-hidden="true"
        className="absolute start-4 top-4 font-display text-5xl leading-none text-[var(--color-ice)] sm:start-6 sm:top-6"
      >
        &ldquo;
      </span>
      <span
        aria-hidden="true"
        className="absolute end-4 top-4 font-display text-5xl leading-none text-[var(--color-ice)] sm:end-6 sm:top-6"
      >
        &rdquo;
      </span>

      <blockquote className="whitespace-pre-line text-[16px] leading-8 text-[var(--color-mist)]">
        {review.body}
      </blockquote>

      <figcaption className="mt-6">
        <span className="block text-sm font-bold text-[var(--color-mist)]">
          {review.customerName}
        </span>
        {linkTour ? (
          <Link
            href={`/tours/${linkTour.slug}`}
            className="mt-1 inline-block text-sm italic text-[var(--color-ice)] hover:underline"
          >
            {linkTour.title}
          </Link>
        ) : (
          <span className="mt-1 block text-sm italic text-[var(--color-ice)]">
            {destinationLabel(reviewDestination(review, tour))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
