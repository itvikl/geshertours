"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReviewStatus } from "@/lib/actions/reviews";
import type { Review } from "@/lib/types";
import { IconButton } from "@/components/admin/IconAction";
import { useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

export default function ReviewStatusButtons({ review }: { review: Review }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function change(status: Review["status"]) {
    startTransition(async () => {
      try {
        await setReviewStatus(review.reviewId, status);
        toast.success(
          status === "approved"
            ? { title: "ההמלצה אושרה", description: `ההמלצה של ${review.customerName} מוצגת עכשיו באתר.` }
            : { title: "ההמלצה נדחתה", description: `ההמלצה של ${review.customerName} הוסתרה מהאתר.` }
        );
        router.refresh();
      } catch {
        toast.error({ title: "עדכון ההמלצה נכשל", description: "משהו השתבש — נסו שוב." });
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {review.status !== "approved" && (
        <IconButton
          icon="check"
          label="אישור (הצגה באתר)"
          tone="success"
          disabled={pending}
          onClick={() => change("approved")}
        />
      )}
      {review.status !== "rejected" && (
        <IconButton
          icon="x"
          label="דחייה (הסתרה מהאתר)"
          tone="danger"
          disabled={pending}
          onClick={() => change("rejected")}
        />
      )}
    </div>
  );
}
