import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/auth/dal";
import { adminAuth } from "@/lib/firebase/admin";
import { isAdmin2faRequired } from "@/lib/auth/mfa";
import AccountSettings from "@/components/admin/AccountSettings";

export const metadata: Metadata = { title: "החשבון שלי" };

/**
 * The signed-in admin's own settings — password and authenticator app.
 * Open to every admin/staff account (each edits only themselves); managing
 * other people's access stays on Admin accounts (admin role only).
 */
export default async function MyAccountPage() {
  const session = await requireAdminSession();
  const user = await adminAuth().getUser(session.uid);
  const authenticator = user.multiFactor?.enrolledFactors.find(
    (f) => f.factorId === "totp" // TotpMultiFactorGenerator.FACTOR_ID (client SDK)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">החשבון שלי</h1>
        <p className="mt-1 text-sm text-ink-muted">הגדרות הכניסה שלכם. שינויים כאן משפיעים רק על החשבון שלכם.</p>
      </div>
      <AccountSettings
        email={user.email ?? session.email}
        role={session.role}
        hasAuthenticator={Boolean(authenticator)}
        authenticatorAddedOn={authenticator?.enrollmentTime ?? null}
        twoFactorRequired={isAdmin2faRequired()}
      />
    </div>
  );
}
