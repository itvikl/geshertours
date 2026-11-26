"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Departure, Tour } from "@/lib/types";
import { availableSeats } from "@/lib/types";
import SafeImage from "@/components/ui/SafeImage";
import DepartureStatusPill from "@/components/marketing/DepartureStatusPill";
import { focusPosition } from "@/lib/imageFocus";
import { countryLabel } from "@/lib/countryNames";
import { formatUsd, singleSupplementOf } from "@/lib/pricing";
import { isDepartureBookable } from "@/lib/departureAvailability";
import {
  MAIN_VERSION_ID,
  departureDays,
  departurePricing,
  departureVersionId,
  hasVersions,
  lowestPrice,
  versionDifferences,
  versionLabel,
} from "@/lib/tourVersions";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * One tour on the home page, the full width of the list: photo, title,
 * summary and the next dates, with "פרטים נוספים" opening a table of every
 * upcoming date (version, what differs, days, price, status, note) like the
 * old site's dates table.
 */
export default function TourRow({
  tour,
  departures,
  image,
  soldOut,
  lowSeatsThreshold,
  eager = false,
}: {
  tour: Tour;
  /** Upcoming dates (already filtered by the search), soonest first. */
  departures: Departure[];
  image: string;
  soldOut: boolean;
  lowSeatsThreshold: number;
  eager?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const versioned = hasVersions(tour);
  const fromPrice = lowestPrice(tour, departures);
  const durations = Array.from(new Set(departures.map(departureDays))).sort((a, b) => a - b);
  const durationText =
    durations.length > 1 ? `${durations[0]}–${durations[durations.length - 1]} ימים` : `${durations[0] ?? tour.durationDays} ימים`;
  const versionCount = versioned
    ? new Set(departures.map((d) => departureVersionId(tour, d))).size
    : 0;
  const tourHref = `/tours/${tour.slug}`;
  const bookHref = (d: Departure) => `${tourHref}/book?departure=${encodeURIComponent(d.departureId)}`;
  const versionHref = (id: string) => (id === MAIN_VERSION_ID ? tourHref : `${tourHref}?v=${encodeURIComponent(id)}`);

  return (
    <article className="glass-card relative overflow-hidden rounded-3xl shadow-2xl backdrop-blur-lg">
      {(soldOut || tour.isSpecialOffer) && (
        <div
          className={`absolute start-4 top-4 z-10 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-lg ${
            soldOut
              ? "border border-[var(--color-border-hairline)] bg-[var(--color-glacier-elevated)] text-[var(--color-slate)]"
              : "bg-[var(--color-offer-gold)] text-[#0f1524]"
          }`}
        >
          {soldOut ? "אזל" : "מבצע"}
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        <Link href={tourHref} className="group relative block h-56 shrink-0 overflow-hidden md:h-auto md:min-h-56 md:w-80" tabIndex={-1}>
          <SafeImage
            src={image}
            alt={tour.title}
            sizes="(min-width: 768px) 320px, 100vw"
            loading={eager ? "eager" : "lazy"}
            objectPosition={focusPosition(tour.imageFocus, image)}
            className="object-cover transition duration-700 group-hover:scale-110"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ice)]">
                {tour.countries.map(countryLabel).join(" · ")}
              </p>
              <h3 className="mt-1 text-xl font-bold text-[var(--color-mist)] sm:text-2xl">
                <Link href={tourHref} className="hover:text-[var(--color-ice)]">
                  {tour.title}
                </Link>
              </h3>
            </div>
            <p className="shrink-0 text-end">
              <span className="block text-xs text-[var(--color-slate)]">החל מ-</span>
              <span className="text-xl font-bold text-[var(--color-ice)]">{formatUsd(fromPrice)}</span>
            </p>
          </div>

          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-slate)]">{tour.summary}</p>

          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[var(--color-slate)]">
            <li>{durationText}</li>
            <li>
              {departures.length === 0
                ? "מועדים גמישים"
                : departures.length === 1
                  ? `מועד אחד · ${shortDate(departures[0].startDate)}`
                  : `${departures.length} מועדים · הקרוב ${shortDate(departures[0].startDate)}`}
            </li>
            {versionCount > 1 && <li>{versionCount} גרסאות</li>}
            {tour.airline && !versioned && <li>טיסת {tour.airline}</li>}
          </ul>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-hairline-faint)] pt-4">
            {departures.length > 0 ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border-ice-strong)] px-4 py-2 text-sm font-bold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-ice)] hover:text-[var(--color-ice-ink)]"
              >
                {open ? "הסתרת המועדים" : "פרטים נוספים ומועדים"}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            ) : (
              <span />
            )}
            <Link
              href={tourHref}
              className="flex items-center gap-1 text-sm font-bold text-[var(--color-ice)] transition-all hover:gap-2"
            >
              לעמוד הטיול <span aria-hidden="true">←</span>
            </Link>
          </div>
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-[var(--color-border-hairline-faint)] bg-[var(--color-surface-hover-a)] p-4 sm:p-6">
          {/* Wide screens: one table, like the old site's dates table. */}
          <table className="hidden w-full text-start text-sm md:table">
            <thead className="text-xs font-semibold text-[var(--color-slate)]">
              <tr className="border-b border-[var(--color-border-hairline)]">
                {versioned && <th className="py-2 pe-3 text-start">גרסה</th>}
                {versioned && <th className="py-2 pe-3 text-start">מה שונה</th>}
                <th className="py-2 pe-3 text-start">יציאה</th>
                <th className="py-2 pe-3 text-start">חזרה</th>
                <th className="py-2 pe-3 text-start">ימים</th>
                <th className="py-2 pe-3 text-start">מחיר לאדם בחדר זוגי</th>
                <th className="py-2 pe-3 text-start">תוספת ליחיד</th>
                <th className="py-2 pe-3 text-start">סטטוס</th>
                <th className="py-2 pe-3 text-start">הערות</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-hairline-faint)] text-[var(--color-mist)]">
              {departures.map((d) => {
                const pricing = departurePricing(tour, d);
                const vId = departureVersionId(tour, d);
                return (
                  <tr key={d.departureId} className="align-middle">
                    {versioned && (
                      <td className="py-2.5 pe-3 font-semibold">
                        <Link href={versionHref(vId)} className="hover:text-[var(--color-ice)] hover:underline">
                          {versionLabel(tour, vId) || "המסלול הראשי"}
                        </Link>
                      </td>
                    )}
                    {versioned && (
                      <td className="py-2.5 pe-3 text-xs text-[var(--color-slate)]">
                        {versionDifferences(tour, vId).join(" · ") || "—"}
                      </td>
                    )}
                    <td className="py-2.5 pe-3 tabular-nums">{shortDate(d.startDate)}</td>
                    <td className="py-2.5 pe-3 tabular-nums">{shortDate(d.endDate)}</td>
                    <td className="py-2.5 pe-3 tabular-nums">{departureDays(d)}</td>
                    <td className="py-2.5 pe-3 font-semibold tabular-nums">{formatUsd(pricing.pricePerPersonDouble)}</td>
                    <td className="py-2.5 pe-3 tabular-nums">
                      {singleSupplementOf(pricing) > 0 ? formatUsd(singleSupplementOf(pricing)) : "—"}
                    </td>
                    <td className="py-2.5 pe-3">
                      <DepartureStatusPill status={d.status} seats={availableSeats(d)} lowSeatsThreshold={lowSeatsThreshold} />
                    </td>
                    <td className="py-2.5 pe-3 text-xs text-[var(--color-ice)]">{d.note}</td>
                    <td className="py-2.5 text-end">
                      {isDepartureBookable(d) && (
                        <Link
                          href={bookHref(d)}
                          className="whitespace-nowrap rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--color-success-dark)]"
                        >
                          להרשמה
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Narrow screens: one small card per date. */}
          <ul className="space-y-3 md:hidden">
            {departures.map((d) => {
              const pricing = departurePricing(tour, d);
              const vId = departureVersionId(tour, d);
              const differences = versioned ? versionDifferences(tour, vId) : [];
              return (
                <li
                  key={d.departureId}
                  className="space-y-1.5 rounded-xl border border-[var(--color-border-hairline)] bg-[var(--color-glacier)] p-3 text-sm"
                >
                  {versioned && (
                    <p className="font-bold text-[var(--color-mist)]">
                      {versionLabel(tour, vId) || "המסלול הראשי"}
                      {differences.length > 0 && (
                        <span className="ms-2 text-xs font-normal text-[var(--color-slate)]">{differences.join(" · ")}</span>
                      )}
                    </p>
                  )}
                  <p className="tabular-nums text-[var(--color-mist)]">
                    {shortDate(d.startDate)} – {shortDate(d.endDate)} · {departureDays(d)} ימים
                  </p>
                  <p className="text-[var(--color-slate)]">
                    <span className="font-semibold text-[var(--color-mist)]">{formatUsd(pricing.pricePerPersonDouble)}</span> לאדם בחדר זוגי
                    {singleSupplementOf(pricing) > 0 && ` · תוספת ליחיד ${formatUsd(singleSupplementOf(pricing))}`}
                  </p>
                  {d.note && <p className="text-xs font-semibold text-[var(--color-ice)]">{d.note}</p>}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <DepartureStatusPill status={d.status} seats={availableSeats(d)} lowSeatsThreshold={lowSeatsThreshold} />
                    {isDepartureBookable(d) && (
                      <Link
                        href={bookHref(d)}
                        className="rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-xs font-bold text-white"
                      >
                        להרשמה
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
