"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus } from "@/lib/actions/leads";
import type { Lead } from "@/lib/types";
import { LEAD_STATUS_LABELS } from "@/lib/leadLabels";
import { useToast } from "@/components/admin/feedback/AdminFeedbackProvider";

const STATUS_STYLES: Record<Lead["status"], string> = {
  new: "bg-gold/15 text-terracotta-dark",
  contacted: "bg-navy/10 text-navy",
  converted: "bg-olive/15 text-olive",
  closed: "bg-ink-muted/15 text-ink-muted",
};

const STATUS_LABELS = LEAD_STATUS_LABELS;

/** Badge-styled select — changing it saves immediately, reverting if the save fails. */
export default function LeadStatusSelect({
  leadId,
  status: initialStatus,
}: {
  leadId: string;
  status: Lead["status"];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleChange(next: Lead["status"]) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, next).catch(() => ({ ok: false }));
      if (!result.ok) {
        setStatus(previous);
        toast.error({ title: "הסטטוס לא נשמר", description: "עדכון הפנייה נכשל — נסו שוב." });
      } else {
        toast.success(`סטטוס הפנייה: ${STATUS_LABELS[next]}`);
      }
    });
  }

  return (
    <div>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as Lead["status"])}
        aria-label="סטטוס הפנייה"
        className={`cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-60 ${STATUS_STYLES[status]}`}
      >
        {(Object.keys(STATUS_LABELS) as Lead["status"][]).map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  );
}
