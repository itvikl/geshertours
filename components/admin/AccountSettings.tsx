"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  getMultiFactorResolver,
  multiFactor,
  signInWithEmailAndPassword,
  signOut,
  TotpMultiFactorGenerator,
  updatePassword,
  type MultiFactorError,
  type TotpSecret,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { roleLabel, type AdminRole } from "@/lib/auth/roles";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-navy";
const primaryButton =
  "rounded-lg bg-navy px-4 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60";
const secondaryButton =
  "rounded-lg border border-line px-4 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-sand-warm disabled:opacity-60";
const dangerButton =
  "rounded-lg bg-terracotta-dark px-4 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";
const cardClass = "rounded-xl border border-line bg-white p-6";

const MIN_PASSWORD_LENGTH = 8;

/** An error whose message is already fit to show. */
class ShownError extends Error {}

function describeError(err: unknown): string {
  if (err instanceof ShownError) return err.message;
  switch ((err as { code?: string }).code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "הסיסמה הנוכחית שגויה.";
    case "auth/invalid-verification-code":
      return "הקוד לא התקבל. בדקו את אפליקציית האימות ונסו שוב.";
    case "auth/too-many-requests":
      return "יותר מדי ניסיונות. המתינו כמה דקות ונסו שוב.";
    case "auth/weak-password":
      return `בחרו סיסמה חזקה יותר (לפחות ${MIN_PASSWORD_LENGTH} תווים).`;
    case "auth/unverified-email":
      return "כתובת המייל של החשבון לא אומתה, ולכן אי אפשר להגדיר אימות דו-שלבי. בקשו ממנהל/ת אחר/ת לתקן את החשבון.";
    case "auth/operation-not-allowed":
      return "אפליקציות אימות עדיין לא הופעלו באתר. בקשו מהמפתח/ת להפעיל אותן.";
    default:
      return "משהו השתבש. נסו שוב.";
  }
}

/**
 * Firebase only lets a user change their password or second factors right
 * after signing in, so every change here starts by signing in again in the
 * browser with the current password (and the authenticator code, when the
 * account has one). This doesn't touch the admin session cookie.
 */
async function reauthenticate(email: string, password: string, totpCode: string): Promise<User> {
  try {
    return (await signInWithEmailAndPassword(auth, email, password)).user;
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/multi-factor-auth-required") throw err;
    const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
    const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) throw new ShownError("אמצעי האימות השני של החשבון אינו אפליקציית אימות. בקשו ממנהל/ת אחר/ת לאפס אותו.");
    if (totpCode.length !== 6) throw new ShownError("הזינו את הקוד בן 6 הספרות מאפליקציית האימות.");
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, totpCode);
    return (await resolver.resolveSignIn(assertion)).user;
  }
}

/** Ends this browser's admin session and goes to sign-in with a notice (see app/admin/login/page.tsx). */
async function signOutTo(router: ReturnType<typeof useRouter>, notice: string) {
  await signOut(auth).catch(() => undefined);
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
  router.push(`/admin/login?notice=${notice}`);
  router.refresh();
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      type="password"
      required
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

function CodeInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className={`${inputClass} max-w-[12rem] text-center font-mono tracking-[0.4em]`}
    />
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm font-medium text-terracotta-dark">
      {error}
    </p>
  );
}

export default function AccountSettings({
  email,
  role,
  hasAuthenticator,
  authenticatorAddedOn,
  twoFactorRequired,
}: {
  email: string | null;
  role: AdminRole;
  hasAuthenticator: boolean;
  authenticatorAddedOn: string | null;
  twoFactorRequired: boolean;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-ink">פרופיל</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ink-muted">אימייל</dt>
          <dd className="text-ink">{email ?? "—"}</dd>
          <dt className="text-ink-muted">תפקיד</dt>
          <dd className="text-ink">{roleLabel(role)}</dd>
        </dl>
        <p className="mt-3 text-xs text-ink-muted">לשינוי האימייל או התפקיד פנו למנהל/ת על או למפתח/ת.</p>
      </section>

      {email ? (
        <>
          <ChangePasswordCard email={email} hasAuthenticator={hasAuthenticator} />
          <TwoFactorCard
            email={email}
            hasAuthenticator={hasAuthenticator}
            authenticatorAddedOn={authenticatorAddedOn}
            twoFactorRequired={twoFactorRequired}
          />
        </>
      ) : (
        <p className="text-sm text-ink-muted">לחשבון אין כתובת מייל, ולכן אי אפשר לשנות כאן את פרטי הכניסה.</p>
      )}
    </div>
  );
}

function ChangePasswordCard({ email, hasAuthenticator }: { email: string; hasAuthenticator: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`הסיסמה החדשה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
      return;
    }
    if (next !== confirm) {
      setError("הסיסמאות החדשות אינן תואמות.");
      return;
    }
    if (next === current) {
      setError("הסיסמה החדשה זהה לנוכחית.");
      return;
    }

    setSaving(true);
    try {
      const user = await reauthenticate(email, current, code);
      await updatePassword(user, next);
    } catch (err) {
      await signOut(auth).catch(() => undefined);
      setError(describeError(err));
      setSaving(false);
      return;
    }
    // A password change signs out every session, this one included.
    await signOutTo(router, "password-changed");
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-ink">סיסמה</h2>
      <p className="mt-1 text-sm text-ink-muted">
        After you change it, you&apos;ll be signed out everywhere and sign in again with the new password.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field id="current-password" label="סיסמה נוכחית">
          <PasswordInput id="current-password" value={current} onChange={setCurrent} autoComplete="current-password" />
        </Field>
        {hasAuthenticator && (
          <Field id="password-code" label="קוד אימות" hint="הקוד בן 6 הספרות מאפליקציית האימות.">
            <CodeInput id="password-code" value={code} onChange={setCode} />
          </Field>
        )}
        <Field id="new-password" label="סיסמה חדשה" hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים.`}>
          <PasswordInput id="new-password" value={next} onChange={setNext} autoComplete="new-password" />
        </Field>
        <Field id="confirm-password" label="אימות הסיסמה החדשה">
          <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        <ErrorText error={error} />
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "משנה…" : "שינוי סיסמה"}
        </button>
      </form>
    </section>
  );
}

type TwoFactorMode =
  | { kind: "idle" }
  | { kind: "enable-confirm" }
  | { kind: "enable-scan"; user: User; secret: TotpSecret; qrDataUrl: string }
  | { kind: "disable-confirm" };

function TwoFactorCard({
  email,
  hasAuthenticator,
  authenticatorAddedOn,
  twoFactorRequired,
}: {
  email: string;
  hasAuthenticator: boolean;
  authenticatorAddedOn: string | null;
  twoFactorRequired: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<TwoFactorMode>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset(next: TwoFactorMode = { kind: "idle" }) {
    if (mode.kind === "enable-scan" && next.kind === "idle") void signOut(auth);
    setMode(next);
    setPassword("");
    setCode("");
    setError(null);
  }

  async function startEnable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await reauthenticate(email, password, "");
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      const qrDataUrl = await QRCode.toDataURL(secret.generateQrCodeUrl(email, "Gesher Tours Admin"), {
        margin: 1,
        width: 200,
      });
      setPassword("");
      setCode("");
      setMode({ kind: "enable-scan", user, secret, qrDataUrl });
    } catch (err) {
      await signOut(auth).catch(() => undefined);
      setError(describeError(err));
    }
    setBusy(false);
  }

  async function finishEnable(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind !== "enable-scan") return;
    setError(null);
    setBusy(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(mode.secret, code);
      await multiFactor(mode.user).enroll(assertion, "אפליקציית אימות");
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
      return;
    }
    await signOut(auth).catch(() => undefined);
    setBusy(false);
    reset();
    toast.success({
      title: "האימות הדו-שלבי פעיל",
      description: "מהכניסה הבאה תתבקשו להזין קוד מאפליקציית האימות.",
    });
    router.refresh();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await reauthenticate(email, password, code);
      const factor = multiFactor(user).enrolledFactors.find((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      if (factor) {
        // Firebase may sign the browser user out as part of removing the
        // factor it signed in with — the removal itself still succeeded.
        await multiFactor(user)
          .unenroll(factor)
          .catch((err) => {
            if ((err as { code?: string }).code !== "auth/user-token-expired") throw err;
          });
      }
    } catch (err) {
      await signOut(auth).catch(() => undefined);
      setError(describeError(err));
      setBusy(false);
      return;
    }
    // Removing a second factor can revoke existing sessions, so start a clean one.
    await signOutTo(router, "2fa-off");
  }

  const addedOn = authenticatorAddedOn
    ? new Date(authenticatorAddedOn).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const status = hasAuthenticator ? (
    <span className="font-semibold text-olive">פעיל — אפליקציית אימות</span>
  ) : twoFactorRequired ? (
    <span className="font-semibold text-olive">פעיל — קודים במייל</span>
  ) : (
    <span className="font-semibold text-ink-muted">כבוי</span>
  );

  const explanation = hasAuthenticator
    ? `בכל כניסה מזינים קוד מאפליקציית האימות${addedOn ? ` (הוגדרה ב-${addedOn})` : ""}.`
    : twoFactorRequired
      ? "אימות דו-שלבי נדרש מכל מנהל/ת. בלי אפליקציית אימות, בכל כניסה נשלח אליכם קוד במייל — אפליקציה מהירה יותר ועובדת גם בלי אינטרנט."
      : "החשבון מוגן בסיסמה בלבד. הוסיפו אפליקציית אימות (Google Authenticator,‏ Microsoft Authenticator,‏ 1Password…) לקבלת קוד בכל כניסה.";

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">אימות דו-שלבי</h2>
        <p className="text-sm">{status}</p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{explanation}</p>

      {mode.kind === "idle" && (
        <div className="mt-5">
          {hasAuthenticator ? (
            <button type="button" onClick={() => reset({ kind: "disable-confirm" })} className={secondaryButton}>
              הסרת אפליקציית האימות
            </button>
          ) : (
            <button type="button" onClick={() => reset({ kind: "enable-confirm" })} className={primaryButton}>
              הגדרת אפליקציית אימות
            </button>
          )}
        </div>
      )}

      {mode.kind === "enable-confirm" && (
        <form onSubmit={startEnable} className="mt-5 space-y-4">
          <Field id="enable-password" label="סיסמה נוכחית" hint="אשרו שזה אתם לפני הוספת אפליקציית אימות.">
            <PasswordInput
              id="enable-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <ErrorText error={error} />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? "בודק…" : "המשך"}
            </button>
            <button type="button" disabled={busy} onClick={() => reset()} className={secondaryButton}>
              ביטול
            </button>
          </div>
        </form>
      )}

      {mode.kind === "enable-scan" && (
        <form onSubmit={finishEnable} className="mt-5 space-y-4">
          <p className="text-sm text-ink-muted">
            סרקו את הקוד באפליקציית האימות והזינו את הקוד בן 6 הספרות שמופיע בה.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing for next/image to optimize */}
          <img src={mode.qrDataUrl} alt="קוד QR להגדרת אפליקציית האימות" width={200} height={200} />
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer">לא מצליחים לסרוק? הזינו את המפתח הזה במקום</summary>
            <code className="mt-2 block break-all rounded bg-sand-warm px-2 py-1.5 font-mono text-ink">
              {mode.secret.secretKey}
            </code>
          </details>
          <Field id="enable-code" label="קוד בן 6 ספרות">
            <CodeInput id="enable-code" value={code} onChange={setCode} />
          </Field>
          <ErrorText error={error} />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || code.length !== 6} className={primaryButton}>
              {busy ? "מאמת…" : "הפעלה"}
            </button>
            <button type="button" disabled={busy} onClick={() => reset()} className={secondaryButton}>
              ביטול
            </button>
          </div>
        </form>
      )}

      {mode.kind === "disable-confirm" && (
        <form onSubmit={disable} className="mt-5 space-y-4">
          <p className="rounded-lg bg-sand-warm px-3 py-2 text-sm text-ink">
            {twoFactorRequired
              ? "במקום זאת תקבלו קודי כניסה במייל. תנותקו ותצטרכו להיכנס שוב."
              : "החשבון יהיה מוגן בסיסמה בלבד. תנותקו ותצטרכו להיכנס שוב."}
          </p>
          <Field id="disable-password" label="סיסמה נוכחית">
            <PasswordInput
              id="disable-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <Field id="disable-code" label="קוד אימות" hint="קוד מהאפליקציה שאתם מסירים.">
            <CodeInput id="disable-code" value={code} onChange={setCode} />
          </Field>
          <ErrorText error={error} />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || code.length !== 6} className={dangerButton}>
              {busy ? "מכבה…" : "כיבוי"}
            </button>
            <button type="button" disabled={busy} onClick={() => reset()} className={secondaryButton}>
              ביטול
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
