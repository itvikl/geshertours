"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormDirty, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import UnsavedIndicator from "@/components/admin/feedback/UnsavedIndicator";
import { saveSettings, type SaveSettingsState } from "@/lib/actions/settings";
import type { SiteSettings } from "@/lib/types";
import RequiredMark from "@/components/admin/RequiredMark";

const initialState: SaveSettingsState = { ok: true };

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  const errors = state.ok ? {} : state.errors;
  const toast = useToast();
  const { isDirty, markSaved, formProps } = useFormDirty();

  // React to each completed submission (the initial state is skipped).
  const lastState = useRef(state);
  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.ok) {
      markSaved();
      toast.success({ title: "ההגדרות נשמרו", description: "הגדרות האתר עודכנו בהצלחה." });
    } else {
      toast.error({ title: "ההגדרות לא נשמרו", description: "תקנו את השדות המסומנים ונסו שוב." });
    }
  }, [state, markSaved, toast]);

  return (
    <form action={formAction} {...formProps} className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-6">

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="טלפון" required name="phone" defaultValue={settings.phone} error={errors.phone} />
        <Field label="טלפון נוסף" name="phoneAlt" defaultValue={settings.phoneAlt} error={errors.phoneAlt} />
        <Field label="אימייל" name="email" type="email" defaultValue={settings.email} error={errors.email} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="מקדמה ברירת מחדל ($ לאדם)"
          name="defaultDepositAmount"
          type="number"
          defaultValue={String(settings.defaultDepositAmount)}
          error={errors.defaultDepositAmount}
        />
        <Field
          label="מינימום משתתפים ברירת מחדל"
          name="defaultMinGroupSize"
          type="number"
          defaultValue={String(settings.defaultMinGroupSize)}
          error={errors.defaultMinGroupSize}
        />
        <Field
          label="מועד תשלום היתרה ברירת מחדל (ימים לפני היציאה)"
          name="defaultBalanceDueDays"
          type="number"
          defaultValue={String(settings.defaultBalanceDueDays)}
          error={errors.defaultBalanceDueDays}
        />
        <Field
          label="המועד האחרון לביטול מצד החברה (ימים)"
          name="defaultCompanyCancelDeadlineDays"
          type="number"
          defaultValue={String(settings.defaultCompanyCancelDeadlineDays)}
          error={errors.defaultCompanyCancelDeadlineDays}
        />
        <Field
          label="סף ״מקומות אחרונים״ (מוצג ללקוחות)"
          name="lowSeatsThreshold"
          type="number"
          defaultValue={String(settings.lowSeatsThreshold)}
          error={errors.lowSeatsThreshold}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="adminNotifyEmails">
          כתובות להתראות על הזמנות ופניות
        </label>
        <p className="mt-0.5 text-xs text-ink-muted">
          התראות על הזמנה חדשה ופנייה חדשה נשלחות לכתובות האלה. הפרידו בין כמה כתובות בפסיקים או בשורות.
          השאירו ריק כדי להשתמש בכתובת ברירת המחדל של האתר.
        </p>
        <textarea
          id="adminNotifyEmails"
          name="adminNotifyEmails"
          rows={2}
          defaultValue={(settings.adminNotifyEmails ?? []).join(", ")}
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
        {errors.adminNotifyEmails && (
          <p className="mt-1 text-xs text-terracotta-dark">{errors.adminNotifyEmails[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {pending ? "שומר…" : "שמירת ההגדרות"}
      </button>
      {isDirty && <span className="ms-3"><UnsavedIndicator /></span>}
    </form>
  );
}

function Field({
  label,
  required,
  name,
  type = "text",
  defaultValue,
  error,
}: {
  label: string;
  required?: boolean;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink" htmlFor={name}>
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
      />
      {error && <p className="mt-1 text-xs text-terracotta-dark">{error[0]}</p>}
    </div>
  );
}
