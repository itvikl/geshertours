import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { countryFromHebrew } from "../../lib/countryNames";
import { countriesIn, fullSizeImage } from "./gesherPlaces";
import type { Departure, ItineraryDay, Tour, TourInfoCard } from "../../lib/types";

/**
 * Imports the tours from the old Gesher WordPress site (geshertours.co.il,
 * the same "sbi" theme as old Keshertours) into Firestore.
 *
 * - Reads the tour list from /tours-sitemap.xml and every tour page. Pages
 *   are cached in scripts/migrate/output/gesher-cache/ (git-ignored), so a
 *   re-run doesn't fetch the old site again. Pass --refresh to re-fetch.
 * - A tour with future dates on the old site becomes a "draft" with its
 *   departures, for a person to check and publish. Every other tour is
 *   written "archived". Nothing is ever published by this script.
 * - Prices are per person in a double room; the single price is that plus
 *   the old site's single supplement. EUR prices are converted to USD with
 *   --eur-rate (default 1.08) and flagged in the warnings.
 * - New slugs are English (the site requires them), built from the
 *   countries and length. scripts/migrate/output/gesher-redirects.json maps
 *   each old Hebrew URL to its new /tours/<slug> path.
 * - Images (the day photos) are copied into this project's Firebase
 *   Storage on --commit; the dry run keeps the old URLs in the preview.
 *
 * Defaults to a dry run: writes scripts/migrate/output/gesher-tours-preview.json
 * and touches neither Firestore nor Storage. A dry run needs no credentials.
 * Pass --commit to write (needs the gesher-tours service-account key in
 * .env.local — run that on your own machine, never commit the key).
 *
 * Run with: npx tsx scripts/migrate/import-gesher-tours.ts [--commit] [--refresh]
 *           [--limit=N] [--eur-rate=1.08] [--capacity=30]
 *           [--keep-image-urls] [--publish-drafts]  (emulator only)
 */

const COMMIT = process.argv.includes("--commit");
const REFRESH = process.argv.includes("--refresh");
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const LIMIT = arg("limit") ? parseInt(arg("limit")!, 10) : undefined;
const EUR_RATE = arg("eur-rate") ? parseFloat(arg("eur-rate")!) : 1.08;
/**
 * Local testing against the emulators only: keep the old site's image URLs
 * instead of copying them to Storage (next.config.ts allows them in dev).
 */
const KEEP_IMAGE_URLS = process.argv.includes("--keep-image-urls");
/** Emulator only: write the tours with upcoming dates as published, so the local site shows them. */
const PUBLISH_DRAFTS = process.argv.includes("--publish-drafts");
const DEFAULT_CAPACITY = arg("capacity") ? parseInt(arg("capacity")!, 10) : 30;

const SITE = "https://geshertours.co.il";
const UA = "Mozilla/5.0 (compatible; SiteMigration/1.0)";
const OUT_DIR = "scripts/migrate/output";
const CACHE_DIR = `${OUT_DIR}/gesher-cache`;

/** Site-wide pictures (logo, banners, ads) that appear on every tour page. */
const NOT_TOUR_IMAGE = /logo|banner|באנר|social_|\/themes\//i;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

async function cachedPage(url: string, cacheName: string): Promise<string> {
  const path = `${CACHE_DIR}/${cacheName}`;
  if (!REFRESH && existsSync(path)) return readFileSync(path, "utf-8");
  const html = await fetchText(url);
  writeFileSync(path, html, "utf-8");
  return html;
}

const clean = (s: string) => s.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
const textOf = ($el: cheerio.Cheerio<AnyNode>) => clean($el.text().replace(/\s+/g, " "));

/** Lines of a block where the old site separated items with <br> or <p>, without "*" / "•" bullets. */
function linesOf(html: string): string[] {
  return html
    .split(/<br[^>]*>|<\/p>|<\/li>/i)
    .map((line) =>
      clean(
        cheerio
          .load(`<div>${line}</div>`)("div")
          .text()
          .replace(/\s+/g, " ")
      ).replace(/^[*•·\-–\s]+/, "")
    )
    .filter(Boolean);
}

/** "07.12.26" → "2026-12-07". */
function isoFromOldDate(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
  return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** "3290 $" / "€2,450" → { amount, currency }. */
function parseMoney(value: string): { amount: number; currency: "USD" | "EUR" } | null {
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const currency = /€|eur|יורו/i.test(value) ? "EUR" : "USD";
  return { amount: Math.round(parseFloat(digits)), currency };
}

function subtractDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function slugPart(country: string): string {
  return country.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface ParsedDeparture {
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  singleSupplement: number;
  currency: "USD" | "EUR";
  guide?: string;
  notes?: string;
  guaranteed: boolean;
}

interface ParsedTour {
  oldUrl: string;
  oldPath: string;
  tour: Tour;
  departures: ParsedDeparture[];
  images: string[];
  warnings: string[];
}

function parseTourPage(oldUrl: string, html: string, today: string): ParsedTour {
  const $ = cheerio.load(html);
  const warnings: string[] = [];

  const title = textOf($("#tour_header h1.section_title span").first()) || textOf($("h1").first());
  const subtitle = textOf($("#tour_header h2.single-sub-title").first());
  const durationDays = parseInt(textOf($("#tour_header .tour_days_no").first()), 10) || 1;

  const introParagraphs = $("#tour_header .content > p")
    .map((_, p) => linesOf($(p).html() ?? "").join("\n"))
    .get()
    .filter(Boolean);
  const description = introParagraphs
    .map((p) => p.split("\n").filter((line) => !/^עוד על .*>\s*$/.test(line)).join("\n"))
    .filter(Boolean)
    .join("\n\n");
  const firstSentence = description.replace(/\s+/g, " ").split(/(?<=[.!?])\s/)[0] ?? "";
  const summary = clean(subtitle ? `${subtitle} — ${firstSentence}` : firstSentence).slice(0, 300) || title;

  // Countries: the breadcrumb's tour categories ("אירופה › פורטוגל"), then
  // any Hebrew country name in the title.
  const countries = new Set<string>();
  $(".breadcrumbs .taxonomy").each((_, a) => {
    const english = countryFromHebrew(textOf($(a)));
    if (english) countries.add(english);
  });
  for (const country of countriesIn(`${title} ${subtitle}`)) countries.add(country);
  if (countries.size === 0) warnings.push("לא זוהתה מדינה — יש לבחור מדינה בעורך הטיול.");

  // Itinerary: one panel per day.
  const itineraryDays: ItineraryDay[] = [];
  const images: string[] = [];
  $("#tourroute .panel.panel-default").each((i, panel) => {
    const $panel = $(panel);
    const $title = $panel.find("h3.day_title").first().clone();
    $title.find("span").first().remove(); // "יום 1:"
    const dayTitle = textOf($title).replace(/^[:\s]+/, "");
    const paragraphs = $panel
      .find(".left_list > p, .panel-collapse p")
      .map((_, p) => linesOf($(p).html() ?? "").join("\n"))
      .get()
      .filter(Boolean);
    const dayNumber = parseInt(textOf($panel.find(".day").first()), 10) || i + 1;
    if (dayTitle || paragraphs.length) {
      itineraryDays.push({
        dayId: String(itineraryDays.length + 1),
        dayNumber,
        title: dayTitle || `יום ${dayNumber}`,
        description: paragraphs.join("\n\n"),
        meals: [],
      });
    }
    $panel.find("img").each((_, img) => {
      const src = $(img).attr("src");
      if (src && /wp-content\/uploads\//.test(src) && !NOT_TOUR_IMAGE.test(src)) images.push(fullSizeImage(src));
    });
  });
  if (itineraryDays.length === 0) warnings.push("לא נמצא מסלול יומי.");

  // Any other tour photo on the page (header image, content), after the day photos.
  $("#tour_header img, #tour_content img").each((_, img) => {
    const src = $(img).attr("src");
    if (src && /wp-content\/uploads\//.test(src) && !NOT_TOUR_IMAGE.test(src)) images.push(fullSizeImage(src));
  });
  const uniqueImages = Array.from(new Set(images));
  if (uniqueImages.length === 0) warnings.push("לא נמצאו תמונות — יש להעלות תמונה ראשית.");

  const inclusions = linesOf($("#includes .content").first().html() ?? "");
  const exclusions = linesOf($("#excludes .content").first().html() ?? "");

  // "כדאי לדעת": each <p> starts with a <strong> sub-heading (הערות, תנאי
  // תשלום, תנאי ביטול…). Cancellation terms go to the tour's cancellation
  // policy text; the rest become info cards.
  const infoCards: TourInfoCard[] = [];
  let cancellationPolicy = "";
  $('[id="gotoknow"] .content p').each((_, p) => {
    const $p = $(p);
    const heading = textOf($p.find("strong").first());
    const $body = $p.clone();
    $body.find("strong").first().remove();
    const items = linesOf($body.html() ?? "");
    if (items.length === 0) return;
    if (/ביטול/.test(heading)) {
      cancellationPolicy = items.join("\n");
    } else if (!heading && infoCards.length > 0) {
      infoCards[infoCards.length - 1].items.push(...items);
    } else {
      infoCards.push({ cardId: randomUUID(), title: heading || "כדאי לדעת", fields: [], items });
    }
  });

  const pageText = $("#tour_content").text() + " " + $('[id="gotoknow"]').text();
  const paymentLines = infoCards.find((card) => /תשלום/.test(card.title))?.items ?? [];
  const depositLine = paymentLines.find((line) => /הרשמה|מקדמה|רישום/.test(line) && /[$€]/.test(line));
  const depositMoney = depositLine?.match(/[$€]\s?\d[\d,]*|\d[\d,]*\s?[$€]/)?.[0];
  const depositParsed = depositMoney ? parseMoney(depositMoney) : null;
  const deposit = depositParsed
    ? depositParsed.currency === "EUR"
      ? Math.round(depositParsed.amount * EUR_RATE)
      : depositParsed.amount
    : 0;
  if (!deposit) warnings.push("לא נמצאו דמי רישום (מקדמה) — יש להזין מקדמה.");
  else if (depositParsed?.currency === "EUR") warnings.push(`המקדמה באתר הישן ${depositParsed.amount}€ — הומרה ל-$${deposit}.`);
  const minGroupMatch = pageText.match(/מינימום של\s*(\d+)\s*נוסעים/);
  const minGroupSize = minGroupMatch ? parseInt(minGroupMatch[1], 10) : 0;
  const balanceLine = paymentLines.find((line) => /גמר תשלום|סגירת תשלום|יתרת התשלום/.test(line) && /\d+\s*(?:יום|ימים)/.test(line));
  const balanceMatch = balanceLine?.match(/(\d+)\s*(?:יום|ימים)/);
  const balanceDueDays = balanceMatch ? parseInt(balanceMatch[1], 10) : 45;

  const flightsIncluded = inclusions.some((line) => /טיס(ה|ת|ות)/.test(line));
  const travelStyle: Tour["travelStyle"] = /שייט|הפלגה|קרוז/.test(`${title} ${subtitle}`) ? "cruise" : "land";
  const kosherLine = inclusions.find(
    (line) => /כשר|השגחה|משגיח/.test(line) && /פנסיון|ארוח|מבשל|מטבח|השגחה|משגיח/.test(line) && !/כשר ישיר/.test(line)
  );

  // Dates and prices.
  const departures: ParsedDeparture[] = [];
  $("#datesandpricing .mixitup .mix").each((_, row) => {
    const $row = $(row);
    const startDate = isoFromOldDate(textOf($row.find(".date_start span").first()));
    const endDate = isoFromOldDate(textOf($row.find(".date_end span").first()));
    const price = parseMoney(textOf($row.find(".date_price:not(.longtext) span").first()) || $row.attr("data-price") || "");
    const supplement = parseMoney(textOf($row.find(".date_price_another:not(.longtext) span").first()));
    if (!startDate || !endDate || !price) {
      warnings.push(`שורת מועד שלא הצלחנו לקרוא: ${textOf($row)}`);
      return;
    }
    if (startDate < today) return; // a past date is history, not a departure
    const notes = textOf($row.find(".date_notes").first());
    departures.push({
      startDate,
      endDate,
      pricePerPerson: price.amount,
      singleSupplement: supplement?.amount ?? 0,
      currency: price.currency,
      guide: textOf($row.find(".date_guides").first()) || undefined,
      notes: notes || undefined,
      guaranteed: /מובטח/.test(notes),
    });
  });
  departures.sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Pricing on the tour = its first upcoming date; other dates that differ
  // get a pricing override when written.
  const base = departures[0];
  const toUsd = (amount: number, currency: "USD" | "EUR") =>
    currency === "EUR" ? Math.round(amount * EUR_RATE) : amount;
  if (departures.some((d) => d.currency === "EUR")) {
    warnings.push(`המחירים באתר הישן ביורו — הומרו לדולר בשער ${EUR_RATE}. יש לאשר את המחיר.`);
  }
  for (const d of departures) {
    if (d.guide) warnings.push(`מדריך/ה במועד ${d.startDate}: ${d.guide} — יש לשבץ בעורך המועד.`);
  }

  const oldPath = decodeURI(new URL(oldUrl).pathname);
  const status: Tour["status"] = departures.length > 0 ? "draft" : "archived";

  const tour: Tour = {
    tourId: "", // set when the slug is assigned
    slug: "",
    title,
    summary,
    description,
    heroImage: uniqueImages[0] ?? "",
    gallery: uniqueImages,
    countries: Array.from(countries),
    travelStyle,
    themeTags: [],
    durationDays,
    minGroupSize,
    flightsIncluded,
    inclusions,
    exclusions,
    infoCards,
    pricing: {
      pricePerPersonDouble: base ? toUsd(base.pricePerPerson, base.currency) : 0,
      pricePerPersonSingle: base ? toUsd(base.pricePerPerson + base.singleSupplement, base.currency) : 0,
      depositAmountPerPerson: deposit,
      balanceDueDaysBeforeDeparture: balanceDueDays,
    },
    kashrutDetails: {
      supervisionLevel: kosherLine ?? "כשרות למהדרין — יש לאמת לפני פרסום",
      patYisrael: "not_guaranteed",
      chalavYisrael: "not_guaranteed",
    },
    itineraryDays,
    cancellationPolicy: cancellationPolicy || undefined,
    status,
    isLegacyMigrated: true,
  };
  if (!kosherLine) warnings.push("לא נמצא פירוט כשרות — יש למלא את רמת הכשרות.");

  return { oldUrl, oldPath, tour, departures, images: uniqueImages, warnings };
}

function assignSlugs(results: ParsedTour[], taken: Set<string>) {
  for (const r of results) {
    const base =
      r.tour.countries.length > 0
        ? `${r.tour.countries.slice(0, 3).map(slugPart).join("-")}-${r.tour.durationDays}-days`
        : `gesher-tour-${r.tour.durationDays}-days`;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    r.tour.slug = slug;
    r.tour.tourId = slug;
  }
}

async function uploadImage(storage: ReturnType<typeof getStorage>, sourceUrl: string, slug: string, index: number) {
  const res = await fetch(encodeURI(decodeURI(sourceUrl)), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${sourceUrl}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = sourceUrl.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i)?.[1].toLowerCase() ?? "jpg";
  const path = `tours/gesher/${slug}/${index}-${randomUUID()}.${ext}`;
  const token = randomUUID();
  const bucket = storage.bucket();
  await bucket.file(path).save(buffer, {
    contentType: res.headers.get("content-type") || "image/jpeg",
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function firebase() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("--commit needs the gesher-tours Firebase Admin key in .env.local.");
  }
  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  });
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return { projectId, db, storage: getStorage(app) };
}

async function main() {
  if ((KEEP_IMAGE_URLS || PUBLISH_DRAFTS) && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("--keep-image-urls / --publish-drafts are for the local emulator only (FIRESTORE_EMULATOR_HOST).");
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  console.log(`Mode: ${COMMIT ? "COMMIT (writing to Firestore + Storage)" : "DRY RUN (no writes)"}`);

  const sitemap = await cachedPage(`${SITE}/tours-sitemap.xml`, "tours-sitemap.xml");
  const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].trim())
    // The first entry is the tours index page itself.
    .filter((u) => decodeURI(new URL(u).pathname).split("/").filter(Boolean).length > 1)
    .slice(0, LIMIT);

  const results: ParsedTour[] = [];
  const failed: { url: string; error: string }[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const html = await cachedPage(url, `tour-${String(i + 1).padStart(2, "0")}.html`);
      results.push(parseTourPage(url, html, today));
    } catch (err) {
      failed.push({ url, error: String(err) });
      console.error(`FAILED ${decodeURI(url)}: ${err}`);
    }
  }

  const fb = COMMIT ? firebase() : null;
  const existing = fb ? await fb.db.collection("tours").get() : null;
  const taken = new Set((existing?.docs ?? []).map((d) => (d.data() as Tour).slug));
  const existingTitles = new Set((existing?.docs ?? []).map((d) => (d.data() as Tour).title));
  const fresh = results.filter((r) => !existingTitles.has(r.tour.title));
  assignSlugs(fresh, taken);

  if (fb) {
    console.log(`Project: ${fb.projectId}`);
    let sortOrder = (existing?.size ?? 0) + 1;
    for (const r of fresh) {
      const uploaded: string[] = KEEP_IMAGE_URLS ? [...r.images] : [];
      for (const [index, src] of (KEEP_IMAGE_URLS ? [] : r.images).entries()) {
        try {
          uploaded.push(await uploadImage(fb.storage, src, r.tour.slug, index));
        } catch (err) {
          r.warnings.push(`העלאת תמונה נכשלה: ${src} (${err})`);
        }
      }
      r.tour.heroImage = uploaded[0] ?? "";
      r.tour.gallery = uploaded;
      r.tour.sortOrder = sortOrder++;
      if (PUBLISH_DRAFTS && r.tour.status === "draft") r.tour.status = "published";
      await fb.db.collection("tours").doc(r.tour.tourId).set(r.tour);

      for (const d of r.departures) {
        const ref = fb.db.collection("departures").doc();
        const toUsd = (n: number) => (d.currency === "EUR" ? Math.round(n * EUR_RATE) : n);
        const double = toUsd(d.pricePerPerson);
        const single = toUsd(d.pricePerPerson + d.singleSupplement);
        const differs =
          double !== r.tour.pricing.pricePerPersonDouble || single !== r.tour.pricing.pricePerPersonSingle;
        const departure: Departure = {
          departureId: ref.id,
          tourId: r.tour.tourId,
          startDate: d.startDate,
          endDate: d.endDate,
          pricingOverride: differs ? { pricePerPersonDouble: double, pricePerPersonSingle: single } : undefined,
          capacityTotal: DEFAULT_CAPACITY,
          capacityBooked: 0,
          capacityHeld: 0,
          minGroupSizeMet: d.guaranteed,
          balanceDueDate: subtractDays(d.startDate, r.tour.pricing.balanceDueDaysBeforeDeparture),
          status: "open",
          bookingAssurance: d.guaranteed ? "guaranteed" : "conditional",
        };
        await ref.set(departure);
      }
      console.log(`Committed ${r.tour.slug} (${uploaded.length} images, ${r.departures.length} dates).`);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    `${OUT_DIR}/gesher-tours-preview.json`,
    JSON.stringify(
      fresh.map((r) => ({
        oldUrl: decodeURI(r.oldUrl),
        newPath: `/tours/${r.tour.slug}`,
        status: r.tour.status,
        warnings: r.warnings,
        departures: r.departures,
        tour: r.tour,
      })),
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    `${OUT_DIR}/gesher-redirects.json`,
    JSON.stringify(
      fresh.map((r) => ({ source: r.oldPath, destination: `/tours/${r.tour.slug}`, permanent: true })),
      null,
      2
    ),
    "utf-8"
  );

  // Tours with upcoming dates (drafts, or published locally with --publish-drafts).
  const drafts = fresh.filter((r) => r.departures.length > 0);
  console.log("\n=== SUMMARY ===");
  console.log(`Tour pages read: ${results.length}${failed.length ? `, failed: ${failed.length}` : ""}`);
  console.log(`Already in Firestore (same title, skipped): ${results.length - fresh.length}`);
  console.log(`${COMMIT ? "Written" : "Would write"}: ${fresh.length} — ${drafts.length} draft(s) with upcoming dates, ${fresh.length - drafts.length} archived`);
  console.log(`Upcoming departures: ${drafts.reduce((n, r) => n + r.departures.length, 0)}`);
  for (const r of drafts) {
    console.log(`  - ${r.tour.slug}: ${r.departures.length} date(s), from $${r.tour.pricing.pricePerPersonDouble}`);
  }
  console.log(`Tours with warnings: ${fresh.filter((r) => r.warnings.length).length}`);
  console.log(`\nPreview: ${OUT_DIR}/gesher-tours-preview.json`);
  console.log(`Redirects: ${OUT_DIR}/gesher-redirects.json`);
  if (!COMMIT) console.log("Dry run only — re-run with --commit to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
