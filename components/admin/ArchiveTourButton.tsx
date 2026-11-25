"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveTour } from "@/lib/actions/tours";
import { IconButton } from "@/components/admin/IconAction";
import { useConfirm, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

/** FR-43: no raw delete in the admin — archiving is the only removal action, and stays reachable/301-able. */
export default function ArchiveTourButton({ tourId, title }: { tourId: string; title: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  async function handleClick() {
    const ok = await confirm({
      title: `להעביר את ״${title}״ לארכיון?`,
      description: "הטיול יוסתר מהאתר. אפשר לשחזר אותו מהארכיון בהמשך.",
      confirmLabel: "העברה לארכיון",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await archiveTour(tourId);
        toast.success({ title: "הטיול הועבר לארכיון", description: `״${title}״ כבר לא מוצג באתר.` });
        router.refresh();
      } catch {
        toast.error({ title: "ההעברה לארכיון נכשלה", description: "משהו השתבש — נסו שוב." });
      }
    });
  }

  return <IconButton icon="archive" label="העברה לארכיון" tone="danger" disabled={pending} onClick={handleClick} />;
}
