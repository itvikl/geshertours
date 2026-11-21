"use client";

import { useActionState } from "react";
import { submitContactLead, type LeadFormState } from "@/lib/actions/leads";

const initialState: LeadFormState = { ok: false, errors: {} };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactLead, initialState);

  if (state.ok) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <p className="text-lg font-bold text-[var(--color-mist)]">
          תודה — ההודעה שלכם התקבלה.
        </p>
        <p className="mt-2 text-[15px] leading-7 text-[var(--color-slate)]">
          נציג מהצוות שלנו יחזור אליכם בהקדם.
        </p>
      </div>
    );
  }

  const errors = state.errors;

  return (
    <form action={formAction} className="glass-panel grid gap-5 rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-[var(--color-mist)]">שלחו לנו הודעה</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם מלא" name="name" required error={errors.name} />
        <Field label="אימייל" name="email" type="email" required error={errors.email} />
        <Field label="טלפון" name="phone" type="tel" />
        <Field label="מדינה" name="country" />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor="message">
          שאלה או הערה
        </label>
        <textarea id="message" name="message" rows={4} className="glacier-field mt-1.5 w-full" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-full bg-[var(--color-ice)] px-7 py-3 text-sm font-bold text-[var(--color-ice-ink)] transition hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        {pending ? "שולח…" : "שליחת הודעה"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-slate)]" htmlFor={name}>
        {label}
        {required && <span className="text-[var(--color-ice)]"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="glacier-field mt-1.5 w-full"
      />
      {error && <p className="mt-1 text-xs text-[var(--color-danger-text)]">{error[0]}</p>}
    </div>
  );
}
