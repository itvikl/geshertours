"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeAccountRole } from "@/lib/actions/adminUsers";
import { useConfirm, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { ROLE_LABELS, type AdminRole } from "@/lib/auth/roles";

/** Role dropdown on an Admin accounts row; the change applies at once (their session restarts). */
export default function AccountRoleSelect({
  uid,
  email,
  role,
  options,
}: {
  uid: string;
  email: string | null;
  role: AdminRole;
  options: AdminRole[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleChange(next: AdminRole) {
    if (next === role) return;
    const ok = await confirm({
      title: `לשנות את התפקיד של ${email ?? "החשבון"} ל${ROLE_LABELS[next]}?`,
      description: "החשבון ינותק ויקבל את ההרשאות החדשות בכניסה הבאה.",
      confirmLabel: "שינוי תפקיד",
    });
    if (!ok) return;
    setSaving(true);
    const result = await changeAccountRole({ uid, role: next }).catch(() => ({
      ok: false as const,
      error: "שינוי התפקיד נכשל — נסו שוב.",
    }));
    setSaving(false);
    if (!result.ok) {
      toast.error({ title: "התפקיד לא שונה", description: result.error });
      return;
    }
    toast.success({ title: "התפקיד שונה", description: `התפקיד של ${email ?? "החשבון"} עכשיו: ${ROLE_LABELS[next]}.` });
    router.refresh();
  }

  return (
    <select
      aria-label={`התפקיד של ${email ?? "החשבון"}`}
      value={role}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as AdminRole)}
      className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink disabled:opacity-60"
    >
      {options.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
