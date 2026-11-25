import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { storageDownloadUrl } from "../../lib/media/assets";

/** Shared by the geshertours.co.il content imports (testimonials, blog). */

export const UA = "Mozilla/5.0 (compatible; SiteMigration/1.0)";
const MAX_EDGE = 2000;

/** Firebase Admin from .env.local; only --commit runs need it. */
export function firebase() {
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
  return { projectId, db, bucket: getStorage(app).bucket() };
}

/** Old-site image URLs may hold raw Hebrew; normalise to one encoded form. */
export function encodedUrl(url: string): string {
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return url;
  }
}

/**
 * Copies one image off the old site into Storage under `folder`, and returns
 * its download URL. Tries each candidate in turn (the full-size original
 * first, then the thumbnail the page used). Anything over 2000px is shrunk
 * to 2000px WebP, like admin uploads.
 */
export async function copyImage(
  bucket: ReturnType<typeof firebase>["bucket"],
  candidates: string[],
  folder: string
): Promise<string> {
  let lastError = "";
  for (const candidate of Array.from(new Set(candidates))) {
    const res = await fetch(encodedUrl(candidate), { headers: { "User-Agent": UA } });
    let contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) {
      lastError = `${res.status} ${candidate}`;
      continue;
    }
    let buffer: Buffer = Buffer.from(await res.arrayBuffer());
    let ext = (candidate.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i)?.[1] ?? "jpg").toLowerCase();
    if (contentType !== "image/gif") {
      const meta = await sharp(buffer).metadata();
      if (Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_EDGE) {
        buffer = await sharp(buffer)
          .rotate()
          .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside" })
          .webp({ quality: 85 })
          .toBuffer();
        contentType = "image/webp";
        ext = "webp";
      }
    }
    const path = `${folder}/${randomUUID()}.${ext}`;
    const token = randomUUID();
    await bucket.file(path).save(buffer, {
      contentType,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    return storageDownloadUrl(bucket.name, path, token);
  }
  throw new Error(`Image download failed: ${lastError}`);
}
