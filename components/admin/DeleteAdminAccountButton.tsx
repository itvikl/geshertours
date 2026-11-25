"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminAccount } from "@/lib/actions/adminUsers";
import { IconButton } from "@/components/admin/IconAction";
import { useConfirm, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

/** Row action on Admin accounts — asks to confirm, then removes the login entirely. */
export default function DeleteAdminAccountButton({ uid, email }: { uid: string; email: string | null }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: `למחוק את ${email ?? "החשבון"}?`,
      description: "החשבון יוסר לגמרי — לא תהיה יותר אפשרות להיכנס איתו לניהול.",
      confirmLabel: "מחיקת החשבון",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    const result = await deleteAdminAccount(uid).catch(() => ({ ok: false, error: "Couldn't delete — try again." }));
    setDeleting(false);
    if (!result.ok) {
      toast.error({ title: "מחיקת החשבון נכשלה", description: result.error ?? "המחיקה נכשלה — נסו שוב." });
      return;
    }
    toast.success({ title: "החשבון נמחק", description: `${email ?? "החשבון"} כבר לא יכול להיכנס.` });
    router.refresh();
  }

  return <IconButton icon="trash" label="מחיקת החשבון" tone="danger" disabled={deleting} onClick={handleDelete} />;
}
