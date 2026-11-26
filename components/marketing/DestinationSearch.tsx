"use client";

import CountrySelect from "@/components/marketing/CountrySelect";
import MonthSelect from "@/components/marketing/MonthSelect";
import {
  useTourFilter,
  SEARCH_ANCHOR_ID,
} from "@/components/marketing/TourFilterProvider";

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Client-side destination search — two segments (destination, date) side by
 * side on one line, each just an icon and a value (no header text — an
 * sr-only label keeps them accessible). They combine: a destination and
 * months together show that destination's tours in those months. The
 * button between them clears both (length and trip type are filtered
 * above the tour list, in TourListFilters).
 *
 * Scroll timing differs by field: the destination dropdown closes itself
 * the instant you pick one, so it applies and scrolls right away. The date
 * dropdown stays open across multiple checks, so it applies live (the
 * results update) but only scrolls once the menu actually closes — not on
 * every checkbox click.
 */
export default function DestinationSearch() {
  const {
    selectedCountries,
    selectedMonths,
    applyFilters,
    scrollToResults,
    countries,
  } = useTourFilter();
  const anyActive = selectedMonths.length > 0 || selectedCountries.length > 0;

  function clearBoth() {
    applyFilters({ countries: [], months: [] }, { scroll: false });
  }

  return (
    <div
      id={SEARCH_ANCHOR_ID}
      className="destination-search glass-card relative mx-auto flex w-full max-w-3xl flex-col items-stretch rounded-[28px] p-1.5 shadow-2xl backdrop-blur-lg sm:flex-row sm:rounded-full"
    >
      <div className="flex flex-1 items-center rounded-full px-5 py-2.5 hover:bg-[var(--color-surface-hover-a)]">
        <CountrySelect
          countries={countries}
          value={selectedCountries}
          multiple={false}
          icon={<PinIcon />}
          label="יעד"
          hideLabel
          onChange={(next) => applyFilters({ countries: next })}
        />
      </div>

      <div className="flex shrink-0 items-center justify-center self-center px-1 py-1 sm:py-0">
        {anyActive ? (
          <button
            type="button"
            onClick={clearBoth}
            title="ניקוי החיפוש"
            aria-label="ניקוי החיפוש"
            className="flex h-7 w-9 items-center justify-center rounded-full border border-[var(--color-border-ice-strong)] bg-[var(--color-surface-hover-a)] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-ice)] hover:text-[var(--color-ice-ink)]"
          >
            <ClearIcon />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-7 w-9 items-center justify-center rounded-full border border-[var(--color-border-hairline)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate)]"
          >
            ·
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center rounded-full px-5 py-2.5 hover:bg-[var(--color-surface-hover-a)]">
        <MonthSelect
          value={selectedMonths}
          icon={<CalendarIcon />}
          label="מועד"
          hideLabel
          onChange={(next) =>
            applyFilters({ months: next }, { scroll: false })
          }
          onClose={() => {
            if (selectedMonths.length > 0) scrollToResults();
          }}
        />
      </div>
    </div>
  );
}
