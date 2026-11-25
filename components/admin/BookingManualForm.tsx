"use client";

import { useMemo, useState } from "react";
import { sanitizeLatinName, sanitizeName, sanitizePassport, sanitizePhone, PASSPORT_MAX_LENGTH, NAME_MAX_LENGTH, PHONE_MAX_LENGTH } from "@/lib/validation/fields";
import { useDirtyDraft, useGuardedNavigate, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import {
  availableSeats,
  type BookingStatus,
  type ContactPreference,
  type Departure,
  type Occupancy,
  type RoomConfiguration,
  type Tour,
} from "@/lib/types";
import { calculatePriceBreakdown, formatUsd } from "@/lib/pricing";
import { createManualBooking } from "@/lib/actions/bookings";
import RequiredMark from "@/components/admin/RequiredMark";
import { OCCUPANCY_LABELS } from "@/lib/adminLabels";

interface TravelerDraft {
  firstName: string;
  lastName: string;
  passportFirstName: string;
  passportLastName: string;
  dob: string;
  passport: string;
  occupancy: Occupancy;
  roomWith: string;
  dietary: string;
}

const BLANK_TRAVELER: Omit<TravelerDraft, "occupancy"> = {
  firstName: "",
  lastName: "",
  passportFirstName: "",
  passportLastName: "",
  dob: "",
  passport: "",
  roomWith: "",
  dietary: "",
};

function buildOccupancySlots(room: RoomConfiguration, childCount: number): Occupancy[] {
  const slots: Occupancy[] = [];
  for (let i = 0; i < room.doubleRooms * 2; i++) slots.push("double");
  for (let i = 0; i < room.singleRooms; i++) slots.push("single");
  for (let i = 0; i < room.triples * 3; i++) slots.push("triple");
  for (let i = 0; i < childCount; i++) slots.push("child");
  return slots;
}

export default function BookingManualForm({
  tours,
  departures,
}: {
  tours: Tour[];
  departures: Departure[];
}) {
  const [tourId, setTourId] = useState(tours[0]?.tourId ?? "");
  const tourDepartures = useMemo(
    () => departures.filter((d) => d.tourId === tourId && d.status === "open"),
    [departures, tourId]
  );
  const [departureId, setDepartureId] = useState(tourDepartures[0]?.departureId ?? "");
  const [room, setRoom] = useState<RoomConfiguration>({ doubleRooms: 1, singleRooms: 0, triples: 0 });
  const [childCount, setChildCount] = useState(0);
  const [travelers, setTravelers] = useState<TravelerDraft[]>(() =>
    buildOccupancySlots({ doubleRooms: 1, singleRooms: 0, triples: 0 }, 0).map((occupancy) => ({
      ...BLANK_TRAVELER,
      occupancy,
    }))
  );
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("callback");
  const [status, setStatus] = useState<BookingStatus>("partial_paid");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const toast = useToast();
  const navigate = useGuardedNavigate();
  useDirtyDraft({ tourId, departureId, room, childCount, travelers, contactName, contactEmail, contactPhone, contactPreference, status });

  const tour = tours.find((t) => t.tourId === tourId);
  const totalTravelers = room.doubleRooms * 2 + room.singleRooms + room.triples * 3 + childCount;
  const priceBreakdown = useMemo(
    () => (tour ? calculatePriceBreakdown(tour.pricing, room, childCount) : null),
    [tour, room, childCount]
  );
  const depositAmount = tour ? tour.pricing.depositAmountPerPerson * totalTravelers : 0;

  function selectTour(id: string) {
    setTourId(id);
    const first = departures.find((d) => d.tourId === id && d.status === "open");
    setDepartureId(first?.departureId ?? "");
  }

  function syncTravelerSlots(nextRoom: RoomConfiguration, nextChildCount: number) {
    const slots = buildOccupancySlots(nextRoom, nextChildCount);
    setTravelers((prev) => slots.map((occupancy, i) => ({ ...(prev[i] ?? BLANK_TRAVELER), occupancy })));
  }

  function updateRoom(patch: Partial<RoomConfiguration>) {
    setRoom((prev) => {
      const next = { ...prev, ...patch };
      syncTravelerSlots(next, childCount);
      return next;
    });
  }

  function updateChildCount(value: number) {
    setChildCount(value);
    syncTravelerSlots(room, value);
  }

  function updateTraveler(index: number, patch: Partial<TravelerDraft>) {
    setTravelers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  async function handleSave() {
    setSaving(true);
    setErrors({});

    let result;
    try {
      result = await createManualBooking({
        departureId,
        roomConfiguration: room,
        childCount,
        travelers: travelers.map((t) => ({
          firstName: t.firstName,
          lastName: t.lastName,
          passportFirstName: t.passportFirstName.trim() || undefined,
          passportLastName: t.passportLastName.trim() || undefined,
          dob: t.dob || undefined,
          passport: t.passport || undefined,
          occupancy: t.occupancy,
          roomWith: t.roomWith || undefined,
          dietary: t.dietary || undefined,
        })),
        contactName,
        contactEmail,
        contactPhone: contactPhone || undefined,
        contactPreference,
        status,
      });
    } catch {
      setSaving(false);
      toast.error({ title: "ההזמנה לא נוצרה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }

    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      toast.error({ title: "ההזמנה לא נוצרה", description: "תקנו את הבעיות שמופיעות למטה ונסו שוב." });
      return;
    }

    toast.success({ title: "ההזמנה נוצרה", description: `ההזמנה של ${contactName} נוספה בהצלחה.` });
    await navigate("/admin/bookings", { skipConfirm: true });
  }

  const errorList = Object.values(errors).flat().filter((m): m is string => Boolean(m));

  return (
    <div className="max-w-3xl space-y-6">
      <Section title="טיול ומועד יציאה">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="טיול">
            <select
              value={tourId}
              onChange={(e) => selectTour(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {tours.map((t) => (
                <option key={t.tourId} value={t.tourId}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="מועד יציאה" required error={errors.departureId}>
            <select
              value={departureId}
              onChange={(e) => setDepartureId(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">— בחרו תאריך —</option>
              {tourDepartures.map((d) => (
                <option key={d.departureId} value={d.departureId}>
                  {new Date(d.startDate).toLocaleDateString("he-IL", {
                    timeZone: "UTC",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · נותרו {availableSeats(d)} מקומות
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="משתתפים וחדרים">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField label="חדרים זוגיים" value={room.doubleRooms} onChange={(v) => updateRoom({ doubleRooms: v })} />
          <NumberField label="חדרים ליחיד" value={room.singleRooms} onChange={(v) => updateRoom({ singleRooms: v })} />
          <NumberField label="חדרים לשלושה" value={room.triples} onChange={(v) => updateRoom({ triples: v })} />
          <NumberField label="ילדים" value={childCount} onChange={updateChildCount} />
        </div>
        {priceBreakdown && (
          <p className="mt-4 rounded-lg bg-sand-warm px-4 py-3 text-sm text-ink">
            {totalTravelers === 1 ? "מטייל אחד" : `${totalTravelers} מטיילים`} · סה״כ{" "}
            <span className="font-semibold">{formatUsd(priceBreakdown.grandTotal)}</span> · מקדמה{" "}
            <span className="font-semibold">{formatUsd(depositAmount)}</span>
          </p>
        )}
      </Section>

      <Section title="מטיילים">
        <div className="space-y-4">
          {travelers.map((traveler, index) => (
            <div key={index} className="rounded-lg border border-line p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                מטייל {index + 1} · {OCCUPANCY_LABELS[traveler.occupancy]}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="שם פרטי" required value={traveler.firstName} onChange={(v) => updateTraveler(index, { firstName: sanitizeName(v) })} maxLength={NAME_MAX_LENGTH} />
                <TextField label="שם משפחה" required value={traveler.lastName} onChange={(v) => updateTraveler(index, { lastName: sanitizeName(v) })} maxLength={NAME_MAX_LENGTH} />
                <TextField label="שם פרטי באנגלית (כמו בדרכון)" dir="ltr" value={traveler.passportFirstName} onChange={(v) => updateTraveler(index, { passportFirstName: sanitizeLatinName(v) })} maxLength={NAME_MAX_LENGTH} />
                <TextField label="שם משפחה באנגלית (כמו בדרכון)" dir="ltr" value={traveler.passportLastName} onChange={(v) => updateTraveler(index, { passportLastName: sanitizeLatinName(v) })} maxLength={NAME_MAX_LENGTH} />
                <TextField label="תאריך לידה" type="date" value={traveler.dob} onChange={(v) => updateTraveler(index, { dob: v })} />
                <TextField label="מספר דרכון" value={traveler.passport} onChange={(v) => updateTraveler(index, { passport: sanitizePassport(v) })} maxLength={PASSPORT_MAX_LENGTH} />
                <TextField label="העדפות תזונה" value={traveler.dietary} onChange={(v) => updateTraveler(index, { dietary: v })} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="פרטי קשר וסטטוס">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="שם איש הקשר" required value={contactName} onChange={(v) => setContactName(sanitizeName(v))} maxLength={NAME_MAX_LENGTH} />
          <TextField label="אימייל" required type="email" dir="ltr" value={contactEmail} onChange={setContactEmail} />
          <TextField label="טלפון" type="tel" dir="ltr" value={contactPhone} onChange={(v) => setContactPhone(sanitizePhone(v))} maxLength={PHONE_MAX_LENGTH} inputMode="tel" />
          <Field label="אופן ההמשך">
            <select
              value={contactPreference}
              onChange={(e) => setContactPreference(e.target.value as ContactPreference)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="callback">חזרה טלפונית</option>
              <option value="pay_online">תשלום באתר</option>
            </select>
          </Field>
          <Field label="סטטוס" hint="אין כאן שלב תשלום בכרטיס — סמנו מה קרה בפועל.">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="pending_payment">ממתין לתשלום</option>
              <option value="partial_paid">שולם חלקית</option>
              <option value="paid_in_full">שולם במלואו</option>
            </select>
          </Field>
        </div>
      </Section>

      {errorList.length > 0 && (
        <div className="rounded-lg border border-terracotta/30 bg-terracotta/10 p-3 text-sm text-terracotta-dark">
          {errorList.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving || !departureId}
          title={!departureId ? "בחרו קודם מועד יציאה" : undefined}
          aria-describedby={!departureId ? "booking-blocked-reason" : undefined}
          onClick={handleSave}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
        >
          {saving ? "שומר…" : "יצירת הזמנה"}
        </button>
        {!departureId && (
          <p id="booking-blocked-reason" className="text-xs font-medium text-terracotta-dark">
            בחרו מועד יציאה כדי ליצור את ההזמנה.
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
      {children}
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => {
          const next = Math.max(0, Math.floor(Number(e.target.value) || 0));
          // React's controlled-input sync for type="number" uses loose
          // equality ("01" != 1 is false), so it skips rewriting the DOM
          // and a leading zero sticks around — normalize the raw value here.
          e.target.value = String(next);
          onChange(next);
        }}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
      />
    </Field>
  );
}

function TextField({
  label,
  required,
  value,
  onChange,
  type = "text",
  maxLength,
  inputMode,
  dir,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** "ltr" for English-only fields (passport name, email, phone). */
  dir?: "ltr" | "rtl";
}) {
  return (
    <Field label={label} required={required}>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
      />
    </Field>
  );
}
