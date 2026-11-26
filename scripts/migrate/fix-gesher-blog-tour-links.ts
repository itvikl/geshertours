import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import type { BlogPost, Departure, Tour } from "../../lib/types";
import { firebase } from "./gesherFirebase";

/**
 * Points the imported blog posts' tour links at the tour pages again.
 *
 * The blog import maps old tour links through gesher-redirects.json; a
 * re-run of the tours import that skipped every tour had emptied that file,
 * so those links fell back to the home page's tour list (/#featured-tours).
 * This rebuilds the old-tour-page → new-page map from the cached tour pages
 * and Firestore (matched by title, preferring the tour with dates), rewrites
 * gesher-redirects.json from it, and fixes each post's links: a link the
 * original post pointed at a tour page, now going to /#featured-tours, gets
 * the tour page instead. Links are matched by their text, so nothing else in
 * the post (pictures, other links) changes.
 *
 * Dry run by default. Run with:
 *   npx tsx scripts/migrate/fix-gesher-blog-tour-links.ts [--commit]
 */

const COMMIT = process.argv.includes("--commit");
const OUT_DIR = "scripts/migrate/output";
const CACHE_DIR = `${OUT_DIR}/gesher-cache`;
const TOUR_LIST = "/#featured-tours";
const OLD_HOSTS = new Set(["geshertours.co.il", "www.geshertours.co.il"]);

/** Old pages that became a version of another tour (see sync-gesher-dates.ts MERGES). */
const MERGED: Record<string, { into: string; versionId: string }> = {
  "/טיולים/ארצות-הברית-מחוף-לחוף-2": { into: "/טיולים/ארצות-הברית-מחוף-לחוף", versionId: "washington" },
};

const decodedPath = (pathname: string) => {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, "");
  } catch {
    return pathname.replace(/\/+$/, "");
  }
};
const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

interface WpPost {
  id: number;
  content: { rendered: string };
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN (no writes)"}`);
  const { projectId, db } = firebase();
  console.log(`Project: ${projectId}`);

  const tours = (await db.collection("tours").get()).docs.map((d) => d.data() as Tour);
  const departures = (await db.collection("departures").get()).docs.map((d) => d.data() as Departure);
  const today = new Date().toISOString().slice(0, 10);
  const rank = (t: Tour) =>
    (t.status === "published" ? 2000 : t.status === "draft" ? 1000 : 0) +
    departures.filter((d) => d.tourId === t.tourId && d.startDate >= today).length;
  const byTitle = new Map<string, Tour>();
  for (const t of tours) {
    const current = byTitle.get(t.title);
    if (!current || rank(t) > rank(current)) byTitle.set(t.title, t);
  }

  // Old tour page path → new path, from the cached tour pages (url + title).
  const tourPaths = new Map<string, string>();
  for (const file of readdirSync(CACHE_DIR).filter((f) => /^tour-\d+\.html$/.test(f))) {
    const path = decodedPath(new URL(readFileSync(`${CACHE_DIR}/${file}.url`, "utf8").trim()).pathname);
    const $ = cheerio.load(readFileSync(`${CACHE_DIR}/${file}`, "utf8"));
    const title = clean($("#tour_header h1.section_title span").first().text()) || clean($("h1").first().text());
    const tour = byTitle.get(title);
    if (tour) tourPaths.set(path, `/tours/${tour.slug}`);
    else console.warn(`! no tour for ${path} ("${title}")`);
  }
  for (const [path, merge] of Object.entries(MERGED)) {
    const target = tourPaths.get(merge.into);
    if (target) tourPaths.set(path, `${target}?v=${merge.versionId}`);
  }
  // Pages the cache doesn't have (new on the old site), from the all-tours table.
  if (existsSync(`${CACHE_DIR}/all-tours.html`)) {
    const $ = cheerio.load(readFileSync(`${CACHE_DIR}/all-tours.html`, "utf8"));
    $(".mixitup .mix .date_name a").each((_, a) => {
      const href = $(a).attr("href");
      if (!href) return;
      const path = decodedPath(new URL(href).pathname);
      if (tourPaths.has(path)) return;
      const tour = byTitle.get(clean($(a).text()));
      if (tour) tourPaths.set(path, `/tours/${tour.slug}`);
    });
  }

  writeFileSync(
    `${OUT_DIR}/gesher-redirects.json`,
    JSON.stringify(
      [...tourPaths].map(([source, destination]) => ({ source: `${source}/`, destination, permanent: true })),
      null,
      2
    ),
    "utf8"
  );
  console.log(`Tour map: ${tourPaths.size} old pages → gesher-redirects.json`);

  const slugs = JSON.parse(readFileSync("scripts/migrate/gesher-blog-slugs.json", "utf8")) as Record<string, string>;
  const wpPosts: WpPost[] = readdirSync(CACHE_DIR)
    .filter((f) => /^posts-\d+\.json$/.test(f))
    .flatMap((f) => JSON.parse(readFileSync(`${CACHE_DIR}/${f}`, "utf8")) as WpPost[]);

  const postDocs = new Map(
    (await db.collection("blogPosts").get()).docs.map((d) => [(d.data() as BlogPost).slug, d])
  );

  let fixedLinks = 0;
  let fixedPosts = 0;
  const unmatched: string[] = [];
  for (const wp of wpPosts) {
    const slug = slugs[String(wp.id)];
    const doc = postDocs.get(slug);
    if (!doc) continue;

    // Text → tour paths, in the order the original post had them.
    const wanted = new Map<string, string[]>();
    const $orig = cheerio.load(wp.content.rendered);
    $orig("a[href]").each((_, el) => {
      let url: URL;
      try {
        url = new URL($orig(el).attr("href")!.trim(), "https://geshertours.co.il");
      } catch {
        return;
      }
      if (!OLD_HOSTS.has(url.hostname)) return;
      const target = tourPaths.get(decodedPath(url.pathname));
      if (!target) return;
      const text = clean($orig(el).text());
      wanted.set(text, [...(wanted.get(text) ?? []), target]);
    });
    if (wanted.size === 0) continue;

    const post = doc.data() as BlogPost;
    const $ = cheerio.load(post.body, null, false);
    let changed = 0;
    $(`a[href="${TOUR_LIST}"]`).each((_, el) => {
      const text = clean($(el).text());
      const queue = wanted.get(text);
      const target = queue?.shift();
      if (!target) return;
      $(el).attr("href", target);
      changed++;
    });
    for (const [text, left] of wanted) {
      for (const target of left) unmatched.push(`${slug}: "${text}" → ${target} (link not found as ${TOUR_LIST})`);
    }
    if (changed === 0) continue;
    fixedPosts++;
    fixedLinks += changed;
    console.log(`  ${slug}: ${changed} link(s)`);
    if (COMMIT) await doc.ref.update({ body: $.html() });
  }

  console.log(`\n${COMMIT ? "Fixed" : "Would fix"} ${fixedLinks} link(s) in ${fixedPosts} post(s).`);
  if (unmatched.length) {
    console.log(`Not changed (already right, or no longer in the post): ${unmatched.length}`);
    for (const u of unmatched.slice(0, 20)) console.log(`  - ${u}`);
  }
  if (!COMMIT) console.log("Dry run — nothing written. Re-run with --commit.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
