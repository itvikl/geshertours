"use client";

import { useState } from "react";
import { useDirtyDraft, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import PageHeader from "@/components/marketing/PageHeader";
import { TextField, SaveBar, PreviewFrame, HeroImageField } from "@/components/admin/siteContent/SiteContentFields";
import type { SaveSiteContentResult } from "@/lib/actions/siteContent";
import type { SiteContentSimplePage } from "@/lib/types";

/** Shared by /admin/site-content/custom-tours and special-offers — each has only a PageHeader worth of editable copy. */
export default function SimplePageContentForm({
  initialContent,
  saveAction,
}: {
  initialContent: SiteContentSimplePage;
  saveAction: (input: unknown) => Promise<SaveSiteContentResult>;
}) {
  const [draft, setDraft] = useState<SiteContentSimplePage>(initialContent);
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <HeroImageField value={draft.heroImage} onChange={(url) => setDraft((d) => ({ ...d, heroImage: url }))} />
        <TextField
          label="טקסט קטן מעל הכותרת"
          value={draft.eyebrow ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, eyebrow: v }))}
          error={errors.eyebrow}
        />
        <TextField
          label="כותרת" required
          value={draft.title}
          onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
          error={errors.title}
        />
        <TextField
          label="פסקת כותרת משנה"
          value={draft.lede ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, lede: v }))}
          error={errors.lede}
        />
        <SaveBar saving={saving} dirty={isDirty} onSave={handleSave} />
      </div>

      <PreviewFrame>
        <div className="-m-6">
          <PageHeader eyebrow={draft.eyebrow || undefined} title={draft.title} lede={draft.lede || undefined} image={draft.heroImage} />
        </div>
      </PreviewFrame>
    </div>
  );
}
