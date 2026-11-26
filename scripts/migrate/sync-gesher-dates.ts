import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import type { Departure, DepartureStatus, ItineraryDay, Staff, Tour, TourVersion } from "../../lib/types";
import { EUR_RATE, isoFromOldDate, parseMoney, parseTourPage, type ParsedTour } from "./import-gesher-tours";
import { UA, copyImage, firebase } from "./gesherFirebase";
import { fullSizeImage } from "./gesherPlaces";
import { resolvePricing, versionOf } from "../../lib/tourVersions";

/**
 * Brings the old site's current dates into Firestore, from its all-tours
 * table (geshertours.co.il/רשימת-כל-הטיולים/, read live every run):
 *
 * - Each row is matched to its tour: through MERGES (an old page that is now
 *   a version of another tour), else the tour with the same title, else the
 *   old page's title in the import cache. A page with no tour yet is read
 *   and created as a new tour.
 * - A tour that was archived (no dates at import) and now has dates gets its
 *   content re-read from the live page, since the old site rewrote it (e.g.
 *   "טיול ליוון" is now "יוון לעומק"). Its address and photos are kept.
 * - Dates are matched by start date: existing ones get the row's end date,
 *   price, note, status and guide (seats and bookings are never touched);
 *   new ones are created with --capacity seats. A row's price that differs
 *   from the tour's (or its version's) becomes that date's own price. EUR is
 *   converted at --eur-rate. Guides are matched to staff by name and created
 *   when missing.
 * - Upcoming dates in Firestore that the old table no longer lists are only
 *   reported, never deleted.
 * - With --publish, every tour that has upcoming dates is published.
 *
 * Dry run by default (reads Firestore, writes nothing):
 *   npx tsx scripts/migrate/sync-gesher-dates.ts
 *   npx tsx scripts/migrate/sync-gesher-dates.ts --commit [--publish] [--capacity=30]
 * The plan is also written to scripts/migrate/output/gesher-dates-sync.json.
 */

const COMMIT = process.argv.includes("--commit");
const PUBLISH = process.argv.includes("--publish");
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const CAPACITY = arg("capacity") ? parseInt(arg("capacity")!, 10) : 30;

const SITE = "https://geshertours.co.il";
const ALL_TOURS_URL = `${SITE}/${encodeURI("רשימת-כל-הטיולים")}/`;
const OUT_DIR = "scripts/migrate/output";
const CACHE_DIR = `${OUT_DIR}/gesher-cache`;

/**
 * Old pages that are a version of another tour rather than a tour of their
 * own (decided 2026-11-26; change here to undo). Keys and `into` are old
 * paths under /טיולים/.
 */
const MERGES: Record<string, { into: string; versionId: string; label: string; mainLabel: string }> = {
  "ארצות-הברית-מחוף-לחוף-2": {
    into: "ארצות-הברית-מחוף-לחוף",
    versionId: "washington",
    label: "כולל וושינגטון",
    mainLabel: "המסלול הרגיל",
  },
};

interface Row {
  oldPath: string;
  oldUrl: string;
  title: string;
  startDate: string;
  endDate: string;
  double: number;
  single: number;
  currency: "USD" | "EUR";
  status: DepartureStatus;
  guide?: string;
  note?: string;
}

const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
const toUsd = (amount: number, currency: "USD" | "EUR") => (currency === "EUR" ? Math.round(amount * EUR_RATE) : amount);

/** "/טיולים/טיול-ליוון/" → "טיול-ליוון". */
function pageKey(pathOrUrl: string): string {
  const path = pathOrUrl.startsWith("http") ? new URL(pathOrUrl).pathname : pathOrUrl;
  return decodeURI(path).split("/").filter(Boolean).pop() ?? "";
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseAllToursTable(html: string): { rows: Row[]; unreadable: string[] } {
  const $ = cheerio.load(html);
  const rows: Row[] = [];
  const unreadable: string[] = [];
  $(".mixitup .mix").each((_, el) => {
    const $r = $(el);
    const text = (sel: string) => clean($r.find(sel).first().text());
    const link = $r.find(".date_name a").first();
    const href = link.attr("href") ?? "";
    const startDate = isoFromOldDate(text(".date_start"));
    const endDate = isoFromOldDate(text(".date_end"));
    const price = parseMoney(text(".date_price:not(.longtext)"));
    if (!href || !startDate || !endDate || !price) {
      unreadable.push(clean($r.text()));
      return;
    }
    const supplement = parseMoney(text(".date_price_another:not(.longtext)"));
    const statusText = text(".date_status");
    const note = text(".date_notes").replace(/\.{2,}\s*לפרטים$/, "").trim();
    rows.push({
      oldPath: decodeURI(new URL(href).pathname),
      oldUrl: href,
      title: clean(link.text()),
      startDate,
      endDate,
      double: toUsd(price.amount, price.currency),
      single: toUsd(price.amount + (supplement?.amount ?? 0), price.currency),
      currency: price.currency,
      status: /מלא/.test(statusText) ? "soldout" : "open",
      guide: text(".date_guides") || undefined,
      note: note || undefined,
    });
  });
  return { rows, unreadable };
}

/** Old page key → its title when the tours were imported (cached pages). */
function cachedTitles(): Map<string, string> {
  const titles = new Map<string, string>();
  if (!existsSync(CACHE_DIR)) return titles;
  for (const file of readdirSync(CACHE_DIR).filter((f) => /^tour-\d+\.html$/.test(f))) {
    const url = readFileSync(`${CACHE_DIR}/${file}.url`, "utf8").trim();
    const $ = cheerio.load(readFileSync(`${CACHE_DIR}/${file}`, "utf8"));
    const title = clean($("#tour_header h1.section_title span").first().text()) || clean($("h1").first().text());
    titles.set(pageKey(url), title);
  }
  return titles;
}

function sameDays(a: ItineraryDay[], b: ItineraryDay[]): boolean {
  return a.length === b.length && a.every((day, i) => day.title === b[i].title);
}

function slugPart(country: string): string {
  return country.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Plan = {
  tour: Tour;
  action: "existing" | "refresh" | "new";
  parsed?: ParsedTour;
  version?: TourVersion;
  rows: { row: Row; versionId?: string }[];
};

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`Mode: ${COMMIT ? `COMMIT${PUBLISH ? " + publish" : ""}` : "DRY RUN (no writes)"}`);

  const listHtml = await fetchText(ALL_TOURS_URL);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(`${CACHE_DIR}/all-tours.html`, listHtml, "utf8");
  const { rows, unreadable } = parseAllToursTable(listHtml);
  const upcomingRows = rows.filter((r) => r.startDate >= today);
  console.log(`Old site table: ${rows.length} dates (${upcomingRows.length} upcoming) on ${new Set(rows.map((r) => r.oldPath)).size} pages`);
  for (const u of unreadable) console.warn(`  ! unreadable row: ${u}`);

  const { projectId, db, bucket } = firebase();
  console.log(`Project: ${projectId}`);
  const tours = (await db.collection("tours").get()).docs.map((d) => d.data() as Tour);
  const departures = (await db.collection("departures").get()).docs.map((d) => d.data() as Departure);
  const staff = (await db.collection("staff").get()).docs.map((d) => d.data() as Staff);
  // Several old pages share a title (two "טיול למרוקו"): prefer the tour
  // that isn't archived, then the one with the most dates.
  const rank = (t: Tour) =>
    (t.status === "archived" ? 0 : 1000) + departures.filter((d) => d.tourId === t.tourId).length;
  const byTitle = new Map<string, Tour>();
  for (const t of tours) {
    const current = byTitle.get(t.title);
    if (!current || rank(t) > rank(current)) byTitle.set(t.title, t);
  }
  const oldTitles = cachedTitles();
  const pageCache = new Map<string, ParsedTour>();
  const readPage = async (row: Row) => {
    if (!pageCache.has(row.oldPath)) pageCache.set(row.oldPath, parseTourPage(row.oldUrl, await fetchText(row.oldUrl), today));
    return pageCache.get(row.oldPath)!;
  };

  const plans = new Map<string, Plan>();
  const warnings: string[] = [];
  const takenSlugs = new Set(tours.map((t) => t.slug));

  for (const row of upcomingRows) {
    const key = pageKey(row.oldPath);
    const merge = MERGES[key];
    const findTour = (k: string, title?: string) =>
      (title ? byTitle.get(title) : undefined) ?? (oldTitles.has(k) ? byTitle.get(oldTitles.get(k)!) : undefined);

    if (merge) {
      const target = findTour(merge.into);
      if (!target) {
        warnings.push(`${row.title}: merge target ${merge.into} not found — skipped`);
        continue;
      }
      const plan = plans.get(target.tourId) ?? { tour: target, action: "existing" as const, rows: [] };
      if (!plan.version) {
        const parsed = await readPage(row);
        const base = plan.parsed?.tour ?? target;
        const version: TourVersion = { versionId: merge.versionId, label: merge.label };
        if (parsed.tour.durationDays !== base.durationDays) version.durationDays = parsed.tour.durationDays;
        if (!sameDays(parsed.tour.itineraryDays, base.itineraryDays)) version.itineraryDays = parsed.tour.itineraryDays;
        if (parsed.tour.inclusions.join("\n") !== base.inclusions.join("\n")) version.inclusions = parsed.tour.inclusions;
        if (parsed.tour.exclusions.join("\n") !== base.exclusions.join("\n")) version.exclusions = parsed.tour.exclusions;
        plan.version = version;
      }
      plan.rows.push({ row, versionId: merge.versionId });
      plans.set(target.tourId, plan);
      continue;
    }

    let tour = findTour(key, row.title);
    let action: Plan["action"] = "existing";
    let parsed: ParsedTour | undefined;
    if (!tour) {
      parsed = await readPage(row);
      const base = `${parsed.tour.countries.slice(0, 3).map(slugPart).join("-") || "gesher-tour"}-${parsed.tour.durationDays}-days`;
      let slug = base;
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
      takenSlugs.add(slug);
      tour = { ...parsed.tour, slug, tourId: slug, status: "draft" };
      action = "new";
    } else if (tour.status === "archived" && !plans.has(tour.tourId)) {
      parsed = await readPage(row);
      action = "refresh";
    }
    const plan = plans.get(tour.tourId) ?? { tour, action, parsed, rows: [] };
    plan.rows.push({ row });
    plans.set(tour.tourId, plan);
  }

  // Build the writes.
  const report: unknown[] = [];
  let created = 0;
  let updated = 0;
  const guideIds = new Map(staff.filter((s) => s.role === "guide").map((s) => [s.name.trim(), s.staffId]));
  const newGuides: Staff[] = [];
  const guideId = (name?: string) => {
    if (!name) return undefined;
    let id = guideIds.get(name);
    if (!id) {
      const ref = db.collection("staff").doc();
      id = ref.id;
      guideIds.set(name, id);
      newGuides.push({ staffId: id, name, role: "guide" });
    }
    return id;
  };

  const writes: { kind: string; apply: () => Promise<unknown> }[] = [];
  for (const plan of plans.values()) {
    let tour = plan.tour;
    const lines: string[] = [];

    if (plan.action === "refresh" && plan.parsed) {
      const p = plan.parsed.tour;
      tour = {
        ...tour,
        title: p.title,
        summary: p.summary,
        description: p.description,
        countries: p.countries.length ? p.countries : tour.countries,
        durationDays: p.durationDays,
        minGroupSize: p.minGroupSize,
        flightsIncluded: p.flightsIncluded,
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        infoCards: p.infoCards,
        itineraryDays: p.itineraryDays,
        pricing: p.pricing,
        kashrutDetails: p.kashrutDetails,
        cancellationPolicy: p.cancellationPolicy,
        status: "draft",
      };
      lines.push(`content re-read from the live page${p.title !== plan.tour.title ? ` (title "${plan.tour.title}" → "${p.title}")` : ""}`);
    }
    if (plan.version) {
      const others = (tour.versions ?? []).filter((v) => v.versionId !== plan.version!.versionId);
      tour = {
        ...tour,
        versions: [...others, plan.version],
        mainVersionLabel: tour.mainVersionLabel || Object.values(MERGES).find((m) => m.versionId === plan.version!.versionId)?.mainLabel,
      };
      lines.push(`version "${plan.version.label}" (${Object.keys(plan.version).filter((k) => !["versionId", "label"].includes(k)).join(", ") || "same details"})`);
    }
    if (tour.status === "archived") tour = { ...tour, status: "draft" };
    if (PUBLISH) tour = { ...tour, status: "published" };
    if (plan.action === "new") lines.push("NEW tour");
    if (plan.action === "new" || tour !== plan.tour) {
      const final = tour;
      writes.push({
        kind: "tour",
        apply: async () => {
          if (plan.action === "new" && plan.parsed) {
            const images: string[] = [];
            for (const src of plan.parsed.images) {
              try {
                images.push(await copyImage(bucket, [fullSizeImage(src), src], `tours/gesher/${final.slug}`));
              } catch (err) {
                console.warn(`  ! image ${src}: ${err}`);
              }
            }
            final.heroImage = images[0] ?? "";
            final.gallery = images;
            final.sortOrder = tours.length + 1;
          }
          await db.collection("tours").doc(final.tourId).set(final);
        },
      });
    }

    const tourDeps = departures.filter((d) => d.tourId === tour.tourId);
    for (const { row, versionId } of plan.rows) {
      const pricing = resolvePricing(tour, versionOf(tour, versionId));
      const override =
        row.double !== pricing.pricePerPersonDouble || row.single !== pricing.pricePerPersonSingle
          ? { pricePerPersonDouble: row.double, pricePerPersonSingle: row.single }
          : undefined;
      const fields = {
        endDate: row.endDate,
        versionId,
        note: row.note,
        status: row.status,
        guideId: guideId(row.guide),
        pricingOverride: override,
        bookingAssurance: row.note && /מובטח/.test(row.note) ? ("guaranteed" as const) : undefined,
        balanceDueDate: (() => {
          const d = new Date(`${row.startDate}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() - pricing.balanceDueDaysBeforeDeparture);
          return d.toISOString().slice(0, 10);
        })(),
      };
      const existing = tourDeps.find((d) => d.startDate === row.startDate && (d.versionId ?? undefined) === versionId)
        ?? tourDeps.find((d) => d.startDate === row.startDate);
      const desc = `${row.startDate}${versionId ? ` [${versionId}]` : ""} $${row.double}${override ? " (own price)" : ""}${row.currency === "EUR" ? " (from EUR)" : ""}${row.note ? ` "${row.note}"` : ""}${row.status === "soldout" ? " FULL" : ""}${row.guide ? ` guide: ${row.guide}` : ""}`;
      if (existing) {
        updated++;
        lines.push(`update ${desc}`);
        writes.push({
          kind: "departure",
          apply: () =>
            db.collection("departures").doc(existing.departureId).set(
              {
                ...existing,
                ...fields,
                // A date someone closed or cancelled in admin stays that way.
                status: existing.status === "cancelled" || existing.status === "closed" ? existing.status : fields.status,
                bookingAssurance: fields.bookingAssurance ?? existing.bookingAssurance,
              },
            ),
        });
      } else {
        created++;
        lines.push(`add ${desc}`);
        const ref = db.collection("departures").doc();
        const departure: Departure = {
          departureId: ref.id,
          tourId: tour.tourId,
          startDate: row.startDate,
          capacityTotal: CAPACITY,
          capacityBooked: 0,
          capacityHeld: 0,
          minGroupSizeMet: Boolean(fields.bookingAssurance),
          ...fields,
        };
        writes.push({ kind: "departure", apply: () => ref.set(departure) });
      }
    }

    const listed = new Set(plan.rows.map(({ row }) => row.startDate));
    for (const d of tourDeps) {
      if (d.startDate >= today && d.status !== "cancelled" && !listed.has(d.startDate)) {
        warnings.push(`${tour.title}: ${d.startDate} is in Firestore but no longer on the old site — left as is`);
      }
    }

    console.log(`\n${tour.title} (/tours/${tour.slug}, ${plan.tour.status}${tour.status !== plan.tour.status ? ` → ${tour.status}` : ""})`);
    for (const line of lines) console.log(`  - ${line}`);
    report.push({ tour: tour.title, slug: tour.slug, action: plan.action, status: tour.status, changes: lines });
  }

  // Tours with dates in Firestore that the old table doesn't mention at all.
  for (const t of tours) {
    if (plans.has(t.tourId)) continue;
    const future = departures.filter((d) => d.tourId === t.tourId && d.startDate >= today && d.status !== "cancelled");
    if (future.length) warnings.push(`${t.title}: ${future.length} upcoming date(s) in Firestore, none on the old site — left as is`);
  }

  console.log(`\nDates: ${created} to add, ${updated} to update. New guides: ${newGuides.map((g) => g.name).join(", ") || "none"}`);
  for (const w of warnings) console.warn(`! ${w}`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/gesher-dates-sync.json`, JSON.stringify({ report, warnings, newGuides }, null, 2), "utf8");

  if (!COMMIT) {
    console.log("\nDry run — nothing written. Re-run with --commit (add --publish to publish every tour with dates).");
    return;
  }
  for (const g of newGuides) await db.collection("staff").doc(g.staffId).set(g);
  for (const w of writes) await w.apply();
  console.log(`\nWritten: ${writes.length} changes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
