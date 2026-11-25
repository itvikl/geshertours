import { config } from "dotenv";
config({ path: ".env.local" });

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import { destinationSlug } from "../../lib/testimonials";
import type { Review, Tour } from "../../lib/types";
import { copyImage, firebase, UA } from "./gesherFirebase";
import { countriesIn, fullSizeImage } from "./gesherPlaces";

/**
 * Imports the traveler letters ("המלצות") from the old Gesher WordPress site
 * into the reviews collection.
 *
 * - Reads the list from /recommendations-sitemap.xml and one page per
 *   letter. Pages are cached in scripts/migrate/output/gesher-cache/rec/
 *   (git-ignored); pass --refresh to re-fetch.
 * - The body is the letter's paragraphs, without the old site's "טיולים
 *   מאורגנים ל… >" link lines. The last short line is taken as the
 *   signature and becomes customerName. That is a guess: every name is in
 *   the preview, and staff can fix any of them in Admin → Reviews.
 * - Countries come from the letter's title ("המלצה על טיול לצפון איטליה" →
 *   Italy). The review is attached to the imported tour that best matches
 *   them, and `destination` holds the English countries ("Spain & Portugal"),
 *   which /testimonials and the tour pages group and match by.
 * - The first photo on the page is copied into Storage on --commit.
 *   Afterwards run scripts/migrate/index-media-library.ts so the image
 *   library lists the photos.
 * - Letters are written "approved" (they were public on the old site),
 *   without a rating (the old site had none). A review id already in
 *   Firestore is skipped, so a re-run doesn't duplicate anything.
 *
 * Needs the tours imported first (import-gesher-tours.ts). A dry run reads
 * them from scripts/migrate/output/gesher-tours-preview.json and needs no
 * credentials; --commit reads them from Firestore.
 *
 * Also writes scripts/migrate/output/gesher-testimonials-redirects.json:
 * each old letter URL → /testimonials#<destination>.
 *
 * Dry run by default: writes scripts/migrate/output/gesher-testimonials-preview.json.
 * Run with: npx tsx scripts/migrate/import-gesher-testimonials.ts [--commit] [--refresh]
 */

const COMMIT = process.argv.includes("--commit");
const REFRESH = process.argv.includes("--refresh");
const SITE = "https://geshertours.co.il";
const OUT_DIR = "scripts/migrate/output";
const CACHE_DIR = `${OUT_DIR}/gesher-cache/rec`;
const SITEMAP_CACHE = `${OUT_DIR}/gesher-cache/rec-sitemap.xml`;
/** customerName when no signature line can be found. */
const FALLBACK_NAME = "מטיילי גשר";

interface TourRef {
  tourId: string;
  title: string;
  countries: string[];
  status: Tour["status"];
}

interface Letter {
  oldUrl: string;
  title: string;
  countries: string[];
  customerName: string;
  /** False when no signature line was found and FALLBACK_NAME was used. */
  signatureFound: boolean;
  body: string;
  photoCandidates: string[];
  /** Other photos on the page that a review has no room for. */
  extraPhotos: number;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

/** Cached page per URL. The cache keeps rec-NN.html with the URL in rec-NN.html.url. */
async function cachedPages(urls: string[]): Promise<Map<string, string>> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const byUrl = new Map<string, string>();
  for (const f of readdirSync(CACHE_DIR).filter((f) => f.endsWith(".html.url"))) {
    byUrl.set(readFileSync(`${CACHE_DIR}/${f}`, "utf-8").trim(), `${CACHE_DIR}/${f.replace(/\.url$/, "")}`);
  }
  const pages = new Map<string, string>();
  let next = byUrl.size + 1;
  for (const url of urls) {
    let file = byUrl.get(url);
    if (!file || REFRESH) {
      file ??= `${CACHE_DIR}/rec-${String(next++).padStart(2, "0")}.html`;
      writeFileSync(file, await fetchText(url), "utf-8");
      writeFileSync(`${file}.url`, url, "utf-8");
    }
    pages.set(url, readFileSync(file, "utf-8"));
  }
  return pages;
}

const clean = (s: string) =>
  s
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

/** The old site's own navigation lines under each letter, not part of it. */
function isNavLine(text: string): boolean {
  return (
    /[>›»]\s*$/.test(text) ||
    /^(?:סוגי )?טיולי משפחות לשומרי מסורת עם גשר$/.test(text) ||
    /^לעוד טיולים/.test(text) ||
    /^תמונות (?:ה|מה)טיול/.test(text) ||
    /^העתק:/.test(text)
  );
}

/** "יעד: תאילנד" / "יציאה: 1-15/12/2025" — trip details some letters were filed with. */
const isTripDetail = (text: string) => /^(?:יעד|יציאה|תאריך|מדריך|מדריכה)\s*:/.test(text);

const MONTHS = "ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר";
const isDateLine = (text: string) =>
  new RegExp(`^(?:(?:${MONTHS})\\s*)?(?:19|20)\\d{2}\\.?$|^[\\d./\\-\\s]+$`).test(text);

/**
 * Sign-off phrases around a signature ("בברכה,", "בהערכה רבה", "יישר כוח
 * ענק", "חודש טוב ושנה טובה", …). Matched at the start of each
 * comma-separated piece of the signature line; the phrase is dropped.
 */
const CLOSING =
  /^ו?(?:בברכ[הת]|בהערכה|בהוקרה|ברגשי|בתודה|תודה|בכבוד|בידידות|בכנות|באהבה|מכל הלב|מקרב לב|יישר כו?ח|שנה טובה|חודש טוב|חג שמח|כל טוב|נהיה בקשר|שלום רב|ושמירת קשר|בשמחה|להתראות|כתיבה וחתימה טובה|גמר חתימה טובה|נשיקות וחיבוקים)(?![א-ת])[^,]*?(?=[,]|$)|^ו?(?:רבה|ענק|מכולנו|והוקרה|והערכה)[.!]*$/;

/**
 * Words that mark a line as a sentence of the letter, not a name ("כי מטיול
 * לטיול כוחנו עולה", "של טיולים והרבה מסעות").
 */
const SENTENCE_WORD = /(?:^|\s)(?:של|את|כי|אני|אנו|אנחנו|עם|לכל|עוד|מבלי|שלא|היה|היית|הייתה|זה|לנו|לבנו|ממליץ|נחזור|ניפגש|נפגש|לכולם)(?=\s|$|[.,!])/;

/** Signature line → name, or undefined when the line reads as part of the letter. */
function nameFromSignature(line: string): string | undefined {
  if (line.length > 90 || line.split(/\s+/).length > 14) return undefined;
  const pieces = line
    .split(/\n|,/)
    .map((piece) => piece.replace(/^[\s.:!\-–]+|[\s.:!\-–]+$/g, ""))
    .map((piece) => piece.replace(CLOSING, "").replace(/^[\s.:!\-–]+|[\s.:!\-–]+$/g, ""))
    .filter((piece) => /[א-ת]{2}/.test(piece));
  const name = pieces.join(", ");
  if (name.length < 2 || name.length > 70) return undefined;
  if (SENTENCE_WORD.test(` ${name} `)) return undefined;
  return name;
}

/** A final paragraph that is only a sign-off and a name ("בברכה, רחלי יוסף"), safe to cut from the body. */
const isShortSignOff = (paragraph: string) => paragraph.length <= 70 && paragraph.split(/\s+/).length <= 10;

function parseLetter(oldUrl: string, html: string): Letter {
  const $ = cheerio.load(html);
  const $content = $(".content").first();
  const title = clean($content.find("h3.recom_title").first().text());

  const photos: string[] = [];
  const paragraphs: string[] = [];
  const navText: string[] = [];
  for (const el of $content.children("p, blockquote, ul, ol, h2, h3, h4").toArray()) {
    const $el = $(el);
    if ($el.hasClass("recom_title")) continue;
    $el.find("img").each((_, img) => {
      const src = $(img).attr("src") ?? "";
      if (/^https?:\/\//.test(src) && !/\/themes\/|logo|social_/i.test(src)) photos.push(src);
    });
    $el.find("br").replaceWith("\n");
    const text = clean($el.text());
    if (!text) continue;
    if (isNavLine(text) || isTripDetail(text)) {
      navText.push(text);
      continue;
    }
    paragraphs.push(text);
  }

  // Signature: the last short paragraph, or else the last line of the last
  // paragraph (letters often sign off after a line break), skipping a
  // trailing date line ("3/3 אוגוסט 2015") or separator ("***"). Only a
  // short sign-off paragraph is cut from the body; a name found inside a
  // longer paragraph leaves the letter whole, so no text is ever lost to a
  // wrong guess.
  let customerName = FALLBACK_NAME;
  let signatureFound = false;
  const body = [...paragraphs];
  const isNoise = (line: string) => isDateLine(line) || !/[א-ת]{2}/.test(line);
  while (body.length > 1 && isNoise(body[body.length - 1])) body.pop();
  const last = body[body.length - 1] ?? "";
  const name = body.length > 1 && isShortSignOff(last) ? nameFromSignature(last) : undefined;
  if (name) {
    customerName = name;
    signatureFound = true;
    body.pop();
  } else {
    const lines = last.split("\n");
    while (lines.length > 1 && isNoise(lines[lines.length - 1])) lines.pop();
    // Stricter for single lines: short, not the end of a sentence. Up to
    // three such lines from the end make the signature (name, title, town).
    const signatureLine = (line: string) =>
      line.length <= 60 && line.split(/\s+/).length <= 9 && !/[!?…]$/.test(line) ? nameFromSignature(line) : undefined;
    const parts: string[] = [];
    for (let i = lines.length - 1; i >= 1 && parts.length < 3; i--) {
      // Lines above the name (title, town) are kept only when short.
      if (parts.length > 0 && (lines[i].length > 35 || lines[i].split(/\s+/).length > 5)) break;
      const part = signatureLine(lines[i]);
      if (!part) break;
      parts.unshift(part);
    }
    if (parts.length) {
      customerName = parts.join(", ");
      signatureFound = true;
    }
  }

  const countries =
    [title, navText.join(" "), body.join(" ").slice(0, 600)].map(countriesIn).find((c) => c.length > 0) ?? [];

  return {
    oldUrl,
    title,
    countries,
    customerName,
    signatureFound,
    body: body.join("\n\n"),
    photoCandidates: photos.length ? [fullSizeImage(photos[0]), photos[0]] : [],
    extraPhotos: Math.max(0, photos.length - 1),
  };
}

const STOP_WORDS = new Set(["המלצה", "המלצות", "טיול", "טיולים", "כשר", "מאורגן", "לשומרי", "מסורת"]);
const words = (s: string) =>
  new Set(
    s
      .replace(/[^א-ת\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/^[ולבמהש](?=[א-ת]{3})/, ""))
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
  );

/** The imported tour that fits the letter best, or undefined when none visits its countries. */
function pickTour(letter: Letter, tours: TourRef[]): TourRef | undefined {
  if (!letter.countries.length) return undefined;
  const letterWords = words(letter.title);
  let best: { tour: TourRef; score: number } | undefined;
  for (const tour of tours) {
    const shared = letter.countries.filter((c) => tour.countries.includes(c)).length;
    if (!shared) continue;
    let score = shared * 10;
    // Fewer extra countries = closer match ("Italy" letter → an Italy tour, not a Europe tour).
    score -= tour.countries.length - letter.countries.length;
    for (const w of words(tour.title)) if (letterWords.has(w)) score += 3;
    if (tour.status !== "archived") score += 1;
    if (!best || score > best.score) best = { tour, score };
  }
  return best?.tour;
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT (writing to Firestore + Storage)" : "DRY RUN (no writes)"}`);

  const sitemap =
    !REFRESH && existsSync(SITEMAP_CACHE)
      ? readFileSync(SITEMAP_CACHE, "utf-8")
      : await fetchText(`${SITE}/recommendations-sitemap.xml`);
  writeFileSync(SITEMAP_CACHE, sitemap, "utf-8");
  const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].trim())
    // The first entry is the testimonials index page itself.
    .filter((u) => decodeURI(new URL(u).pathname).split("/").filter(Boolean).length > 1);
  const pages = await cachedPages(urls);

  const fb = COMMIT ? firebase() : null;
  const tours: TourRef[] = fb
    ? (await fb.db.collection("tours").get()).docs.map((d) => d.data() as Tour)
    : (JSON.parse(readFileSync(`${OUT_DIR}/gesher-tours-preview.json`, "utf-8")) as { tour: Tour }[]).map(
        (r) => r.tour
      );
  if (!tours.length) throw new Error("No tours found — run import-gesher-tours.ts first.");

  const existingIds = fb ? new Set((await fb.db.collection("reviews").get()).docs.map((d) => d.id)) : new Set<string>();

  const plans: { review: Review; letter: Letter; tourTitle: string }[] = [];
  /** Letters that are only a photo (a scanned page) — no text to import. */
  const photoOnly: { oldUrl: string; title: string; photos: number }[] = [];
  /** No country found in the letter at all. */
  const noCountry: { oldUrl: string; title: string }[] = [];
  let skippedExisting = 0;
  // Old letter URL → its destination's first letter on /testimonials.
  const redirects = [
    { source: "/המלצות/", destination: "/testimonials", permanent: true },
    { source: "/מטיילים-כותבים/", destination: "/testimonials", permanent: true },
  ];
  for (const url of urls) {
    const letter = parseLetter(decodeURI(url), pages.get(url)!);
    const anchor = destinationSlug(letter.countries.join(" & "));
    redirects.push({
      source: decodeURIComponent(new URL(letter.oldUrl).pathname).replace(/\/?$/, "/"),
      destination: anchor ? `/testimonials#${anchor}` : "/testimonials",
      permanent: true,
    });
    if (!letter.body) {
      photoOnly.push({
        oldUrl: letter.oldUrl,
        title: letter.title,
        photos: letter.photoCandidates.length ? letter.extraPhotos + 1 : 0,
      });
      continue;
    }
    if (!letter.countries.length) {
      noCountry.push({ oldUrl: letter.oldUrl, title: letter.title });
      continue;
    }
    // No Gesher tour visits some old destinations (Russia, Malta, …): the
    // letter is still imported, shown under its destination with no tour link.
    const tour = pickTour(letter, tours);
    const reviewId = `gesher-${createHash("sha1").update(letter.oldUrl).digest("hex").slice(0, 10)}`;
    if (existingIds.has(reviewId)) {
      skippedExisting++;
      continue;
    }
    plans.push({
      letter,
      tourTitle: tour?.title ?? "(אין טיול מתאים)",
      review: {
        reviewId,
        tourId: tour?.tourId ?? "",
        customerName: letter.customerName,
        body: letter.body,
        status: "approved",
        destination: letter.countries.join(" & "),
      },
    });
  }

  const photoFailures: string[] = [];
  if (fb) {
    console.log(`Project: ${fb.projectId}`);
    for (const { review, letter } of plans) {
      if (letter.photoCandidates.length) {
        try {
          review.photo = await copyImage(fb.bucket, letter.photoCandidates, `reviews/gesher/${review.reviewId}`);
        } catch (err) {
          photoFailures.push(`${review.reviewId}: ${err}`);
        }
      }
      await fb.db.collection("reviews").doc(review.reviewId).set(review);
      console.log(`  created ${review.reviewId} — ${review.customerName} (${review.destination})`);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    `${OUT_DIR}/gesher-testimonials-preview.json`,
    JSON.stringify(
      {
        photoOnly,
        noCountry,
        reviews: plans.map(({ review, letter, tourTitle }) => ({
          oldUrl: letter.oldUrl,
          oldTitle: letter.title,
          tour: `${review.tourId} — ${tourTitle}`,
          destination: review.destination,
          customerName: review.customerName,
          signatureFound: letter.signatureFound,
          photo: review.photo ?? letter.photoCandidates[0] ?? null,
          extraPhotosNotImported: letter.extraPhotos,
          body: review.body,
        })),
      },
      null,
      2
    ),
    "utf-8"
  );

  writeFileSync(`${OUT_DIR}/gesher-testimonials-redirects.json`, JSON.stringify(redirects, null, 2), "utf-8");

  const byDestination = new Map<string, number>();
  for (const { review } of plans) byDestination.set(review.destination!, (byDestination.get(review.destination!) ?? 0) + 1);
  console.log("\n=== SUMMARY ===");
  console.log(`Letters on the old site: ${urls.length}`);
  console.log(`${COMMIT ? "Written" : "Would write"}: ${plans.length} (${plans.filter((p) => p.letter.photoCandidates.length).length} with a photo)`);
  if (skippedExisting) console.log(`Already in Firestore (skipped): ${skippedExisting}`);
  console.log(`By destination: ${[...byDestination].sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`).join(", ")}`);
  const noSignature = plans.filter((p) => !p.letter.signatureFound);
  console.log(`No signature line found (name set to "${FALLBACK_NAME}"): ${noSignature.length}`);
  for (const p of noSignature) console.log(`  - ${p.letter.title} — ${p.letter.oldUrl}`);
  const noTour = plans.filter((p) => !p.review.tourId);
  console.log(`Imported with no tour (no Gesher tour visits the destination): ${noTour.length}`);
  for (const p of noTour) console.log(`  - ${p.letter.title} [${p.review.destination}]`);
  console.log(`Skipped — only a photo of the letter, no text: ${photoOnly.length}`);
  for (const u of photoOnly) console.log(`  - ${u.title} (${u.photos} photo(s)) — ${u.oldUrl}`);
  console.log(`Skipped — no country found: ${noCountry.length}`);
  for (const u of noCountry) console.log(`  - ${u.title} — ${u.oldUrl}`);
  if (photoFailures.length) {
    console.log(`Photos that failed to copy (review written without one): ${photoFailures.length}`);
    for (const f of photoFailures) console.log(`  - ${f}`);
  }
  console.log(`\nPreview: ${OUT_DIR}/gesher-testimonials-preview.json`);
  console.log(`Redirects: ${OUT_DIR}/gesher-testimonials-redirects.json`);
  if (COMMIT) console.log("Next: npx tsx scripts/migrate/index-media-library.ts (adds the photos to the image library).");
  else console.log("Dry run only — re-run with --commit to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
