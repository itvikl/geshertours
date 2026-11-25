"use client";

import { useState } from "react";
import { useDirtyDraft, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { TextField, TextAreaField, SaveBar, HeroImageField } from "@/components/admin/siteContent/SiteContentFields";
import type { SaveSiteContentResult } from "@/lib/actions/siteContent";
import type { CopySection } from "@/lib/siteCopy";

/** Shared by the tour page, booking, blog, and testimonials editors — each is a set of labeled text fields, driven by its CopySection list. */
export default function CopyContentForm({
  sections,
  initialContent,
  saveAction,
  liveLinks = [],
}: {
  sections: CopySection[];
  initialContent: Record<string, string>;
  saveAction: (input: unknown) => Promise<SaveSiteContentResult>;
  liveLinks?: { label: string; href: string }[];
}) {
  const [draft, setDraft] = useState(initialContent);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { isDirty, markSaved } = useDirtyDraft(draft);

  async function handleSave() {
    setSaving(true);
    let result;
    try {
      result = await saveAction(draft);
    } catch {
      setSaving(false);
      toast.error({ title: "השמירה נכשלה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      toast.error({ title: "לא נשמר", description: "תקנו את השדות המסומנים ונסו שוב." });
      return;
    }
    setErrors({});
    markSaved(draft);
    toast.success({ title: "השינויים נשמרו", description: "תוכן הדף עודכן בהצלחה." });
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {liveLinks.length > 0 && (
        <p className="flex flex-wrap gap-4 text-sm">
          {liveLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-navy hover:text-navy-light"
            >
              {link.label} ↗
            </a>
          ))}
        </p>
      )}

      {sections.map((section) => (
        <section key={section.title} className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold text-ink">{section.title}</h2>
          {section.description && <p className="mt-1 text-sm text-ink-muted">{section.description}</p>}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => {
              if (field.image) {
                return (
                  <div key={field.key} className="md:col-span-2">
                    <HeroImageField
                      value={draft[field.key] || undefined}
                      onChange={(url) => setDraft((d) => ({ ...d, [field.key]: url ?? "" }))}
                      error={errors[field.key]}
                    />
                  </div>
                );
              }
              const Field = field.multiline ? TextAreaField : TextField;
              return (
                <div key={field.key} className={field.multiline ? "md:col-span-2" : undefined}>
                  <Field
                    label={field.optional ? `${field.label} (לא חובה)` : field.label}
                    value={draft[field.key] ?? ""}
                    onChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
                    error={errors[field.key]}
                  />
                  {field.placeholders && (
                    <p className="mt-1 text-xs text-ink-muted">
                      מתמלא אוטומטית: {field.placeholders.map((name) => `{${name}}`).join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
        <SaveBar saving={saving} dirty={isDirty} onSave={handleSave} />
        {errorCount > 0 && (
          <p className="text-sm text-terracotta-dark">
            {errorCount === 1 ? "שדה אחד דורש" : `${errorCount} שדות דורשים`} תיקון. שום דבר לא נשמר.
          </p>
        )}
      </div>
    </div>
  );
}
