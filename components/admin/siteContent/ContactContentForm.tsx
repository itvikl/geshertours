"use client";

import { useState } from "react";
import { useDirtyDraft, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import Link from "next/link";
import PageHeader from "@/components/marketing/PageHeader";
import { TextField, SaveBar, PreviewFrame, HeroImageField } from "@/components/admin/siteContent/SiteContentFields";
import { saveContactContent } from "@/lib/actions/siteContent";
import type { SiteContentContact } from "@/lib/types";

export default function ContactContentForm({
  initialContent,
  primaryPhone,
  secondaryPhone,
}: {
  initialContent: SiteContentContact;
  primaryPhone: string;
  secondaryPhone?: string;
}) {
  const [draft, setDraft] = useState<SiteContentContact>(initialContent);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { isDirty, markSaved } = useDirtyDraft(draft);

  async function handleSave() {
    setSaving(true);
    let result;
    try {
      result = await saveContactContent(draft);
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
        <TextField required
          label="כותרת"
          value={draft.title}
          onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
          error={errors.title}
        />
        <TextField required
          label="כותרת משנה"
          value={draft.lede}
          onChange={(v) => setDraft((d) => ({ ...d, lede: v }))}
          error={errors.lede}
        />

        <p className="rounded-lg border border-dashed border-line bg-sand-warm/40 p-3 text-xs text-ink-muted">
          מספרי הטלפון בדף הזה מגיעים מ
          <Link href="/admin/settings" className="font-medium text-navy hover:underline">
            ״הגדרות״
          </Link>
          , לא מכאן — כך הכותרת העליונה, התחתית ודף צור קשר תמיד מציגים אותו מספר.
        </p>

        <SaveBar saving={saving} dirty={isDirty} onSave={handleSave} />
      </div>

      <PreviewFrame>
        <div className="-m-6">
          <PageHeader title={draft.title} lede={draft.lede} image={draft.heroImage} />
        </div>
        <div className="px-6 py-8">
          <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">
              מעדיפים לדבר?
            </p>
            <span className="font-display text-3xl font-bold text-[#e0e8f0]">{primaryPhone}</span>
            {secondaryPhone && <span className="text-sm text-[#a0b4c4]">או {secondaryPhone}</span>}
          </div>
        </div>
      </PreviewFrame>
    </div>
  );
}
