"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTestimonialDestinationImage } from "@/lib/actions/reviews";
import ImageUploadButton from "@/components/admin/ImageUploadButton";
import { useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

/**
 * Photo per destination card on /testimonials. Destinations come from the
 * reviews themselves (Review.destination, else the tour's first country);
 * without a chosen photo the card uses the most-reviewed tour's hero image.
 */
export default function TestimonialDestinationsPanel({
  destinations,
}: {
  destinations: { slug: string; name: string; image?: string; count: number }[];
}) {
  const router = useRouter();
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const toast = useToast();

  async function save(name: string, slug: string, image?: string) {
    setSavingSlug(slug);
    try {
      await setTestimonialDestinationImage(name, image);
      toast.success(
        image
          ? { title: "התמונה עודכנה", description: `נקבעה תמונה חדשה ל${name}.` }
          : { title: "התמונה אופסה", description: `${name} חזר/ה לתמונת ברירת המחדל.` }
      );
    } catch {
      toast.error({ title: "שמירת התמונה נכשלה", description: "משהו השתבש — נסו שוב." });
    }
    setSavingSlug(null);
    router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink">יעדים בדף ההמלצות</h2>
      <p className="mt-1 text-sm text-ink-muted">
        התמונה שבכרטיס של כל יעד בדף ההמלצות.
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((destination) => (
          <li
            key={destination.slug}
            className="flex items-center gap-4 rounded-xl border border-line bg-white p-4"
          >
            {destination.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={destination.image} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="h-16 w-20 shrink-0 rounded-lg bg-sand-warm" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{destination.name}</p>
              <p className="text-xs text-ink-muted">
                {destination.count} letter{destination.count === 1 ? "" : "s"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {savingSlug === destination.slug ? (
                  <span className="text-xs text-ink-muted">שומר…</span>
                ) : (
                  <>
                    <ImageUploadButton
                      label="החלפת תמונה"
                      folder="testimonials"
                      onUploaded={(urls) => save(destination.name, destination.slug, urls[0])}
                    />
                    <button
                      type="button"
                      onClick={() => save(destination.name, destination.slug, undefined)}
                      className="text-xs font-medium text-ink-muted hover:text-ink"
                    >
                      ברירת מחדל
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
