"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDirtyDraft, useGuardedNavigate, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { saveStaffMember } from "@/lib/actions/staff";
import ImageField from "@/components/admin/ImageField";
import type { Staff } from "@/lib/types";
import RequiredMark from "@/components/admin/RequiredMark";

const BLANK: Staff = { staffId: "", name: "", role: "guide", bio: undefined, photo: undefined };

export default function StaffMemberForm({
  mode,
  staffId,
  initialStaff,
}: {
  mode: "create" | "edit";
  staffId?: string;
  initialStaff?: Staff;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Staff>(initialStaff ?? BLANK);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useGuardedNavigate();
  useDirtyDraft(draft);

  function set<K extends keyof Staff>(key: K, value: Staff[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErrors({});

    let result;
    try {
      result = await saveStaffMember(draft, staffId);
    } catch {
      setSaving(false);
      toast.error({ title: "השמירה נכשלה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }
    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      toast.error({ title: "איש/אשת הצוות לא נשמר/ה", description: "תקנו את השדות המסומנים ונסו שוב." });
      return;
    }

    toast.success(mode === "create" ? { title: "נוסף/ה לצוות", description: `${draft.name} נוסף/ה לצוות.` } : "הפרטים עודכנו");
    await navigate("/admin/staff/team", { skipConfirm: true });
    if (mode === "create") router.refresh();
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">
      <Field label="שם" required error={errors.name}>
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
      </Field>
      <Field label="תפקיד">
        <select
          value={draft.role}
          onChange={(e) => set("role", e.target.value as Staff["role"])}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="guide">מדריך/ה</option>
          <option value="kashrutSupervisor">משגיח/ת כשרות</option>
        </select>
      </Field>
      <Field label="מגדר">
        <select
          value={draft.gender ?? ""}
          onChange={(e) => set("gender", (e.target.value || undefined) as Staff["gender"])}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">לא נקבע</option>
          <option value="male">זכר</option>
          <option value="female">נקבה</option>
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          Used for the placeholder avatar on tour pages when there&apos;s no photo.
        </p>
      </Field>
      <Field label="אודות">
        <textarea
          value={draft.bio ?? ""}
          onChange={(e) => set("bio", e.target.value || undefined)}
          rows={4}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
      </Field>
      <Field label="תמונה">
        <ImageField shape="round" noun="תמונה" folder="staff" value={draft.photo} onChange={(url) => set("photo", url)} />
      </Field>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {saving ? "שומר…" : "שמירה"}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">
        {label}
        {required && <RequiredMark />}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-terracotta-dark">{error[0]}</p>}
    </div>
  );
}
