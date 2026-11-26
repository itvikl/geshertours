import type { Departure, Tour, TourPricing, TourVersion } from "@/lib/types";
import { formatUsd } from "@/lib/pricing";

/**
 * Tour versions (Tour.versions): one tour page, several variants that differ
 * in a few details. A departure belongs to one version (Departure.versionId,
 * none = the main version). Every value resolves date → version → tour, so a
 * version or date only stores what differs.
 */

export const MAIN_VERSION_ID = "main";

/** The version a departure belongs to; undefined for the main version or an id that's gone. */
export function versionOf(tour: Tour, versionId?: string): TourVersion | undefined {
  if (!versionId || versionId === MAIN_VERSION_ID) return undefined;
  return tour.versions?.find((v) => v.versionId === versionId);
}

/** The departure's version id, normalised: MAIN_VERSION_ID when it has none or its version was deleted. */
export function departureVersionId(tour: Tour, departure: Departure): string {
  return versionOf(tour, departure.versionId)?.versionId ?? MAIN_VERSION_ID;
}

function definedOnly<T extends object>(value: Partial<T> | undefined): Partial<T> {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, v]) => v !== undefined && v !== null && !Number.isNaN(v))
  ) as Partial<T>;
}

/** Tour pricing with the version's and then the date's own prices on top. */
export function resolvePricing(tour: Tour, version?: TourVersion, departure?: Departure): TourPricing {
  return {
    ...tour.pricing,
    ...definedOnly(version?.pricing),
    ...definedOnly(departure?.pricingOverride),
  };
}

/** Pricing a booking on this date is charged at. */
export function departurePricing(tour: Tour, departure: Departure): TourPricing {
  return resolvePricing(tour, versionOf(tour, departure.versionId), departure);
}

/**
 * The tour as one version shows it: the version's itinerary, length,
 * inclusions, kashrut, airline and prices in place of the tour's. Passing no
 * version (or the main one) returns the tour unchanged.
 */
export function tourAsVersion(tour: Tour, versionId?: string): Tour {
  const version = versionOf(tour, versionId);
  if (!version) return tour;
  return {
    ...tour,
    airline: version.airline?.trim() || tour.airline,
    durationDays: version.durationDays || tour.durationDays,
    pricing: resolvePricing(tour, version),
    itineraryDays: version.itineraryDays?.length ? version.itineraryDays : tour.itineraryDays,
    inclusions: version.inclusions?.length ? version.inclusions : tour.inclusions,
    exclusions: version.exclusions?.length ? version.exclusions : tour.exclusions,
    kashrutDetails: version.kashrutDetails?.supervisionLevel?.trim()
      ? version.kashrutDetails
      : tour.kashrutDetails,
  };
}

/** Days from start to end date, inclusive. */
export function departureDays(departure: Departure): number {
  const ms = Date.parse(departure.endDate) - Date.parse(departure.startDate);
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) + 1 : 0;
}

/** Dates-table label: the version's label, or the tour's main-version label. */
export function versionLabel(tour: Tour, versionId?: string): string {
  const version = versionOf(tour, versionId);
  return (version ? version.label : tour.mainVersionLabel)?.trim() || "";
}

export function hasVersions(tour: Tour): boolean {
  return (tour.versions?.length ?? 0) > 0;
}

/**
 * What sets a version apart from the main tour, as short Hebrew phrases for
 * the dates table ("טיסת אל על", "7 ימים", "מסלול שונה"…). Only fields the
 * version actually changes are listed.
 */
export function versionDifferences(tour: Tour, versionId?: string): string[] {
  const version = versionOf(tour, versionId);
  if (!version) return [];
  const out: string[] = [];
  const airline = version.airline?.trim();
  if (airline && airline !== tour.airline?.trim()) out.push(`טיסת ${airline}`);
  if (version.durationDays && version.durationDays !== tour.durationDays) out.push(`${version.durationDays} ימים`);
  const price = version.pricing?.pricePerPersonDouble;
  if (price !== undefined && price !== tour.pricing.pricePerPersonDouble) out.push(`מחיר ${formatUsd(price)}`);
  if (version.itineraryDays?.length) out.push("מסלול שונה");
  if (version.kashrutDetails?.supervisionLevel?.trim()) out.push("כשרות שונה");
  if (version.inclusions?.length || version.exclusions?.length) out.push("כלול במחיר שונה");
  return out;
}

/** Lowest per-person double price over the given dates (the tour's own when there are none). */
export function lowestPrice(tour: Tour, departures: Departure[]): number {
  if (departures.length === 0) return tour.pricing.pricePerPersonDouble;
  return Math.min(...departures.map((d) => departurePricing(tour, d).pricePerPersonDouble));
}

/** A short random id for a new version. */
export function newVersionId(): string {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}
