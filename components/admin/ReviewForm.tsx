"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDirtyDraft, useGuardedNavigate, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { saveReview } from "@/lib/actions/reviews";
import ImageField from "@/components/admin/ImageField";
import type { Review, Tour } from "@/lib/types";
import RequiredMark from "@/components/admin/RequiredMark";

const BLANK: Review = {
  reviewId: "",
  tourId: "",
  customerName: "",
  rating: undefined,
  photo: undefined,
  body: "",
  status: "approved",
};

export default function ReviewForm({
  tours,
  destinations = [],
  reviewId,
  initialReview,
}: {
  tours: Tour[];
  /** Destinations already in use — suggested in the Destination field. */
  destinations?: string[];
  /** Present when editing an existing review; omitted when creating a new one. */
  reviewId?: string;
  initialReview?: Review;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Review>(
    initialReview ?? { ...BLANK, tourId: tours[0]?.tourId ?? "" }
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useGuardedNavigate();
  useDirtyDraft(draft);

  function set<K extends keyof Review>(key: K, value: Review[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErrors({});

    let result;
    try {
      result = await saveReview(draft, reviewId);
    } catch {
      setSaving(false);
      toast.error({ title: "השמירה נכשלה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }
    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      toast.error({ title: "ההמלצה לא נשמרה", description: "תקנו את השדות המסומנים ונסו שוב." });
      return;
    }

    toast.success(reviewId ? "ההמלצה עודכנה" : { title: "ההמלצה נוספה", description: "ההמלצה החדשה נשמרה." });
    await navigate("/admin/reviews", { skipConfirm: true });
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-line bg-white p-6">
      <Field label="טיול" required error={errors.tourId}>
        <select
          value={draft.tourId}
          onChange={(e) => set("tourId", e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          {tours.map((t) => (
            <option key={t.tourId} value={t.tourId}>
              {t.title}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם הלקוח/ה" required error={errors.customerName}>
          <input
            value={draft.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </Field>
        <Field label="דירוג" error={errors.rating}>
          <select
            value={draft.rating ?? ""}
            onChange={(e) => set("rating", e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">ללא דירוג</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="יעד" error={errors.destination}>
        <input
          value={draft.destination ?? ""}
          onChange={(e) => set("destination", e.target.value || undefined)}
          list="review-destinations"
          placeholder="למשל: סין, ספרד ופורטוגל — ריק = המדינה הראשונה של הטיול"
          maxLength={60}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
        <datalist id="review-destinations">
          {destinations.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-ink-muted">
          מקבץ את ההמלצה בדף ההמלצות ומציג אותה בטיולים שמבקרים ביעד הזה.
        </p>
      </Field>

      <Field label="טקסט ההמלצה" required error={errors.body}>
        <textarea
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
      </Field>

      <Field label="תמונה">
        <ImageField shape="round" noun="תמונה" folder="reviews" value={draft.photo} onChange={(url) => set("photo", url)} />
      </Field>

      <Field label="סטטוס">
        <select
          value={draft.status}
          onChange={(e) => set("status", e.target.value as Review["status"])}
          className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="pending">ממתינה לאישור</option>
          <option value="approved">מאושרת</option>
          <option value="rejected">נדחתה</option>
        </select>
      </Field>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {saving ? "שומר…" : reviewId ? "שמירת שינויים" : "שמירת ההמלצה"}
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
