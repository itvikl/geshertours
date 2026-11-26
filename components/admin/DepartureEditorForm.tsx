"use client";

import { useState } from "react";
import { useDirtyDraft, useGuardedNavigate, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { saveDeparture, type BalancePaymentLink } from "@/lib/actions/departures";
import RequiredMark from "@/components/admin/RequiredMark";
import {
  availableSeats,
  type BookingAssurance,
  type Departure,
  type DepartureStatus,
  type Staff,
  type Tour,
} from "@/lib/types";
import { MAIN_VERSION_ID, resolvePricing, versionOf } from "@/lib/tourVersions";

interface DepartureDraft {
  startDate: string;
  endDate: string;
  capacityTotal: number;
  status: DepartureStatus;
  minGroupSizeMet: boolean;
  guideId?: string;
  kashrutSupervisorId?: string;
  bookingAssurance: BookingAssurance;
  versionId?: string;
  note?: string;
  /** This date's own prices; blank uses the version's or the tour's. */
  pricingOverride?: { pricePerPersonDouble?: number; pricePerPersonSingle?: number };
}

const BLANK: DepartureDraft = {
  startDate: "",
  endDate: "",
  capacityTotal: 0,
  status: "open",
  minGroupSizeMet: false,
  guideId: undefined,
  kashrutSupervisorId: undefined,
  bookingAssurance: "conditional",
};

/** "" → undefined, else a non-negative number. */
function priceInput(value: string): number | undefined {
  return value.trim() === "" ? undefined : Math.max(0, Number(value));
}

export default function DepartureEditorForm({
  mode,
  tourId,
  departureId,
  initialDeparture,
  tour,
  staff,
}: {
  mode: "create" | "edit";
  tourId: string;
  departureId?: string;
  initialDeparture?: Departure;
  tour: Tour;
  staff: Staff[];
}) {
  const [draft, setDraft] = useState<DepartureDraft>(
    initialDeparture
      ? { ...initialDeparture, bookingAssurance: initialDeparture.bookingAssurance ?? "conditional" }
      : BLANK
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [balancePaymentLinks, setBalancePaymentLinks] = useState<BalancePaymentLink[] | null>(null);
  const toast = useToast();
  const navigate = useGuardedNavigate();
  const { markSaved } = useDirtyDraft(draft);

  const guides = staff.filter((s) => s.role === "guide");
  const kashrutSupervisors = staff.filter((s) => s.role === "kashrutSupervisor");

  const versions = tour.versions ?? [];
  const basePricing = resolvePricing(tour, versionOf(tour, draft.versionId));

  function setPrice(key: "pricePerPersonDouble" | "pricePerPersonSingle", value: string) {
    setDraft((prev) => ({
      ...prev,
      pricingOverride: { ...prev.pricingOverride, [key]: priceInput(value) },
    }));
  }

  function set<K extends keyof DepartureDraft>(key: K, value: DepartureDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErrors({});

    let result;
    try {
      result = await saveDeparture(draft, tourId, departureId);
    } catch {
      setSaving(false);
      toast.error({ title: "השמירה נכשלה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }
    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      toast.error({ title: "מועד היציאה לא נשמר", description: "תקנו את השדות המסומנים ונסו שוב." });
      return;
    }

    markSaved(draft);
    toast.success(
      mode === "create"
        ? { title: "מועד היציאה נוצר", description: `${draft.startDate} נוסף לטיול ${tour.title}.` }
        : { title: "מועד היציאה נשמר", description: "השינויים נשמרו בהצלחה." }
    );

    if (result.balancePaymentLinks.length > 0) {
      // This departure just flipped to "guaranteed" and some customers already
      // paid something — no real email sending exists yet (deferred), so
      // staff get the links here to send manually. See coral-wandering-lantern.md.
      setBalancePaymentLinks(result.balancePaymentLinks);
      setSaving(false);
      return;
    }

    await navigate(`/admin/tours/${tourId}/departures`, { skipConfirm: true });
  }

  if (balancePaymentLinks) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-4">
          <p className="font-semibold text-ink">
            מועד היציאה מובטח עכשיו —{" "}
            {balancePaymentLinks.length === 1
              ? "לקוח אחד ששילם כבר חלק עדיין חייב יתרה."
              : `${balancePaymentLinks.length} לקוחות ששילמו כבר חלק עדיין חייבים יתרה.`}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            עדיין אין מייל אוטומטי — שלחו את הקישורים ידנית (בטלפון, בוואטסאפ או
            במייל שלכם) עד שזה יוגדר.
          </p>
        </div>
        <div className="space-y-3">
          {balancePaymentLinks.map((link) => (
            <div key={link.bookingId} className="rounded-xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">
                {link.contactName} · יתרה לתשלום: ${link.balanceAmount}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={link.url}
                  className="w-full rounded-lg border border-line bg-sand-warm px-3 py-1.5 text-xs text-ink"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(link.url).then(
                      () => toast.success({ title: "הקישור הועתק", description: `קישור התשלום של ${link.contactName} הועתק.` }),
                      () => toast.error("ההעתקה נכשלה — סמנו את הקישור והעתיקו ידנית.")
                    )
                  }
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-sand-warm"
                >
                  העתקה
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/admin/tours/${tourId}/departures`, { skipConfirm: true })}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          סיום
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      {initialDeparture && (
        <div className="rounded-xl border border-line bg-sand-warm p-4 text-sm text-ink">
          <p>
            <span className="font-semibold">{initialDeparture.capacityBooked}</span> רשומים ·{" "}
            <span className="font-semibold">{initialDeparture.capacityHeld}</span> שמורים ·{" "}
            <span className="font-semibold">{availableSeats(initialDeparture)}</span> פנויים מתוך{" "}
            {initialDeparture.capacityTotal}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            מועד תשלום היתרה: {initialDeparture.balanceDueDate} (מחושב לפי תאריך היציאה ומדיניות
            הטיול — {tour.pricing.balanceDueDaysBeforeDeparture} ימים לפני).
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-line bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="תאריך התחלה" required error={errors.startDate}>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              // Only steers new departures away from past dates — editing an
              // existing (already past) departure isn't blocked here or
              // server-side; see saveDeparture in lib/actions/departures.ts.
              min={mode === "create" ? new Date().toISOString().slice(0, 10) : undefined}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </Field>
          <Field label="תאריך סיום" required error={errors.endDate}>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </Field>
        </div>

        {versions.length > 0 && (
          <Field
            label="גרסה"
            hint="המסלול, הטיסה והמחיר של המועד נלקחים מהגרסה שנבחרה."
            error={errors.versionId}
          >
            <select
              value={draft.versionId ?? MAIN_VERSION_ID}
              onChange={(e) =>
                set("versionId", e.target.value === MAIN_VERSION_ID ? undefined : e.target.value)
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value={MAIN_VERSION_ID}>
                {tour.mainVersionLabel?.trim() || "הגרסה הראשית"}
              </option>
              {versions.map((v) => (
                <option key={v.versionId} value={v.versionId}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="מחיר לאדם בחדר זוגי ($)"
            hint={`ריק = ${basePricing.pricePerPersonDouble} (המחיר של ${draft.versionId ? "הגרסה" : "הטיול"})`}
            error={errors["pricingOverride.pricePerPersonDouble"]}
          >
            <input
              type="number"
              min={0}
              value={draft.pricingOverride?.pricePerPersonDouble ?? ""}
              placeholder={String(basePricing.pricePerPersonDouble)}
              onChange={(e) => setPrice("pricePerPersonDouble", e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </Field>
          <Field
            label="מחיר לאדם בחדר יחיד ($)"
            hint={`ריק = ${basePricing.pricePerPersonSingle}`}
            error={errors["pricingOverride.pricePerPersonSingle"]}
          >
            <input
              type="number"
              min={0}
              value={draft.pricingOverride?.pricePerPersonSingle ?? ""}
              placeholder={String(basePricing.pricePerPersonSingle)}
              onChange={(e) => setPrice("pricePerPersonSingle", e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </Field>
        </div>

        <Field
          label="הערה בטבלת המועדים"
          hint="מוצגת ללקוחות ליד המועד, למשל ״המחיר לנרשמים הראשונים בלבד״ או ״טיול מובטח!״."
          error={errors.note}
        >
          <input
            type="text"
            maxLength={200}
            value={draft.note ?? ""}
            onChange={(e) => set("note", e.target.value || undefined)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="מספר מקומות מרבי" required error={errors.capacityTotal}>
            <input
              type="number"
              min={0}
              value={draft.capacityTotal}
              onChange={(e) => set("capacityTotal", Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </Field>
          <Field label="סטטוס" error={errors.status}>
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value as DepartureStatus)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="open">פתוח להרשמה</option>
              <option value="closed">סגור</option>
              <option value="soldout">מלא</option>
              <option value="cancelled">בוטל</option>
            </select>
          </Field>
        </div>

        <Field
          label="סטטוס היציאה"
          hint="מוצג ללקוחות בדף ההרשמה — החלטה ידנית, שאינה תלויה במספרי המינימום בפועל. מעבר ל״מובטחת״ יציג קישורי תשלום לכל מי ששילם כבר חלק במועד הזה."
        >
          <select
            value={draft.bookingAssurance}
            onChange={(e) => set("bookingAssurance", e.target.value as BookingAssurance)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="conditional">מותנית — דורשת מינימום משתתפים</option>
            <option value="guaranteed">יציאה מובטחת</option>
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="מדריך/ה">
            <select
              value={draft.guideId ?? ""}
              onChange={(e) => set("guideId", e.target.value || undefined)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">— ללא —</option>
              {guides.map((g) => (
                <option key={g.staffId} value={g.staffId}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="משגיח/ת כשרות">
            <select
              value={draft.kashrutSupervisorId ?? ""}
              onChange={(e) => set("kashrutSupervisorId", e.target.value || undefined)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">— ללא —</option>
              {kashrutSupervisors.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.minGroupSizeMet}
            onChange={(e) => set("minGroupSizeMet", e.target.checked)}
            className="mt-0.5"
          />
          <span>
            הגענו למינימום המשתתפים
            <span className="block text-xs text-ink-muted">
              פנימי בלבד — לא מוצג ללקוחות.
            </span>
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {saving ? "שומר…" : mode === "create" ? "יצירת מועד יציאה" : "שמירת שינויים"}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">
        {label}
        {required && <RequiredMark />}
      </label>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-terracotta-dark">{error[0]}</p>}
    </div>
  );
}
