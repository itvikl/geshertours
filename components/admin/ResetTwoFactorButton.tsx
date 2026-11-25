"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetAdminTwoFactor } from "@/lib/actions/adminUsers";
import { IconButton } from "@/components/admin/IconAction";

/** Row action on Admin accounts — for a lost authenticator; mirrors DeleteAdminAccountButton's confirm flow. */
export default function ResetTwoFactorButton({ uid, email }: { uid: string; email: string | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setError(null);
    const result = await resetAdminTwoFactor(uid).catch(() => ({ ok: false, error: "האיפוס נכשל — נסו שוב." }));
    setResetting(false);
    setConfirming(false);
    if (!result.ok) {
      setError(result.error ?? "האיפוס נכשל — נסו שוב.");
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2 text-sm">
        <span className="text-ink-muted">לאפס את האימות הדו-שלבי של {email ?? "החשבון"}? החשבון ינותק.</span>
        <button
          type="button"
          disabled={resetting}
          onClick={handleReset}
          className="font-semibold text-terracotta-dark hover:underline disabled:opacity-60"
        >
          {resetting ? "מאפס…" : "איפוס"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-ink-muted hover:underline">
          ביטול
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end">
      <IconButton icon="key" label="איפוס אימות דו-שלבי" onClick={() => setConfirming(true)} />
      {error && <span className="mt-1 text-xs text-terracotta-dark">{error}</span>}
    </span>
  );
}
