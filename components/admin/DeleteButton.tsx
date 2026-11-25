"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeleteResult } from "@/lib/actions/deletions";
import { AdminIcon } from "@/components/admin/IconAction";
import { useConfirm, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

/**
 * Permanent-delete button for admin edit pages: asks to confirm, runs the
 * (pre-bound) server action, then goes back to the list. Pages render it
 * only for the Admin role; the actions check that again on the server.
 */
export default function DeleteButton({
  action,
  what,
  redirectTo,
}: {
  action: () => Promise<DeleteResult>;
  /** Shown in the confirmation, e.g. "this tour". */
  what: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: `למחוק ${what} לצמיתות?`,
      description: "אי אפשר לבטל את הפעולה.",
      confirmLabel: "מחיקה",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    const result = await action().catch(
      (): DeleteResult => ({ ok: false, error: "המחיקה נכשלה — נסו שוב." })
    );
    if (!result.ok) {
      toast.error({ title: "המחיקה נכשלה", description: result.error });
      setDeleting(false);
      return;
    }
    toast.success({ title: "נמחק", description: "הפריט נמחק." });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={handleDelete}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-terracotta-dark transition-colors hover:bg-terracotta/5 disabled:opacity-60"
    >
      <AdminIcon name="trash" className="h-4 w-4" />
      {deleting ? "מוחק…" : "מחיקה"}
    </button>
  );
}
