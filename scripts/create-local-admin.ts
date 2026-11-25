import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * LOCAL TESTING ONLY: creates (or resets) a developer account in the Firebase
 * Auth emulator so the admin can be tried locally. Refuses to run unless
 * FIREBASE_AUTH_EMULATOR_HOST is set, so it can never touch the real project.
 *
 * Run with: npx tsx scripts/create-local-admin.ts [email] [password]
 */
async function main() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Emulators only: set FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST.");
  }
  const [email = "admin@local.test", password = "local-admin-123"] = process.argv.slice(2);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID!;
  const app = initializeApp({
    projectId,
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  const auth = getAuth(app);

  const user = await auth
    .getUserByEmail(email)
    .then((u) => auth.updateUser(u.uid, { password, emailVerified: true }))
    .catch(() => auth.createUser({ email, password, emailVerified: true }));
  await auth.setCustomUserClaims(user.uid, { role: "developer" });
  await getFirestore(app).collection("users").doc(user.uid).set({ email, role: "developer" }, { merge: true });

  console.log(`Local admin ready: ${email} / ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
