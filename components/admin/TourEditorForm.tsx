"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Departure,
  ItineraryDay,
  Staff,
  Tour,
  TourDocument,
  TourInfoCard,
  TourInfoField,
  TourStatus,
  TourVersion,
} from "@/lib/types";
import { COUNTRIES } from "@/lib/countries";
import { countryLabel } from "@/lib/countryNames";
import { TOUR_STATUS_LABELS } from "@/lib/adminLabels";
import { getPublishChecklist, isReadyToPublish } from "@/lib/validation/tourChecklist";
import { saveTour } from "@/lib/actions/tours";
import DuplicateTourButton from "@/components/admin/DuplicateTourButton";
import PdfUploadButton from "@/components/admin/PdfUploadButton";
import ImageField, { ImageGalleryField } from "@/components/admin/ImageField";
import ImageFocusDialog from "@/components/admin/ImageFocusDialog";
import { withImageFocus } from "@/lib/imageFocus";
import { useConfirm, useDirtyDraft, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import UnsavedIndicator from "@/components/admin/feedback/UnsavedIndicator";
import RequiredMark from "@/components/admin/RequiredMark";
import { DEFAULT_CANCELLATION_POLICY_TEXT } from "@/lib/cancellationPolicy";
import { formatUsd, singleSupplementOf } from "@/lib/pricing";
import { newVersionId, versionDifferences } from "@/lib/tourVersions";

const BLANK_TOUR: Tour = {
  tourId: "",
  slug: "",
  slugHistory: [],
  title: "",
  summary: "",
  description: "",
  heroImage: "",
  gallery: [],
  countries: [],
  travelStyle: "land",
  themeTags: [],
  durationDays: 7,
  minGroupSize: 10,
  flightsIncluded: false,
  isSpecialOffer: false,
  inclusions: [],
  exclusions: [],
  importantToKnow: [],
  infoCards: [],
  pricing: {
    pricePerPersonDouble: 0,
    pricePerPersonSingle: 0,
    depositAmountPerPerson: 0,
    balanceDueDaysBeforeDeparture: 60,
  },
  kashrutDetails: {
    supervisionLevel: "",
    patYisrael: true,
    chalavYisrael: true,
  },
  itineraryDays: [],
  status: "draft",
  cancellationPolicy: DEFAULT_CANCELLATION_POLICY_TEXT,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Moves the legacy importantToKnow list into its own info card, so it's edited like any other card. */
function withInfoCards(tour: Tour): Tour {
  const legacy = (tour.importantToKnow ?? []).filter((item) => item.trim());
  if (legacy.length === 0) return { ...tour, infoCards: tour.infoCards ?? [] };
  const card: TourInfoCard = {
    cardId: crypto.randomUUID(),
    title: "חשוב לדעת",
    fields: [],
    items: legacy,
  };
  return { ...tour, importantToKnow: [], infoCards: [card, ...(tour.infoCards ?? [])] };
}

function newInfoField(): TourInfoField {
  return { fieldId: crypto.randomUUID(), label: "", value: "" };
}

function cleanFields(fields: TourInfoField[]): TourInfoField[] {
  return fields
    .map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim() }))
    .filter((f) => f.label || f.value);
}

/** Trims/drops blank entries — the form keeps raw (possibly-blank) array entries while typing. */
function cleanTour(tour: Tour): Tour {
  const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);
  return {
    ...tour,
    gallery: clean(tour.gallery),
    imageFocus: (tour.imageFocus ?? []).filter((f) => f.url === tour.heroImage || tour.gallery.includes(f.url)),
    themeTags: clean(tour.themeTags),
    inclusions: clean(tour.inclusions),
    exclusions: clean(tour.exclusions),
    importantToKnow: clean(tour.importantToKnow ?? []),
    kashrutDetails: {
      ...tour.kashrutDetails,
      title: tour.kashrutDetails.title?.trim() || undefined,
      extraFields: cleanFields(tour.kashrutDetails.extraFields ?? []),
    },
    infoCards: (tour.infoCards ?? []).map((card) => ({
      ...card,
      title: card.title.trim(),
      fields: cleanFields(card.fields),
      notes: card.notes?.trim() || undefined,
      items: clean(card.items),
    })),
    documents: (tour.documents ?? []).map((doc) => ({ ...doc, title: doc.title.trim() })),
    itineraryDays: cleanDays(tour.itineraryDays),
    airline: tour.airline?.trim() || undefined,
    mainVersionLabel: tour.mainVersionLabel?.trim() || undefined,
    versions: (tour.versions ?? []).map((version) => {
      const kashrut = version.kashrutDetails;
      return {
        ...version,
        label: version.label.trim(),
        airline: version.airline?.trim() || undefined,
        notes: version.notes?.trim() || undefined,
        inclusions: clean(version.inclusions ?? []),
        exclusions: clean(version.exclusions ?? []),
        itineraryDays: version.itineraryDays?.length ? cleanDays(version.itineraryDays) : undefined,
        kashrutDetails: kashrut?.supervisionLevel.trim()
          ? { ...kashrut, notes: kashrut.notes?.trim() || undefined }
          : undefined,
      };
    }),
  };

  function cleanDays(days: ItineraryDay[]): ItineraryDay[] {
    return days.map((day, index) => ({
      ...day,
      dayNumber: index + 1,
      meals: clean(day.meals),
      attractions: clean(day.attractions ?? []),
    }));
  }
}

/**
 * Days are edited and keyed by `dayId`, so ids must be unique. Migrated tours took
 * the id from the legacy "Day N" label, and some legacy pages repeat a number —
 * editing one such day then changed its twin too. Give any repeat a fresh id
 * (persisted on the next save).
 */
function withUniqueDayIds(days: ItineraryDay[]): ItineraryDay[] {
  const seen = new Set<string>();
  return days.map((day) => {
    if (!day.dayId || seen.has(day.dayId)) day = { ...day, dayId: crypto.randomUUID() };
    seen.add(day.dayId);
    return day;
  });
}

type Viewport = "desktop" | "tablet" | "mobile";
const VIEWPORT_LABEL: Record<Viewport, string> = {
  desktop: "מחשב",
  tablet: "טאבלט",
  mobile: "נייד",
};

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

export default function TourEditorForm({
  mode,
  tourId,
  initialTour,
  departures = [],
  guides = [],
}: {
  mode: "create" | "edit";
  tourId?: string;
  initialTour?: Tour;
  departures?: Departure[];
  guides?: Staff[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Tour>(() =>
    initialTour
      ? withInfoCards({
          ...initialTour,
          cancellationPolicy: initialTour.cancellationPolicy ?? DEFAULT_CANCELLATION_POLICY_TEXT,
          itineraryDays: withUniqueDayIds(initialTour.itineraryDays),
        })
      : BLANK_TOUR
  );
  const [savedTourId, setSavedTourId] = useState<string | undefined>(tourId);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const toast = useToast();
  // The photo whose crop focus is being chosen (opens the picker dialog).
  const [focusUrl, setFocusUrl] = useState<string | null>(null);
  const confirm = useConfirm();
  const { isDirty, markSaved } = useDirtyDraft(draft);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameReady = useRef(false);

  const cleaned = useMemo(() => cleanTour(draft), [draft]);
  const checklist = useMemo(() => getPublishChecklist(cleaned), [cleaned]);
  const readyToPublish = useMemo(() => isReadyToPublish(cleaned), [cleaned]);
  const missing = useMemo(() => checklist.filter((item) => !item.ok), [checklist]);
  const isPublished = draft.status === "published";
  const isArchived = draft.status === "archived";
  const blockedWhat = isPublished ? "לשמור שינויים" : "לפרסם";
  // Set when someone clicks Publish while it is blocked: from then on every
  // missing field says so, instead of the button silently doing nothing.
  const [showMissing, setShowMissing] = useState(false);

  /** Props for a field the publish checklist requires: asterisk, id to scroll to, and the "missing" flag. */
  function req(key: string) {
    return { required: true, fieldKey: key, flagged: showMissing && missing.some((item) => item.key === key) };
  }

  // Publishing — or saving changes to a tour that is already live — needs the
  // checklist, so a live tour can never be left incomplete (e.g. no deposit).
  function handleGuardedSave(status?: TourStatus) {
    if (readyToPublish) {
      handleSave(status);
      return;
    }
    setShowMissing(true);
    document.getElementById(`field-${missing[0].key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Taking a live tour offline is its own deliberate action, never a side
  // effect of saving.
  async function handleUnpublish() {
    const ok = await confirm({
      title: "להסיר את הטיול מהאתר?",
      description: "הטיול ייעלם מהאתר, והדף שלו יציג ״לא נמצא״ עד שתפרסמו אותו שוב.",
      confirmLabel: "הסרה מהאתר",
      tone: "danger",
    });
    if (ok) handleSave("draft");
  }

  function postPreview() {
    if (!frameReady.current) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "tour-preview-update", tour: cleaned, departures, guides },
      window.location.origin
    );
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "tour-preview-frame-ready") return;
      frameReady.current = true;
      postPreview();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    postPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned, departures, guides]);

  function set<K extends keyof Tour>(key: K, value: Tour[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setPricing<K extends keyof Tour["pricing"]>(key: K, value: Tour["pricing"][K]) {
    setDraft((prev) => ({ ...prev, pricing: { ...prev.pricing, [key]: value } }));
  }

  function setKashrut<K extends keyof Tour["kashrutDetails"]>(
    key: K,
    value: Tour["kashrutDetails"][K]
  ) {
    setDraft((prev) => ({ ...prev, kashrutDetails: { ...prev.kashrutDetails, [key]: value } }));
  }

  function handleTitleChange(value: string) {
    setDraft((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  function addItineraryDay() {
    const day: ItineraryDay = {
      dayId: crypto.randomUUID(),
      dayNumber: draft.itineraryDays.length + 1,
      title: "",
      description: "",
      meals: [],
      attractions: [],
    };
    set("itineraryDays", [...draft.itineraryDays, day]);
  }

  function updateItineraryDay(dayId: string, patch: Partial<ItineraryDay>) {
    set(
      "itineraryDays",
      draft.itineraryDays.map((d) => (d.dayId === dayId ? { ...d, ...patch } : d))
    );
  }

  function removeItineraryDay(dayId: string) {
    set(
      "itineraryDays",
      draft.itineraryDays.filter((d) => d.dayId !== dayId)
    );
  }

  const infoCards = draft.infoCards ?? [];

  function setInfoCards(cards: TourInfoCard[]) {
    set("infoCards", cards);
  }

  function addInfoCard() {
    setInfoCards([...infoCards, { cardId: crypto.randomUUID(), title: "", fields: [], items: [] }]);
  }

  function updateInfoCard(cardId: string, patch: Partial<TourInfoCard>) {
    setInfoCards(infoCards.map((c) => (c.cardId === cardId ? { ...c, ...patch } : c)));
  }

  function moveInfoCard(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= infoCards.length) return;
    const next = [...infoCards];
    [next[index], next[target]] = [next[target], next[index]];
    setInfoCards(next);
  }

  function removeInfoCard(cardId: string) {
    setInfoCards(infoCards.filter((c) => c.cardId !== cardId));
  }

  const documents = draft.documents ?? [];

  function setDocuments(next: TourDocument[]) {
    set("documents", next);
  }

  function addDocuments(files: { url: string; fileName: string }[]) {
    setDocuments([
      ...documents,
      ...files.map((file) => ({
        documentId: crypto.randomUUID(),
        // "Costa-Rica-8-days-ECSR.pdf" -> "Costa Rica 8 days ECSR": a readable title to start from, editable below.
        title: file.fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim(),
        url: file.url,
        fileName: file.fileName,
      })),
    ]);
  }

  function updateDocumentTitle(documentId: string, title: string) {
    setDocuments(documents.map((d) => (d.documentId === documentId ? { ...d, title } : d)));
  }

  function moveDocument(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= documents.length) return;
    const next = [...documents];
    [next[index], next[target]] = [next[target], next[index]];
    setDocuments(next);
  }

  function removeDocument(documentId: string) {
    setDocuments(documents.filter((d) => d.documentId !== documentId));
  }

  async function handleSave(status?: TourStatus) {
    const wasPublished = draft.status === "published";
    setSaving(true);
    setErrors({});

    const payload: Tour = status ? { ...cleaned, status } : cleaned;
    let result;
    try {
      result = await saveTour(payload, savedTourId);
    } catch {
      setSaving(false);
      toast.error({ title: "השמירה נכשלה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }

    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      const count = Object.values(result.errors).filter(Boolean).length;
      toast.error({
        title: "הטיול לא נשמר",
        description: `${count === 1 ? "שדה אחד דורש" : `${count} שדות דורשים`} תיקון — בדקו את השדות המסומנים.`,
      });
      return;
    }

    if (status) set("status", status);
    markSaved(status ? { ...draft, status } : draft);
    setSavedTourId(result.tourId);
    setSavedAt(new Date());
    setSaving(false);
    toast.success(
      status === "published"
        ? { title: "הטיול פורסם", description: `״${payload.title}״ מוצג עכשיו באתר.` }
        : status === "draft" && wasPublished
          ? { title: "הטיול הוסר מהאתר", description: `״${payload.title}״ כבר לא מוצג באתר.` }
        : mode === "create"
          ? { title: "הטיול נוצר", description: "נשמר כטיוטה — אפשר להמשיך לערוך." }
          : { title: "השינויים נשמרו", description: `״${payload.title}״ נשמר בהצלחה.` }
    );

    if (mode === "create") {
      router.replace(`/admin/tours/${result.tourId}`);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Form column */}
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link href="/admin/tours" className="text-sm font-medium text-ink-muted hover:text-ink">
              → טיולים
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              {mode === "create" ? "טיול חדש" : draft.title || "טיול ללא שם"}
            </h1>
          </div>
          {savedTourId && <DuplicateTourButton tourId={savedTourId} />}
        </div>

        <PublishChecklist items={checklist} />

        <div className="space-y-8">
          <Section title="פרטים בסיסיים">
            <Field label="כותרת" {...req("title")} error={errors.title}>
              <input
                className={inputClass}
                value={draft.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </Field>
            <Field label="כתובת (slug)" hint="/tours/… · באנגלית" {...req("slug")} error={errors.slug}>
              <input
                className={inputClass}
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="תקציר" {...req("summary")} error={errors.summary}>
              <textarea
                className={inputClass}
                rows={2}
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </Field>
            <Field label="תיאור מלא">
              <textarea
                className={inputClass}
                rows={5}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field
              label="מדינות"
              hint="Ctrl/Cmd + לחיצה לבחירת כמה מדינות"
              {...req("countries")}
              error={errors.countries}
            >
              <select
                multiple
                size={8}
                className={inputClass}
                value={draft.countries}
                onChange={(e) =>
                  set(
                    "countries",
                    Array.from(e.target.selectedOptions, (option) => option.value)
                  )
                }
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {countryLabel(country)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="סגנון טיול">
                <select
                  className={inputClass}
                  value={draft.travelStyle}
                  onChange={(e) => set("travelStyle", e.target.value as Tour["travelStyle"])}
                >
                  <option value="land">טיול יבשתי</option>
                  <option value="luxury">יוקרה</option>
                  <option value="cruise">שייט</option>
                  <option value="seminar">סמינר</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="משך (ימים)" error={errors.durationDays}>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={draft.durationDays}
                  onChange={(e) => set("durationDays", Number(e.target.value))}
                />
              </Field>
              <Field label="גודל קבוצה מינימלי">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.minGroupSize}
                  onChange={(e) => set("minGroupSize", Number(e.target.value))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.flightsIncluded}
                onChange={(e) => set("flightsIncluded", e.target.checked)}
              />
              כולל טיסות
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.isSpecialOffer ?? false}
                onChange={(e) => set("isSpecialOffer", e.target.checked)}
              />
              מבצע — הצגת הטיול בדף המבצעים
            </label>
            <p className="text-xs text-ink-muted">
              סטטוס היציאה (מותנית / מובטחת) נקבע לכל מועד יציאה בנפרד — במסך
              מועדי היציאה של הטיול.
            </p>
          </Section>

          <Section title="תמונות">
            <Field label="תמונה ראשית" {...req("heroImage")} error={errors.heroImage}>
              <ImageField
                shape="wide"
                value={draft.heroImage || undefined}
                onChange={(url) => set("heroImage", url ?? "")}
                focusOf={(url) => draft.imageFocus?.find((f) => f.url === url)}
                onSetFocus={setFocusUrl}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">גלריה</p>
              <ImageGalleryField
                values={draft.gallery}
                onChange={(urls) => set("gallery", urls)}
                focusOf={(url) => draft.imageFocus?.find((f) => f.url === url)}
                onSetFocus={setFocusUrl}
              />
            </div>
          </Section>

          <Section title="קבצים להורדה (PDF)">
            <p className="text-xs text-ink-muted">
              מסלולים או חוברות שמבקרים יכולים להוריד מדף הטיול. PDF בלבד, עד 9MB לקובץ.
            </p>
            {documents.length > 0 && (
              <ul className="space-y-3">
                {documents.map((doc, index) => (
                  <li key={doc.documentId} className="rounded-lg border border-line p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <input
                          className={inputClass}
                          value={doc.title}
                          placeholder="הכותרת שתוצג למבקרים"
                          aria-label={`כותרת עבור ${doc.fileName}`}
                          onChange={(e) => updateDocumentTitle(doc.documentId, e.target.value)}
                        />
                        {errors[`documents.${index}.title`]?.map((message) => (
                          <p key={message} className="mt-1 text-xs font-medium text-terracotta-dark">
                            {message}
                          </p>
                        ))}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-xs text-ink-muted underline hover:text-ink"
                        >
                          {doc.fileName}
                        </a>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveDocument(index, -1)}
                          aria-label="הזזה למעלה"
                          className="rounded px-1.5 text-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === documents.length - 1}
                          onClick={() => moveDocument(index, 1)}
                          aria-label="הזזה למטה"
                          className="rounded px-1.5 text-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.documentId)}
                          className="ms-1 rounded px-1.5 text-xs font-semibold text-terracotta-dark hover:underline"
                        >
                          הסרה
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <PdfUploadButton label={documents.length > 0 ? "העלאת PDF נוסף" : "העלאת PDF"} onUploaded={addDocuments} />
          </Section>

          <Section title="מחירים ומדיניות">
            <div className="grid grid-cols-2 gap-4">
              <Field label="מחיר לאדם (חדר זוגי)" {...req("pricePerPersonDouble")}>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.pricing.pricePerPersonDouble}
                  onChange={(e) => setPricing("pricePerPersonDouble", Number(e.target.value))}
                />
              </Field>
              <Field
                label="מחיר לאדם (חדר ליחיד)"
                hint={`המחיר המלא לחדר פרטי, לא תוספת · תוספת ליחיד +${formatUsd(singleSupplementOf(draft.pricing))}`}
              >
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.pricing.pricePerPersonSingle}
                  onChange={(e) => setPricing("pricePerPersonSingle", Number(e.target.value))}
                />
              </Field>
              <Field label="מחיר לאדם (חדר לשלושה)" hint="לא חובה">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.pricing.pricePerPersonTriple ?? ""}
                  onChange={(e) =>
                    setPricing(
                      "pricePerPersonTriple",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </Field>
              <Field label="מחיר לילד/ה" hint="לא חובה">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.pricing.childPrice ?? ""}
                  onChange={(e) =>
                    setPricing("childPrice", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </Field>
              <Field label="מקדמה לאדם" hint="0 = אין צורך במקדמה">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.pricing.depositAmountPerPerson}
                  onChange={(e) => setPricing("depositAmountPerPerson", Number(e.target.value))}
                />
              </Field>
              <Field label="מועד תשלום היתרה (ימים לפני היציאה)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.pricing.balanceDueDaysBeforeDeparture}
                  onChange={(e) =>
                    setPricing("balanceDueDaysBeforeDeparture", Number(e.target.value))
                  }
                />
              </Field>
            </div>
            <Field
              label="מדיניות ביטול"
              hint="מוצגת בדף הטיול, תנאי אחד בכל שורה — לתצוגה בלבד, לא משנה את חישובי ההחזר"
            >
              <textarea
                className={inputClass}
                rows={6}
                value={draft.cancellationPolicy ?? ""}
                onChange={(e) => set("cancellationPolicy", e.target.value)}
              />
            </Field>
            <button
              type="button"
              onClick={() => set("cancellationPolicy", DEFAULT_CANCELLATION_POLICY_TEXT)}
              className="text-xs font-medium text-navy hover:text-navy-light"
            >
              חזרה למדיניות הרגילה
            </button>
          </Section>

          <Section title="כרטיס כשרות">
            <Field label="כותרת הכרטיס" hint="ריק = ״כשרות״">
              <input
                className={inputClass}
                placeholder="כשרות"
                value={draft.kashrutDetails.title ?? ""}
                onChange={(e) => setKashrut("title", e.target.value)}
              />
            </Field>
            <Field label="רמת הכשרות" {...req("supervisionLevel")} error={errors["kashrutDetails.supervisionLevel"]}>
              <input
                className={inputClass}
                value={draft.kashrutDetails.supervisionLevel}
                onChange={(e) => setKashrut("supervisionLevel", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="פת ישראל">
                <KashrutSelect
                  value={draft.kashrutDetails.patYisrael}
                  onChange={(v) => setKashrut("patYisrael", v)}
                />
              </Field>
              <Field label="חלב ישראל">
                <KashrutSelect
                  value={draft.kashrutDetails.chalavYisrael}
                  onChange={(v) => setKashrut("chalavYisrael", v)}
                />
              </Field>
            </div>
            <Field label="הערות" hint="לא חובה — שורה ריקה פותחת פסקה חדשה">
              <textarea
                className={inputClass}
                rows={5}
                value={draft.kashrutDetails.notes ?? ""}
                onChange={(e) => setKashrut("notes", e.target.value)}
              />
            </Field>
            <InfoFieldsEditor
              label="כותרות משנה נוספות"
              fields={draft.kashrutDetails.extraFields ?? []}
              onChange={(fields) => setKashrut("extraFields", fields)}
            />
          </Section>

          <Section title="כרטיסי מידע נוספים">
            <p className="text-xs text-ink-muted">
              כל כרטיס מוצג בדף הטיול אחרי כרטיס הכשרות, לפי הסדר הזה.
            </p>
            <div className="space-y-4">
              {infoCards.map((card, index) => (
                <InfoCardEditor
                  key={card.cardId}
                  card={card}
                  index={index}
                  count={infoCards.length}
                  titleError={errors[`infoCards.${index}.title`]}
                  onChange={(patch) => updateInfoCard(card.cardId, patch)}
                  onMove={(delta) => moveInfoCard(index, delta)}
                  onRemove={() => removeInfoCard(card.cardId)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addInfoCard}
              className="rounded-lg border border-dashed border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-navy hover:text-navy"
            >
              + הוספת כרטיס
            </button>
          </Section>

          <Section title="כלול / לא כלול">
            <ListTextarea
              label="כלול במחיר (פריט בכל שורה)"
              value={draft.inclusions}
              onChange={(v) => set("inclusions", v)}
            />
            <ListTextarea
              label="לא כלול במחיר (פריט בכל שורה)"
              value={draft.exclusions}
              onChange={(v) => set("exclusions", v)}
            />
            <ListTextarea
              label="תגיות נושא (תגית בכל שורה)"
              value={draft.themeTags}
              onChange={(v) => set("themeTags", v)}
            />
          </Section>

          <Section title="מסלול" {...req("itinerary")}>
            <div className="space-y-4">
              {draft.itineraryDays.map((day, index) => (
                <ItineraryDayEditor
                  key={day.dayId}
                  day={day}
                  index={index}
                  onChange={(patch) => updateItineraryDay(day.dayId, patch)}
                  onRemove={() => removeItineraryDay(day.dayId)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addItineraryDay}
              className="mt-3 rounded-lg border border-dashed border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-navy hover:text-navy"
            >
              + הוספת יום
            </button>
          </Section>

          <Section title="גרסאות">
            <VersionsSection
              draft={draft}
              departures={departures}
              errors={errors}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            />
          </Section>

          <Section title="SEO">
            <Field label="כותרת SEO" hint="לא חובה — ברירת המחדל היא כותרת הטיול">
              <input
                className={inputClass}
                value={draft.seoTitle ?? ""}
                onChange={(e) => set("seoTitle", e.target.value)}
              />
            </Field>
            <Field label="תיאור SEO" hint="לא חובה — ברירת המחדל היא התקציר">
              <textarea
                className={inputClass}
                rows={2}
                value={draft.seoDescription ?? ""}
                onChange={(e) => set("seoDescription", e.target.value)}
              />
            </Field>
          </Section>
        </div>

        {/* Save bar */}
        <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 rounded-xl border border-line bg-white/95 p-4 backdrop-blur">
          <div className="text-sm">
            <StatusBadge status={draft.status} />
            {savedAt && (
              <span className="ms-2 text-ink-muted">
                נשמר ב-{savedAt.toLocaleTimeString("he-IL")}
              </span>
            )}
            {isDirty && <span className="ms-2"><UnsavedIndicator /></span>}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-2">
              {/* Left button depends on the tour's state: a live tour is never un-published by a save. */}
              {isPublished ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleUnpublish}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sand-warm disabled:opacity-60"
                >
                  הסרה מהאתר
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => (isArchived ? handleSave() : handleSave("draft"))}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sand-warm disabled:opacity-60"
                >
                  {isArchived ? "שמירת שינויים" : "שמירת טיוטה"}
                </button>
              )}
              {/* aria-disabled rather than disabled: a blocked click scrolls to the first missing field instead of doing nothing. */}
              <button
                type="button"
                disabled={saving}
                aria-disabled={!readyToPublish}
                aria-describedby={!readyToPublish ? "publish-blocked-reason" : undefined}
                title={!readyToPublish ? `אי אפשר עדיין ${blockedWhat} — חסר: ${missing.map((m) => m.label).join(", ")}` : undefined}
                onClick={() => handleGuardedSave(isPublished ? undefined : "published")}
                className={`rounded-lg bg-olive px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40 ${
                  readyToPublish ? "hover:opacity-90" : "cursor-not-allowed opacity-40"
                }`}
              >
                {saving ? "שומר…" : isPublished ? "שמירת שינויים" : "פרסום"}
              </button>
            </div>
            {!readyToPublish && (
              <p id="publish-blocked-reason" className="max-w-md text-end text-xs font-medium text-terracotta-dark">
                אי אפשר עדיין {blockedWhat} — חסר: {missing.map((m) => m.label).join(", ")}.
                {isPublished && " טיול שמוצג באתר חייב להישאר שלם; מלאו את השדות, או הסירו אותו מהאתר כדי לשמור כטיוטה."}
              </p>
            )}
          </div>
        </div>
      </div>

      {focusUrl && (
        <ImageFocusDialog
          src={focusUrl}
          value={draft.imageFocus?.find((f) => f.url === focusUrl)}
          onChange={(point) => set("imageFocus", withImageFocus(draft.imageFocus, focusUrl, point))}
          onClose={() => setFocusUrl(null)}
        />
      )}

      {/* Preview column */}
      <div className="xl:sticky xl:top-6 xl:self-start">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-line bg-white p-1">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewport(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewport === v ? "bg-navy text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {VIEWPORT_LABEL[v]}
              </button>
            ))}
          </div>
          {savedTourId ? (
            <a
              href={`/admin/tours/${savedTourId}/preview`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-navy hover:text-navy-light"
            >
              תצוגה מקדימה מלאה ↗
            </a>
          ) : (
            <span className="text-sm text-ink-muted" title="שמרו את הטיול פעם אחת כדי להפעיל את האפשרות.">
              תצוגה מקדימה מלאה ↗
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-[#0a0e1a] shadow-inner">
          <div
            className="mx-auto h-[80vh] overflow-y-auto transition-[width] duration-200"
            style={{ width: VIEWPORT_WIDTH[viewport] }}
          >
            <iframe
              ref={iframeRef}
              src="/admin/preview-frame"
              title="תצוגה מקדימה של הטיול"
              className="h-full w-full border-0"
              onLoad={() => {
                frameReady.current = false;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2 text-[15px] text-ink outline-none focus:border-navy";

function Section({
  title,
  children,
  required,
  fieldKey,
  flagged,
}: {
  title: string;
  children: React.ReactNode;
  required?: boolean;
  fieldKey?: string;
  flagged?: boolean;
}) {
  return (
    <section
      id={fieldKey ? `field-${fieldKey}` : undefined}
      className={`rounded-xl border bg-white p-5 ${flagged ? "border-terracotta" : "border-line"}`}
    >
      <h2 className="mb-4 text-base font-bold text-ink">
        {title}
        {required && <RequiredMark />}
      </h2>
      <div className="space-y-4">{children}</div>
      {flagged && <p className="mt-3 text-xs font-medium text-terracotta-dark">חובה לפרסום</p>}
    </section>
  );
}


function Field({
  label,
  hint,
  error,
  required,
  fieldKey,
  flagged,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  /** Needed before the tour can be published — shown with an asterisk. */
  required?: boolean;
  /** Anchor id (`field-<fieldKey>`) the Publish button scrolls to when this is missing. */
  fieldKey?: string;
  /** Required and still empty after a blocked Publish click. */
  flagged?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={fieldKey ? `field-${fieldKey}` : undefined}>
      <label
        className={`mb-1.5 flex items-baseline justify-between text-sm font-medium ${
          flagged ? "text-terracotta-dark" : "text-ink"
        }`}
      >
        <span>
          {label}
          {required && <RequiredMark />}
        </span>
        {hint && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
      </label>
      {children}
      {flagged && <p className="mt-1 text-xs font-medium text-terracotta-dark">חובה לפרסום</p>}
      {error?.map((message) => (
        <p key={message} className="mt-1 text-xs font-medium text-terracotta-dark">
          {message}
        </p>
      ))}
    </div>
  );
}

function ListTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Field label={label}>
      <textarea
        className={inputClass}
        rows={4}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </Field>
  );
}

function KashrutSelect({
  value,
  onChange,
}: {
  value: boolean | "not_guaranteed";
  onChange: (value: boolean | "not_guaranteed") => void;
}) {
  const stringValue = value === true ? "true" : value === false ? "false" : "not_guaranteed";
  return (
    <select
      className={inputClass}
      value={stringValue}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "true" ? true : v === "false" ? false : "not_guaranteed");
      }}
    >
      <option value="true">מובטח</option>
      <option value="not_guaranteed">לא מובטח בכל היעדים</option>
      <option value="false">לא מוצע</option>
    </select>
  );
}

function InfoFieldsEditor({
  label,
  fields,
  onChange,
}: {
  label: string;
  fields: TourInfoField[];
  onChange: (fields: TourInfoField[]) => void;
}) {
  function update(fieldId: string, patch: Partial<TourInfoField>) {
    onChange(fields.map((f) => (f.fieldId === fieldId ? { ...f, ...patch } : f)));
  }
  return (
    <Field label={label} hint="כותרת משנה + טקסט, כמו ״פת ישראל״">
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.fieldId} className="flex items-start gap-2">
            <input
              className={`${inputClass} sm:max-w-[40%]`}
              placeholder="כותרת משנה"
              value={field.label}
              onChange={(e) => update(field.fieldId, { label: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="טקסט"
              value={field.value}
              onChange={(e) => update(field.fieldId, { value: e.target.value })}
            />
            <button
              type="button"
              onClick={() => onChange(fields.filter((f) => f.fieldId !== field.fieldId))}
              className="shrink-0 px-2 py-2 text-xs font-semibold text-terracotta-dark hover:underline"
              aria-label="הסרת כותרת המשנה"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...fields, newInfoField()])}
          className="text-xs font-medium text-navy hover:text-navy-light"
        >
          + הוספת כותרת משנה
        </button>
      </div>
    </Field>
  );
}

function InfoCardEditor({
  card,
  index,
  count,
  titleError,
  onChange,
  onMove,
  onRemove,
}: {
  card: TourInfoCard;
  index: number;
  count: number;
  titleError?: string[];
  onChange: (patch: Partial<TourInfoCard>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const moveClass =
    "rounded px-1.5 text-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted";
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-navy">{card.title.trim() || `כרטיס ${index + 1}`}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className={moveClass}
            aria-label="הזזת הכרטיס למעלה"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            className={moveClass}
            aria-label="הזזת הכרטיס למטה"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-terracotta-dark hover:underline"
          >
            הסרה
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <Field label="כותרת הכרטיס" error={titleError}>
          <input
            className={inputClass}
            placeholder="למשל: חשוב לדעת"
            value={card.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
        <InfoFieldsEditor
          label="Sub-titles"
          fields={card.fields}
          onChange={(fields) => onChange({ fields })}
        />
        <Field label="הערות" hint="לא חובה — שורה ריקה פותחת פסקה חדשה">
          <textarea
            className={inputClass}
            rows={3}
            value={card.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </Field>
        <ListTextarea
          label="נקודות (נקודה בכל שורה)"
          value={card.items}
          onChange={(items) => onChange({ items })}
        />
      </div>
    </div>
  );
}

function ItineraryDayEditor({
  day,
  index,
  onChange,
  onRemove,
}: {
  day: ItineraryDay;
  index: number;
  onChange: (patch: Partial<ItineraryDay>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-navy">יום {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-semibold text-terracotta-dark hover:underline"
        >
          הסרה
        </button>
      </div>
      <div className="space-y-3">
        <input
          className={inputClass}
          placeholder="כותרת היום"
          value={day.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <textarea
          className={inputClass}
          rows={2}
          placeholder="תיאור"
          value={day.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="אטרקציות (מופרדות בפסיקים)"
          value={(day.attractions ?? []).join(", ")}
          onChange={(e) =>
            onChange({ attractions: e.target.value.split(",").map((s) => s.trim()) })
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className={inputClass}
            placeholder="ארוחות (מופרדות בפסיקים)"
            value={day.meals.join(", ")}
            onChange={(e) => onChange({ meals: e.target.value.split(",").map((s) => s.trim()) })}
          />
          <input
            className={inputClass}
            placeholder="לינה"
            value={day.accommodation ?? ""}
            onChange={(e) => onChange({ accommodation: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/** "" → undefined, else a whole non-negative number. */
function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Math.max(0, Math.round(Number(value)));
}

function copyDays(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((day) => ({ ...day, dayId: crypto.randomUUID() }));
}

/**
 * Tour versions (lib/tourVersions.ts): variants that share this tour's page
 * and photos. Each version stores only what differs; a blank field means
 * "same as the main tour". Each date picks its version in the date editor.
 */
function VersionsSection({
  draft,
  departures,
  onChange,
  errors,
}: {
  draft: Tour;
  departures: Departure[];
  onChange: (patch: Partial<Tour>) => void;
  errors: Record<string, string[] | undefined>;
}) {
  const versions = draft.versions ?? [];

  function setVersions(next: TourVersion[]) {
    onChange({ versions: next });
  }
  function update(versionId: string, patch: Partial<TourVersion>) {
    setVersions(versions.map((v) => (v.versionId === versionId ? { ...v, ...patch } : v)));
  }
  function updatePricing(version: TourVersion, key: "pricePerPersonDouble" | "pricePerPersonSingle" | "depositAmountPerPerson", value: string) {
    update(version.versionId, { pricing: { ...version.pricing, [key]: optionalNumber(value) } });
  }
  function moveDay(version: TourVersion, index: number, delta: -1 | 1) {
    const days = [...(version.itineraryDays ?? [])];
    const target = index + delta;
    if (target < 0 || target >= days.length) return;
    [days[index], days[target]] = [days[target], days[index]];
    update(version.versionId, { itineraryDays: days });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">
        גרסה היא אותו טיול עם שינויים קטנים, כמו חברת תעופה אחרת, יום יציאה אחר, אורך שונה, סדר ימים
        שונה או מחיר אחר. הגרסאות חולקות את הדף, התמונות והתיאור של הטיול. כל שדה שנשאר ריק נלקח
        מהטיול הראשי. בעריכת כל מועד בוחרים לאיזו גרסה הוא שייך.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="חברת התעופה (הגרסה הראשית)" hint="לא חובה, למשל ״ארקיע״.">
          <input
            className={inputClass}
            value={draft.airline ?? ""}
            onChange={(e) => onChange({ airline: e.target.value || undefined })}
          />
        </Field>
        <Field
          label="שם הגרסה הראשית בטבלת המועדים"
          hint="מוצג רק כשיש גרסאות, למשל ״טיסת ארקיע · יציאה ביום ג׳״."
        >
          <input
            className={inputClass}
            value={draft.mainVersionLabel ?? ""}
            onChange={(e) => onChange({ mainVersionLabel: e.target.value || undefined })}
          />
        </Field>
      </div>

      {versions.map((version, vIndex) => {
        const datesInVersion = departures.filter((d) => d.versionId === version.versionId).length;
        const differences = versionDifferences(draft, version.versionId);
        const days = version.itineraryDays ?? [];
        return (
          <div key={version.versionId} className="space-y-4 rounded-xl border border-line bg-sand-warm/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-navy">
                גרסה {vIndex + 1}
                {datesInVersion > 0 && (
                  <span className="ms-2 font-normal text-ink-muted">({datesInVersion} מועדים)</span>
                )}
              </span>
              <button
                type="button"
                disabled={datesInVersion > 0}
                title={datesInVersion > 0 ? "יש מועדים בגרסה הזו. העבירו אותם לגרסה אחרת לפני המחיקה." : undefined}
                onClick={() => setVersions(versions.filter((v) => v.versionId !== version.versionId))}
                className="text-xs font-semibold text-terracotta-dark hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
              >
                מחיקת הגרסה
              </button>
            </div>

            <Field
              label="שם הגרסה"
              required
              hint="מוצג ללקוחות בטבלת המועדים, למשל ״טיסת אל על · יציאה ביום ה׳״."
              error={errors[`versions.${vIndex}.label`]}
            >
              <input
                className={inputClass}
                value={version.label}
                onChange={(e) => update(version.versionId, { label: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="חברת תעופה" hint={draft.airline ? `ריק = ${draft.airline}` : undefined}>
                <input
                  className={inputClass}
                  value={version.airline ?? ""}
                  onChange={(e) => update(version.versionId, { airline: e.target.value || undefined })}
                />
              </Field>
              <Field label="מספר ימים" hint={`ריק = ${draft.durationDays}`}>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={version.durationDays ?? ""}
                  onChange={(e) => update(version.versionId, { durationDays: optionalNumber(e.target.value) || undefined })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="מחיר זוגי לאדם ($)" hint={`ריק = ${draft.pricing.pricePerPersonDouble}`}>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={version.pricing?.pricePerPersonDouble ?? ""}
                  onChange={(e) => updatePricing(version, "pricePerPersonDouble", e.target.value)}
                />
              </Field>
              <Field label="מחיר יחיד לאדם ($)" hint={`ריק = ${draft.pricing.pricePerPersonSingle}`}>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={version.pricing?.pricePerPersonSingle ?? ""}
                  onChange={(e) => updatePricing(version, "pricePerPersonSingle", e.target.value)}
                />
              </Field>
              <Field label="מקדמה לאדם ($)" hint={`ריק = ${draft.pricing.depositAmountPerPerson}`}>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={version.pricing?.depositAmountPerPerson ?? ""}
                  onChange={(e) => updatePricing(version, "depositAmountPerPerson", e.target.value)}
                />
              </Field>
            </div>

            <Field label="הערה לגרסה" hint="מוצגת בדף הטיול כשבוחרים בגרסה הזו.">
              <textarea
                className={inputClass}
                rows={2}
                value={version.notes ?? ""}
                onChange={(e) => update(version.versionId, { notes: e.target.value || undefined })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <ListTextarea
                label="כלול במחיר (ריק = כמו בטיול)"
                value={version.inclusions ?? []}
                onChange={(v) => update(version.versionId, { inclusions: v })}
              />
              <ListTextarea
                label="לא כלול במחיר (ריק = כמו בטיול)"
                value={version.exclusions ?? []}
                onChange={(v) => update(version.versionId, { exclusions: v })}
              />
            </div>

            <div className="space-y-2">
              {version.kashrutDetails ? (
                <>
                  <Field label="כשרות בגרסה הזו" error={errors[`versions.${vIndex}.kashrutDetails.supervisionLevel`]}>
                    <input
                      className={inputClass}
                      value={version.kashrutDetails.supervisionLevel}
                      onChange={(e) =>
                        update(version.versionId, {
                          kashrutDetails: { ...version.kashrutDetails!, supervisionLevel: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <textarea
                    className={inputClass}
                    rows={2}
                    placeholder="הערות כשרות"
                    value={version.kashrutDetails.notes ?? ""}
                    onChange={(e) =>
                      update(version.versionId, {
                        kashrutDetails: { ...version.kashrutDetails!, notes: e.target.value },
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => update(version.versionId, { kashrutDetails: undefined })}
                    className="text-xs font-semibold text-ink-muted hover:underline"
                  >
                    חזרה לכשרות של הטיול
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => update(version.versionId, { kashrutDetails: { ...draft.kashrutDetails } })}
                  className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-navy hover:text-navy"
                >
                  כשרות שונה בגרסה הזו
                </button>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">מסלול</p>
              {days.length === 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-ink-muted">אותו מסלול כמו בטיול הראשי.</span>
                  <button
                    type="button"
                    onClick={() => update(version.versionId, { itineraryDays: copyDays(draft.itineraryDays) })}
                    className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-navy hover:text-navy"
                  >
                    מסלול שונה (מתחיל כהעתק של המסלול הראשי)
                  </button>
                </div>
              ) : (
                <>
                  {days.map((day, index) => (
                    <div key={day.dayId} className="flex gap-2">
                      <div className="flex flex-col gap-1 pt-4">
                        <button
                          type="button"
                          aria-label="הזזה למעלה"
                          disabled={index === 0}
                          onClick={() => moveDay(version, index, -1)}
                          className="rounded border border-line px-1.5 text-xs disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label="הזזה למטה"
                          disabled={index === days.length - 1}
                          onClick={() => moveDay(version, index, 1)}
                          className="rounded border border-line px-1.5 text-xs disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <ItineraryDayEditor
                          day={day}
                          index={index}
                          onChange={(patch) =>
                            update(version.versionId, {
                              itineraryDays: days.map((d) => (d.dayId === day.dayId ? { ...d, ...patch } : d)),
                            })
                          }
                          onRemove={() =>
                            update(version.versionId, { itineraryDays: days.filter((d) => d.dayId !== day.dayId) })
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        update(version.versionId, {
                          itineraryDays: [
                            ...days,
                            { dayId: crypto.randomUUID(), dayNumber: days.length + 1, title: "", description: "", meals: [] },
                          ],
                        })
                      }
                      className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-navy hover:text-navy"
                    >
                      + הוספת יום
                    </button>
                    <button
                      type="button"
                      onClick={() => update(version.versionId, { itineraryDays: undefined })}
                      className="text-xs font-semibold text-ink-muted hover:underline"
                    >
                      חזרה למסלול הראשי
                    </button>
                  </div>
                </>
              )}
            </div>

            {differences.length > 0 && (
              <p className="text-xs text-ink-muted">
                מה שונה בגרסה: {differences.join(" · ")}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setVersions([...versions, { versionId: newVersionId(), label: "" }])}
        className="rounded-lg border border-dashed border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-navy hover:text-navy"
      >
        + הוספת גרסה
      </button>
    </div>
  );
}

function PublishChecklist({ items }: { items: { label: string; ok: boolean }[] }) {
  return (
    <div className="mb-6 rounded-xl border border-line bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        רשימת בדיקה לפרסום
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-1.5 ${item.ok ? "text-olive" : "text-ink-muted"}`}
          >
            <span aria-hidden="true">{item.ok ? "✓" : "○"}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_STYLES: Record<TourStatus, string> = {
  draft: "bg-gold/15 text-terracotta-dark",
  published: "bg-olive/15 text-olive",
  archived: "bg-ink-muted/15 text-ink-muted",
};

function StatusBadge({ status }: { status: TourStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {TOUR_STATUS_LABELS[status]}
    </span>
  );
}
