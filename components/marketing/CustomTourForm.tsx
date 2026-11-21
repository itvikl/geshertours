"use client";

import { useActionState, useState } from "react";
import { submitCustomTourLead, type LeadFormState } from "@/lib/actions/leads";

const initialState: LeadFormState = { ok: false, errors: {} };

export default function CustomTourForm() {
  const [state, formAction, pending] = useActionState(submitCustomTourLead, initialState);
  const [travelStartDate, setTravelStartDate] = useState("");
  const [travelEndDate, setTravelEndDate] = useState("");

  if (state.ok) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <p className="text-lg font-bold text-[var(--color-mist)]">
          תודה — הבקשה שלכם התקבלה.
        </p>
        <p className="mt-2 text-[15px] leading-7 text-[var(--color-slate)]">
          נציג מהצוות שלנו יתקשר אליכם כדי להתחיל לתכנן את הטיול.
        </p>
      </div>
    );
  }

  const errors = state.errors;

  return (
    <form action={formAction} className="glass-panel grid gap-5 rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-[var(--color-mist)]">
        ספרו לנו על הקבוצה שלכם
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor="destination">
            יעד
          </label>
          <input id="destination" name="destination" className="glacier-field mt-1.5 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor="groupSize">
            גודל קבוצה משוער
          </label>
          <input
            id="groupSize"
            name="groupSize"
            type="number"
            min={1}
            className="glacier-field mt-1.5 w-full"
          />
          {errors.groupSize && (
            <p className="mt-1 text-xs text-[var(--color-danger-text)]">{errors.groupSize[0]}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor="travelStartDate">
            תאריך יציאה
          </label>
          <input
            id="travelStartDate"
            name="travelStartDate"
            type="date"
            value={travelStartDate}
            max={travelEndDate || undefined}
            onChange={(e) => setTravelStartDate(e.target.value)}
            className="glacier-field mt-1.5 w-full"
          />
          {errors.travelStartDate && (
            <p className="mt-1 text-xs text-[var(--color-danger-text)]">{errors.travelStartDate[0]}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor="travelEndDate">
            תאריך חזרה
          </label>
          <input
            id="travelEndDate"
            name="travelEndDate"
            type="date"
            value={travelEndDate}
            min={travelStartDate || undefined}
            onChange={(e) => setTravelEndDate(e.target.value)}
            className="glacier-field mt-1.5 w-full"
          />
          {errors.travelEndDate && (
            <p className="mt-1 text-xs text-[var(--color-danger-text)]">{errors.travelEndDate[0]}</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor="phone">
          טלפון
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className="glacier-field mt-1.5 w-full"
        />
        {errors.phone && <p className="mt-1 text-xs text-[var(--color-danger-text)]">{errors.phone[0]}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-full bg-[var(--color-ice)] px-7 py-3 text-sm font-bold text-[var(--color-ice-ink)] transition hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        {pending ? "שולח…" : "לבקשת טיול בהתאמה אישית"}
      </button>
    </form>
  );
}
