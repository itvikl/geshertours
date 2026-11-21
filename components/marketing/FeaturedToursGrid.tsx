"use client";

import { useEffect, useState } from "react";
import { useTourFilter } from "@/components/marketing/TourFilterProvider";
import TourCard from "@/components/marketing/TourCard";
import { PhoneLink } from "@/components/marketing/SitePhone";
import { countryLabel } from "@/lib/countryNames";

const INITIAL_VISIBLE = 12;

function ChangeSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export default function FeaturedToursGrid() {
  const {
    selectedCountries,
    selectedMonths,
    filteredTours: tours,
    scrollToSearch,
  } = useTourFilter();
  const [expanded, setExpanded] = useState(false);
  const hasMonthFilter = selectedMonths.length > 0;
  const isFiltered = selectedCountries.length > 0 || hasMonthFilter;

  useEffect(() => {
    setExpanded(false);
  }, [selectedCountries, selectedMonths]);

  const visible = expanded ? tours : tours.slice(0, INITIAL_VISIBLE);
  const canExpand = tours.length > INITIAL_VISIBLE;

  const heading =
    selectedCountries.length === 0
      ? "טיולים נבחרים"
      : selectedCountries.length === 1
        ? `טיולים ל${countryLabel(selectedCountries[0])}`
        : selectedCountries.length === 2
          ? `טיולים ל${countryLabel(selectedCountries[0])} ול${countryLabel(selectedCountries[1])}`
          : `טיולים ל-${selectedCountries.length} מדינות`;

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-ice)]">
            בחירה שלנו
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            {heading}
          </h2>
          {isFiltered && (
            <button
              type="button"
              onClick={scrollToSearch}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-hairline)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-slate)] transition-colors hover:border-[var(--color-border-ice-strong)] hover:text-[var(--color-ice)]"
            >
              <ChangeSearchIcon />
              שינוי החיפוש
            </button>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <p className="max-w-md text-[15px] leading-7 text-[var(--color-slate)] md:text-end">
            {isFiltered
              ? tours.length === 1 ? "טיול אחד תואם לחיפוש שלכם." : `${tours.length} טיולים תואמים לחיפוש שלכם.`
              : "טיולים שנבחרו בקפידה, המשלבים נוחות, כשרות וגילוי — ומותאמים לכם ולסגנון הטיול שלכם."}
          </p>
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-bold text-[var(--color-ice)] transition hover:brightness-110"
            >
              {expanded ? "הצג פחות" : `הצג עוד (${tours.length - INITIAL_VISIBLE})`}
            </button>
          )}
        </div>
      </div>

      {tours.length === 0 ? (
        <p className="mt-12 text-[var(--color-slate)]">
          {hasMonthFilter
            ? "אין כרגע טיולים שיוצאים בחודשים האלה"
            : "אין כרגע טיולים ליעד הזה"} — התקשרו אלינו{" "}
          <PhoneLink className="font-semibold text-[var(--color-ice)]" />
          .
        </p>
      ) : (
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Lazy, not eager: this grid sits below the full-screen home hero,
              and eager cards were preloaded alongside it — competing with the
              LCP image for bandwidth on mobile. */}
          {visible.map(({ tour, nextDepartures, image, soldOut }) => (
            <TourCard
              key={tour.tourId}
              tour={tour}
              nextDepartures={nextDepartures}
              image={image}
              soldOut={soldOut}
            />
          ))}
        </div>
      )}
    </div>
  );
}
