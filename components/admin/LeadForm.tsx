"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormDirty, useGuardedNavigate, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { createLeadManually, updateLead, type LeadFormState } from "@/lib/actions/leads";
import type { Lead, Tour } from "@/lib/types";

const initialState: LeadFormState = { ok: false, errors: {} };

/** Admin lead form — creates a lead, or edits every field of `lead` when one is passed. */
export default function LeadForm({ tours, lead }: { tours: Tour[]; lead?: Lead }) {
  const [state, formAction, pending] = useActionState(
    lead ? updateLead.bind(null, lead.leadId) : createLeadManually,
    initialState
  );
  const errors = state.ok ? {} : state.errors;
  const navigate = useGuardedNavigate();
  const toast = useToast();
  const { markSaved, formProps } = useFormDirty();

  // React to each completed submission (the initial state is skipped).
  const lastState = useRef(state);
  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.ok) {
      markSaved();
      toast.success(
        lead
          ? { title: "הפנייה עודכנה", description: "השינויים נשמרו." }
          : { title: "הפנייה נוספה", description: "הפנייה החדשה נשמרה ברשימה." }
      );
      void navigate("/admin/leads", { skipConfirm: true });
    } else {
      toast.error({
        title: "הפנייה לא נשמרה",
        description: state.errors.form?.[0] ?? "תקנו את השדות המסומנים ונסו שוב.",
      });
    }
  }, [state, lead, markSaved, toast, navigate]);

  return (
    <form action={formAction} {...formProps} className="grid max-w-2xl gap-5 rounded-xl border border-line bg-white p-6">
      {errors.form && (
        <p className="rounded-lg bg-terracotta-dark/10 px-3 py-2 text-sm text-terracotta-dark">
          {errors.form[0]}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם" name="name" defaultValue={lead?.name} error={errors.name} />
        <Field label="אימייל" name="email" type="email" defaultValue={lead?.email} error={errors.email} />
        <Field label="טלפון" name="phone" type="tel" defaultValue={lead?.phone} error={errors.phone} />
        <Field label="מדינה" name="country" defaultValue={lead?.country} error={errors.country} />
        <Field
          label="יעד"
          name="destination"
          defaultValue={lead?.destination}
          error={errors.destination}
        />
        <Field
          label="גודל הקבוצה"
          name="groupSize"
          type="number"
          defaultValue={lead?.groupSize?.toString()}
          error={errors.groupSize}
        />
        <Field
          label="מתאריך"
          name="travelStartDate"
          type="date"
          defaultValue={lead?.travelStartDate}
          error={errors.travelStartDate}
        />
        <Field
          label="עד תאריך"
          name="travelEndDate"
          type="date"
          defaultValue={lead?.travelEndDate}
          error={errors.travelEndDate}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="tourId">
          טיול (לא חובה)
        </label>
        <select
          id="tourId"
          name="tourId"
          defaultValue={lead?.tourId ?? ""}
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">— ללא —</option>
          {tours.map((tour) => (
            <option key={tour.tourId} value={tour.tourId}>
              {tour.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="message">
          הודעה
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          defaultValue={lead?.message}
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
        {errors.message && <p className="mt-1 text-xs text-terracotta-dark">{errors.message[0]}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="notes">
          הערות
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={lead?.notes}
          placeholder="פנימי בלבד — שיחות, מעקב, מה סוכם…"
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />
        {errors.notes && <p className="mt-1 text-xs text-terracotta-dark">{errors.notes[0]}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="status">
          סטטוס
        </label>
        <select
          id="status"
          name="status"
          defaultValue={lead?.status ?? "new"}
          className="mt-1.5 w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="new">חדשה</option>
          <option value="contacted">נוצר קשר</option>
          <option value="converted">הפכה להזמנה</option>
          <option value="closed">סגורה</option>
        </select>
        {errors.status && <p className="mt-1 text-xs text-terracotta-dark">{errors.status[0]}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {pending ? "שומר…" : lead ? "שמירת שינויים" : "שמירת הפנייה"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink" htmlFor={name}>
        {label}
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
