import type { Metadata } from "next";
import { getAllToursAdmin } from "@/lib/data/admin/tours";
import LeadForm from "@/components/admin/LeadForm";

export const metadata: Metadata = { title: "פנייה חדשה" };

export default async function NewLeadPage() {
  const tours = await getAllToursAdmin();
  tours.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">פנייה חדשה</h1>
        <p className="mt-1 text-sm text-ink-muted">
          רישום פנייה שהתקבלה בטלפון או בדרך אחרת שאינה באתר.
        </p>
      </div>
      <LeadForm tours={tours} />
    </div>
  );
}
