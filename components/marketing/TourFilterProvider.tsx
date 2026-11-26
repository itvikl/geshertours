"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Departure, Tour } from "@/lib/types";
import type { CountryOption } from "@/lib/data/tours";
import { hasBookableDeparture, pickNextDepartures } from "@/lib/departureAvailability";
import { departureDays } from "@/lib/tourVersions";
import { smoothScrollTo } from "@/lib/smoothScroll";

/** Id of the DestinationSearch root, so results and "Change Search" can scroll to each other. */
export const SEARCH_ANCHOR_ID = "destination-search";
/** Id of the Featured Tours heading, so applying a filter can scroll down to it. */
export const RESULTS_ANCHOR_ID = "featured-tours";

export type FeaturedTourItem = {
  tour: Tour;
  departures: Departure[];
  image: string;
};

/** Trip-length buckets for the length filter (?length=). */
export const LENGTH_OPTIONS = [
  { id: "short", label: "עד 6 ימים", min: 1, max: 6 },
  { id: "week", label: "7–9 ימים", min: 7, max: 9 },
  { id: "long", label: "10 ימים ומעלה", min: 10, max: Infinity },
] as const;

export type TourFilters = {
  countries: string[];
  months: string[];
  /** LENGTH_OPTIONS ids. */
  lengths: string[];
  /** Tour.themeTags values. */
  tags: string[];
};

const FILTER_KEYS = { countries: "country", months: "month", lengths: "length", tags: "tag" } as const;
const NO_FILTERS: TourFilters = { countries: [], months: [], lengths: [], tags: [] };

export type FilteredTourItem = {
  tour: Tour;
  /** Every upcoming date that matches the month/length filters, soonest first. */
  departures: Departure[];
  /** Up to two upcoming dates to advertise on the card; empty means flexible dates. */
  nextDepartures: Departure[];
  image: string;
  /** No upcoming date has a spot left to book. */
  soldOut: boolean;
};

type TourFilterContextValue = {
  selectedCountries: string[];
  selectedMonths: string[];
  selectedLengths: string[];
  selectedTags: string[];
  /** Theme tags used by at least one listed tour, for the type filter. */
  availableTags: string[];
  /** Merges `next` into the current filters (a key left out keeps its value). */
  applyFilters: (next: Partial<TourFilters>, opts?: { scroll?: boolean }) => void;
  scrollToResults: () => void;
  scrollToSearch: () => void;
  countries: CountryOption[];
  tours: FeaturedTourItem[];
  filteredTours: FilteredTourItem[];
};

const TourFilterContext = createContext<TourFilterContextValue | null>(null);

function parseListParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: string[] = []
): string[] {
  const fromUrl = searchParams.getAll(key).filter(Boolean);
  return fromUrl.length > 0 ? fromUrl : fallback;
}

/** "YYYY-MM" for a departure's start date, using UTC to match date-only ISO strings. */
function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** A departure matches when it starts in one of the months and its length is in one of the buckets. */
function departureMatches(departure: Departure, months: Set<string>, lengths: string[]): boolean {
  if (months.size > 0 && !months.has(monthKey(departure.startDate))) return false;
  if (lengths.length === 0) return true;
  const days = departureDays(departure);
  return LENGTH_OPTIONS.some((o) => lengths.includes(o.id) && days >= o.min && days <= o.max);
}

/**
 * Mirrors ?country=&month=&length=&tag= into the provider's state (initial
 * load, footer destination links, back/forward). Isolated in its own tiny
 * Suspense boundary because useSearchParams opts its boundary out of static
 * prerendering — kept here, it lets the rest of the homepage be prebuilt
 * HTML instead of a per-request render (the cold-start cost on "/").
 */
function UrlFilterSync({ onChange }: { onChange: (filters: TourFilters) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onChange({
      countries: parseListParam(searchParams, FILTER_KEYS.countries),
      months: parseListParam(searchParams, FILTER_KEYS.months),
      lengths: parseListParam(searchParams, FILTER_KEYS.lengths),
      tags: parseListParam(searchParams, FILTER_KEYS.tags),
    });
  }, [searchParams, onChange]);
  return null;
}

export function TourFilterProvider({
  countries,
  tours,
  initialCountries = [],
  initialMonths = [],
  children,
}: {
  countries: CountryOption[];
  tours: FeaturedTourItem[];
  initialCountries?: string[];
  initialMonths?: string[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<TourFilters>({
    ...NO_FILTERS,
    countries: initialCountries,
    months: initialMonths,
  });

  const syncFromUrl = useCallback((next: TourFilters) => setFilters(next), []);

  // Leave room for the sticky header (and a bit of breathing room) instead
  // of flushing the target flat to the very top of the viewport.
  const headerOffset = 140;

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(RESULTS_ANCHOR_ID);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      smoothScrollTo(top);
    });
  }, []);

  const scrollToSearch = useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(SEARCH_ANCHOR_ID);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      smoothScrollTo(top);
    });
  }, []);

  const applyFilters = useCallback(
    (next: Partial<TourFilters>, opts?: { scroll?: boolean }) => {
      const merged = { ...filters };
      for (const key of Object.keys(FILTER_KEYS) as (keyof TourFilters)[]) {
        if (next[key]) merged[key] = [...new Set(next[key]!.filter(Boolean))];
      }
      setFilters(merged);

      // Only runs on user interaction, so reading the live URL is safe here.
      const params = new URLSearchParams(window.location.search);
      for (const key of Object.keys(FILTER_KEYS) as (keyof TourFilters)[]) {
        params.delete(FILTER_KEYS[key]);
        for (const value of merged[key]) params.append(FILTER_KEYS[key], value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

      if (opts?.scroll !== false) {
        scrollToResults();
      }
    },
    [filters, pathname, router, scrollToResults]
  );

  const availableTags = useMemo(
    () => [...new Set(tours.flatMap((item) => item.tour.themeTags.map((t) => t.trim()).filter(Boolean)))].sort(),
    [tours]
  );

  const filteredTours = useMemo(() => {
    const selectedCountries = new Set(filters.countries);
    const selectedTags = new Set(filters.tags);
    const months = new Set(filters.months);
    const dateFiltered = months.size > 0 || filters.lengths.length > 0;

    const matched: FilteredTourItem[] = [];
    for (const { tour, departures, image } of tours) {
      if (selectedCountries.size > 0 && !tour.countries.some((c) => selectedCountries.has(c))) continue;
      if (selectedTags.size > 0 && !tour.themeTags.some((t) => selectedTags.has(t.trim()))) continue;
      const inRange = departures.filter((d) => departureMatches(d, months, filters.lengths));
      if (dateFiltered && inRange.length === 0) continue;
      matched.push({
        tour,
        departures: inRange,
        nextDepartures: pickNextDepartures(inRange),
        image,
        soldOut: !hasBookableDeparture(departures),
      });
    }
    return matched;
  }, [filters, tours]);

  const value = useMemo(
    () => ({
      selectedCountries: filters.countries,
      selectedMonths: filters.months,
      selectedLengths: filters.lengths,
      selectedTags: filters.tags,
      availableTags,
      applyFilters,
      scrollToResults,
      scrollToSearch,
      countries,
      tours,
      filteredTours,
    }),
    [filters, availableTags, applyFilters, scrollToResults, scrollToSearch, countries, tours, filteredTours]
  );

  return (
    <TourFilterContext.Provider value={value}>
      <Suspense fallback={null}>
        <UrlFilterSync onChange={syncFromUrl} />
      </Suspense>
      {children}
    </TourFilterContext.Provider>
  );
}

export function useTourFilter() {
  const ctx = useContext(TourFilterContext);
  if (!ctx) {
    throw new Error("useTourFilter must be used within TourFilterProvider");
  }
  return ctx;
}
