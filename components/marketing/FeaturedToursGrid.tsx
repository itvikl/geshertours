"use client";

import { useState } from "react";
import { LENGTH_OPTIONS, useTourFilter } from "@/components/marketing/TourFilterProvider";
import TourRow from "@/components/marketing/TourRow";
import { PhoneLink } from "@/components/marketing/SitePhone";
import { countryLabel } from "@/lib/countryNames";

const INITIAL_VISIBLE = 8;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "border-[var(--color-ice)] bg-[var(--color-ice)] text-[var(--color-ice-ink)]"
          : "border-[var(--color-border-hairline)] text-[var(--color-slate)] hover:border-[var(--color-border-ice-strong)] hover:text-[var(--color-ice)]"
      }`}
    >
      {children}
    </button>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function ChangeSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export default function FeaturedToursGrid({ lowSeatsThreshold = 5 }: { lowSeatsThreshold?: number }) {
  const {
    selectedCountries,
    selectedMonths,
    selectedLengths,
    selectedTags,
    availableTags,
    applyFilters,
    filteredTours: tours,
    scrollToSearch,
  } = useTourFilter();
  // "Show more" belongs to one search: changing any filter collapses the list again.
  const filterKey = JSON.stringify([selectedCountries, selectedMonths, selectedLengths, selectedTags]);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const expanded = expandedFor === filterKey;
  const hasMonthFilter = selectedMonths.length > 0;
  const hasListFilter = selectedLengths.length > 0 || selectedTags.length > 0;
  const isFiltered = selectedCountries.length > 0 || hasMonthFilter || hasListFilter;

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
              onClick={() => setExpandedFor(expanded ? null : filterKey)}
              className="text-sm font-bold text-[var(--color-ice)] transition hover:brightness-110"
            >
              {expanded ? "הצג פחות" : `הצג עוד (${tours.length - INITIAL_VISIBLE})`}
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="משך הטיול">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate)]">משך</span>
          {LENGTH_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={selectedLengths.includes(option.id)}
              onClick={() => applyFilters({ lengths: toggle(selectedLengths, option.id) }, { scroll: false })}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="סוג הטיול">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate)]">סוג</span>
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                active={selectedTags.includes(tag)}
                onClick={() => applyFilters({ tags: toggle(selectedTags, tag) }, { scroll: false })}
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}
        {isFiltered && (
          <button
            type="button"
            onClick={() => applyFilters({ countries: [], months: [], lengths: [], tags: [] }, { scroll: false })}
            className="text-sm font-semibold text-[var(--color-ice)] hover:underline"
          >
            ניקוי כל הסינונים
          </button>
        )}
      </div>

      {tours.length === 0 ? (
        <p className="mt-12 text-[var(--color-slate)]">
          {isFiltered ? "אין כרגע טיולים שמתאימים לחיפוש" : "אין כרגע טיולים מתוכננים"} — התקשרו אלינו{" "}
          <PhoneLink className="font-semibold text-[var(--color-ice)]" />
          .
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Lazy, not eager: this list sits below the full-screen home hero,
              and eager photos were preloaded alongside it — competing with the
              LCP image for bandwidth on mobile. */}
          {visible.map(({ tour, departures, image, soldOut }) => (
            <TourRow
              key={tour.tourId}
              tour={tour}
              departures={departures}
              image={image}
              soldOut={soldOut}
              lowSeatsThreshold={lowSeatsThreshold}
            />
          ))}
        </div>
      )}
    </div>
  );
}
