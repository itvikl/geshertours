import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import { sanitizeBlogHtml } from "../../lib/blogBodySanitize";
import type { BlogPost } from "../../lib/types";
import { copyImage, encodedUrl, firebase, UA } from "./gesherFirebase";
import { fullSizeImage } from "./gesherPlaces";
import slugsByWpId from "./gesher-blog-slugs.json";

/**
 * Imports the blog posts from the old Gesher WordPress site into blogPosts.
 *
 * - Reads every post from the WordPress REST API (/wp-json/wp/v2/posts,
 *   with _embed for the featured image and categories). The responses are
 *   cached in scripts/migrate/output/gesher-cache/posts-N.json (git-ignored);
 *   pass --refresh to re-fetch.
 * - The site needs English slugs, and the old ones are Hebrew, so each
 *   post's slug comes from scripts/migrate/gesher-blog-slugs.json (keyed by
 *   WordPress post id). A post missing from that file stops the run.
 * - The body keeps its headings, bold, lists, links and pictures, and goes
 *   through the same sanitizer as admin saves. Links to the old site are
 *   rewritten to new-site paths: tours via gesher-redirects.json, other
 *   posts to /blog/<slug>, the old fixed pages (about, contact, …) to their
 *   new ones, destination and tour-list pages to the home page's tour list.
 *   Any other old-site link loses its href and keeps its text; each is listed.
 * - Pictures (in the text and the featured image, which becomes heroImage)
 *   are copied into Storage under blog/gesher/<slug>/ on --commit, the
 *   original upload rather than the WordPress thumbnail where it exists.
 *   Afterwards run scripts/migrate/index-media-library.ts so the image
 *   library lists them.
 * - Posts keep their original date and are written "published", as they
 *   were on the old site. A slug already in Firestore is skipped, so a
 *   re-run never overwrites a post edited since.
 * - Writes scripts/migrate/output/gesher-blog-redirects.json: old post URL
 *   → /blog/<slug>.
 *
 * Dry run by default: writes scripts/migrate/output/gesher-blog-preview.json
 * and one HTML file per post under scripts/migrate/output/gesher-blog-preview/
 * to open in a browser (pictures still load from the old site there).
 *
 * Run with (the react-server condition lets the server-only sanitizer load):
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/migrate/import-gesher-blog.ts [--commit] [--refresh]
 */

const COMMIT = process.argv.includes("--commit");
const REFRESH = process.argv.includes("--refresh");
const SITE = "https://geshertours.co.il";
const OUT_DIR = "scripts/migrate/output";
const CACHE_DIR = `${OUT_DIR}/gesher-cache`;
const PREVIEW_DIR = `${OUT_DIR}/gesher-blog-preview`;
const OLD_HOSTS = new Set(["geshertours.co.il", "www.geshertours.co.il"]);
/** The category every post is in — not worth a tag. */
const GENERIC_CATEGORY = "בלוג טיולים מאורגנים כשרים";
/** Yoast's site-wide fallback description, not written for the post. */
const GENERIC_DESCRIPTION = /^טיולי גשר \|/;
const TOUR_LIST = "/#featured-tours";

/** The old site's fixed pages (decoded path, no trailing slash) → new-site path. */
const PAGE_PATHS: Record<string, string> = {
  "": "/",
  "/עמוד-הבית": "/",
  "/טיולי-גשר-טיולים-מאורגנים-לשומרי-מסור": "/",
  "/אודות": "/about",
  "/המדריכים-שלנו": "/about",
  "/צור-קשר": "/contact",
  "/מבצעים": "/special-offers",
  "/כתבות": "/blog",
  "/מטיילים-כותבים": "/testimonials",
  "/המלצות": "/testimonials",
  "/תנאים-כלליים-ואחריות": "/legal/terms-conditions",
  "/רשימת-כל-הטיולים": TOUR_LIST,
  "/מסעות-לפולין": TOUR_LIST,
};
/** Destination, trip-type and country listing pages: no counterpart, so the home page's tour list. */
const LISTING_PREFIXES = ["/יעדי-טיולים", "/סוג-טיול", "/country", "/טיולים"];

interface WpPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  yoast_head_json?: { title?: string; description?: string };
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string }[];
    "wp:term"?: { taxonomy: string; name: string }[][];
  };
}

async function fetchPosts(): Promise<WpPost[]> {
  const posts: WpPost[] = [];
  for (let page = 1; ; page++) {
    const path = `${CACHE_DIR}/posts-${page}.json`;
    let batch: WpPost[];
    if (!REFRESH && existsSync(path)) {
      batch = JSON.parse(readFileSync(path, "utf-8"));
    } else {
      const res = await fetch(`${SITE}/wp-json/wp/v2/posts?per_page=50&page=${page}&_embed=1`, {
        headers: { "User-Agent": UA },
      });
      // WordPress answers 400 past the last page.
      if (res.status === 400) break;
      if (!res.ok) throw new Error(`Posts fetch failed (${res.status}), page ${page}`);
      batch = await res.json();
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(path, JSON.stringify(batch), "utf-8");
    }
    posts.push(...batch);
    if (batch.length < 50) break;
  }
  return posts;
}

/** Plain text of a WordPress title ("מה כלול במחיר &#8211; …"). */
const textOf = (html: string) => cheerio.load(`<div>${html}</div>`)("div").text().replace(/\s+/g, " ").trim();

const decodedPath = (pathname: string) => {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, "");
  } catch {
    return pathname.replace(/\/+$/, "");
  }
};

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT (writing to Firestore + Storage)" : "DRY RUN (no writes)"}`);

  const posts = (await fetchPosts()).filter((p) => p.status === "publish");
  const slugs = slugsByWpId as Record<string, string>;
  const missingSlugs = posts.filter((p) => !slugs[String(p.id)]);
  if (missingSlugs.length) {
    throw new Error(
      `No English slug in gesher-blog-slugs.json for: ${missingSlugs.map((p) => `${p.id} "${textOf(p.title.rendered)}"`).join(", ")}`
    );
  }
  const duplicate = Object.values(slugs).find((s, i, all) => all.indexOf(s) !== i);
  if (duplicate) throw new Error(`Slug used twice in gesher-blog-slugs.json: ${duplicate}`);

  // Old decoded path → new path, for links inside the posts.
  const tourRedirects = JSON.parse(readFileSync(`${OUT_DIR}/gesher-redirects.json`, "utf-8")) as {
    source: string;
    destination: string;
  }[];
  const linkMap = new Map<string, string>(Object.entries(PAGE_PATHS));
  for (const r of tourRedirects) linkMap.set(r.source.replace(/\/+$/, ""), r.destination);
  for (const p of posts) linkMap.set(decodedPath(new URL(p.link).pathname), `/blog/${slugs[String(p.id)]}`);

  const droppedLinks: { post: string; href: string }[] = [];
  /** An old-site href → its new path; undefined = drop the link, keep the text. */
  function mapHref(raw: string, post: string): string | undefined {
    if (raw.trim().startsWith("#")) return raw.trim();
    let url: URL;
    try {
      url = new URL(raw.trim(), SITE);
    } catch {
      droppedLinks.push({ post, href: raw });
      return undefined;
    }
    if (url.protocol === "mailto:" || url.protocol === "tel:") return url.href;
    if (!/^https?:$/.test(url.protocol)) return undefined;
    if (!OLD_HOSTS.has(url.hostname)) return url.href;
    const path = decodedPath(url.pathname);
    const mapped = linkMap.get(path);
    if (mapped) return mapped + (mapped.includes("#") ? "" : url.hash);
    if (LISTING_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return TOUR_LIST;
    droppedLinks.push({ post, href: decodeURI(url.href) });
    return undefined;
  }

  const fb = COMMIT ? firebase() : null;
  const existingSlugs = fb
    ? new Set((await fb.db.collection("blogPosts").get()).docs.map((d) => (d.data() as BlogPost).slug))
    : new Set<string>();

  const plans: { post: BlogPost; oldUrl: string; images: string[]; hero?: string; links: number }[] = [];
  let skippedExisting = 0;
  for (const wp of posts) {
    const slug = slugs[String(wp.id)];
    if (existingSlugs.has(slug)) {
      skippedExisting++;
      continue;
    }
    const $ = cheerio.load(wp.content.rendered);
    $("script, style, noscript, iframe").remove();

    let links = 0;
    $("a[href]").each((_, el) => {
      const a = $(el);
      const mapped = mapHref(a.attr("href") ?? "", slug);
      if (!mapped) {
        a.replaceWith(a.contents());
        return;
      }
      a.attr("href", mapped);
      links++;
    });

    // A picture wrapped in a link to its own file: keep the picture, drop the link.
    $("a").each((_, el) => {
      const a = $(el);
      if (a.children("img").length && !a.text().trim() && /\/wp-content\/uploads\//.test(a.attr("href") ?? "")) {
        a.replaceWith(a.contents());
      }
    });

    const images: string[] = [];
    $("img").each((_, el) => {
      const img = $(el);
      const src = img.attr("src") ?? "";
      if (!/^https?:\/\//.test(src)) {
        img.remove();
        return;
      }
      images.push(src);
      img.attr("src", encodedUrl(src));
      img.removeAttr("srcset").removeAttr("sizes");
    });

    const html = sanitizeBlogHtml($("body").html() ?? "")
      .replace(/<p>(\s|&nbsp;|<br \/>)*<\/p>/g, "")
      .trim();
    const description = wp.yoast_head_json?.description?.trim();
    const tags = (wp._embedded?.["wp:term"] ?? [])
      .flat()
      .filter((t) => (t.taxonomy === "category" || t.taxonomy === "post_tag") && t.name !== GENERIC_CATEGORY)
      .map((t) => textOf(t.name));

    plans.push({
      oldUrl: decodeURI(wp.link),
      images,
      hero: wp._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
      links,
      post: {
        postId: slug,
        slug,
        title: textOf(wp.title.rendered),
        body: html,
        tags: Array.from(new Set(tags)),
        status: "published",
        publishedAt: wp.date,
        seoDescription: description && !GENERIC_DESCRIPTION.test(description) ? description : undefined,
      },
    });
  }

  if (fb) {
    console.log(`Project: ${fb.projectId}`);
    const uploaded = new Map<string, string>(); // old-site URL → our Storage URL
    const copy = async (src: string, slug: string) => {
      const done = uploaded.get(src);
      if (done) return done;
      const url = await copyImage(fb.bucket, [fullSizeImage(src), src], `blog/gesher/${slug}`);
      uploaded.set(src, url);
      return url;
    };
    for (const plan of plans) {
      const { post } = plan;
      let body = post.body;
      for (const src of new Set(plan.images)) {
        const url = await copy(src, post.slug);
        body = body.split(`src="${encodedUrl(src)}"`).join(`src="${url}"`);
      }
      if (/src="https:\/\/(?:www\.)?geshertours\.co\.il\//.test(body)) {
        throw new Error(`An old-site picture is left in ${post.slug} — stopping before writing it.`);
      }
      post.body = body;
      if (plan.hero) post.heroImage = await copy(plan.hero, post.slug);
      await fb.db.collection("blogPosts").doc(post.postId).set(JSON.parse(JSON.stringify(post)));
      console.log(`  created ${post.slug} (${plan.images.length} pictures, ${plan.links} links)`);
    }
    console.log(`Pictures copied: ${uploaded.size}`);
  }

  mkdirSync(PREVIEW_DIR, { recursive: true });
  for (const { post, hero } of plans) {
    writeFileSync(
      `${PREVIEW_DIR}/${post.slug}.html`,
      `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>${post.title}</title>` +
        `<style>body{font:17px/1.8 system-ui;max-width:760px;margin:40px auto;padding:0 16px}img{max-width:100%;height:auto;display:block;margin:16px auto;border-radius:12px}a{color:#0369a1}</style>` +
        `<h1>${post.title}</h1>` +
        (hero ? `<img src="${encodedUrl(hero)}" alt="">` : "") +
        post.body +
        `</html>`,
      "utf-8"
    );
  }
  writeFileSync(
    `${OUT_DIR}/gesher-blog-preview.json`,
    JSON.stringify(
      {
        droppedLinks,
        posts: plans.map(({ post, oldUrl, images, hero, links }) => ({
          oldUrl,
          newPath: `/blog/${post.slug}`,
          title: post.title,
          publishedAt: post.publishedAt,
          tags: post.tags,
          seoDescription: post.seoDescription ?? null,
          hero: hero ?? null,
          pictures: images.length,
          links,
        })),
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    `${OUT_DIR}/gesher-blog-redirects.json`,
    JSON.stringify(
      posts.map((p) => ({
        source: `${decodedPath(new URL(p.link).pathname)}/`,
        destination: `/blog/${slugs[String(p.id)]}`,
        permanent: true,
      })),
      null,
      2
    ),
    "utf-8"
  );

  console.log("\n=== SUMMARY ===");
  console.log(`Posts on the old site: ${posts.length}`);
  if (skippedExisting) console.log(`Already in Firestore (skipped): ${skippedExisting}`);
  console.log(`${COMMIT ? "Written" : "Would write"}: ${plans.length}`);
  console.log(`Without a featured picture (no hero): ${plans.filter((p) => !p.hero).length}`);
  console.log(`Pictures in the text: ${plans.reduce((n, p) => n + p.images.length, 0)}`);
  console.log(`Links kept: ${plans.reduce((n, p) => n + p.links, 0)}; dropped (text kept): ${droppedLinks.length}`);
  for (const d of droppedLinks) console.log(`  - ${d.post}: ${d.href}`);
  console.log(`\nPreview: ${PREVIEW_DIR}/<slug>.html and ${OUT_DIR}/gesher-blog-preview.json`);
  console.log(`Redirects: ${OUT_DIR}/gesher-blog-redirects.json`);
  if (COMMIT) console.log("Next: npx tsx scripts/migrate/index-media-library.ts (adds the pictures to the image library).");
  else console.log("Dry run only — re-run with --commit to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
