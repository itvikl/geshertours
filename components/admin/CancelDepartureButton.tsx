"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelDeparture } from "@/lib/actions/departures";
import { IconButton } from "@/components/admin/IconAction";
import { useConfirm, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

export default function CancelDepartureButton({
  departureId,
  tourId,
  label,
}: {
  departureId: string;
  tourId: string;
  label: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  async function handleClick() {
    const ok = await confirm({
      title: `לבטל את המועד ${label}?`,
      description: "מועד היציאה יסומן כמבוטל וייסגר להרשמות חדשות.",
      confirmLabel: "ביטול המועד",
      cancelLabel: "השארת המועד",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await cancelDeparture(departureId, tourId);
        toast.success({ title: "המועד בוטל", description: `המועד ${label} בוטל.` });
        router.refresh();
      } catch {
        toast.error({ title: "ביטול המועד נכשל", description: "משהו השתבש — נסו שוב." });
      }
    });
  }

  return (
    <IconButton icon="ban" label="ביטול המועד" tone="danger" disabled={pending} onClick={handleClick} />
  );
}
