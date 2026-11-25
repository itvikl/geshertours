"use client";

import { useTransition } from "react";
import { duplicateTour } from "@/lib/actions/tours";
import { IconButton } from "@/components/admin/IconAction";
import { useConfirmDiscard, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

/** Copies the tour into a new draft and navigates to its editor (the action redirects). */
export default function DuplicateTourButton({
  tourId,
  variant = "button",
}: {
  tourId: string;
  variant?: "button" | "link";
}) {
  const [pending, startTransition] = useTransition();
  const confirmDiscard = useConfirmDiscard();
  const toast = useToast();

  async function run() {
    // Duplicating redirects to the copy's editor — don't silently drop unsaved edits here.
    if (!(await confirmDiscard())) return;
    startTransition(async () => {
      try {
        const result = await duplicateTour(tourId);
        if (result && !result.ok) {
          toast.error({ title: "שכפול הטיול נכשל", description: result.error });
        } else {
          toast.success({ title: "הטיול שוכפל", description: "אתם עורכים עכשיו את העותק החדש (טיוטה)." });
        }
      } catch {
        toast.error({ title: "שכפול הטיול נכשל", description: "משהו השתבש — נסו שוב." });
      }
    });
  }

  if (variant === "link") {
    return (
      <IconButton
        icon="copy"
        label={pending ? "משכפל…" : "שכפול (עותק טיוטה, בלי מועדים)"}
        onClick={run}
        disabled={pending}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      title="יצירת עותק טיוטה של הטיול (בלי מועדי יציאה)"
      onClick={run}
      className="shrink-0 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sand-warm disabled:opacity-60"
    >
      {pending ? "משכפל…" : "שכפול"}
    </button>
  );
}
