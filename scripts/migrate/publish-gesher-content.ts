import { config } from "dotenv";
config({ path: ".env.local" });

import { firebase } from "./gesherFirebase";

/**
 * Makes the imported geshertours.co.il content public in one go, without a
 * review in admin:
 * - tours: every "draft" tour (the ones with upcoming dates) → "published";
 *   with --include-archived also the past, "archived" tours.
 * - blog posts: any not yet "published" → "published".
 * - testimonials: any not yet "approved" → "approved".
 *
 * Dry run by default: lists what would change. Pass --commit to write.
 * Needs the gesher-tours service-account key in .env.local.
 *
 * Run with: npx tsx scripts/migrate/publish-gesher-content.ts [--include-archived] [--commit]
 */

const COMMIT = process.argv.includes("--commit");
const INCLUDE_ARCHIVED = process.argv.includes("--include-archived");

async function main() {
  const { projectId, db } = firebase();
  console.log(`Project: ${projectId} — ${COMMIT ? "COMMIT" : "DRY RUN (no writes)"}`);

  const tourStatuses = INCLUDE_ARCHIVED ? ["draft", "archived"] : ["draft"];
  const jobs = [
    { collection: "tours", from: tourStatuses, to: "published", label: (d: FirebaseFirestore.DocumentData) => d.title },
    { collection: "blogPosts", from: ["draft"], to: "published", label: (d: FirebaseFirestore.DocumentData) => d.title },
    { collection: "reviews", from: ["pending"], to: "approved", label: (d: FirebaseFirestore.DocumentData) => d.customerName },
  ];

  for (const job of jobs) {
    const snap = await db.collection(job.collection).where("status", "in", job.from).get();
    console.log(`\n${job.collection}: ${snap.size} → ${job.to}`);
    for (const doc of snap.docs) console.log(`  - ${job.label(doc.data())} (${doc.get("status")})`);
    if (!COMMIT || snap.empty) continue;
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      for (const doc of snap.docs.slice(i, i + 400)) {
        batch.update(doc.ref, { status: job.to });
      }
      await batch.commit();
    }
    console.log(`  written.`);
  }

  if (!COMMIT) console.log("\nDry run — nothing written. Re-run with --commit.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
