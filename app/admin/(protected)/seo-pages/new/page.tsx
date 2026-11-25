import type { Metadata } from "next";
import { getAllToursAdmin } from "@/lib/data/admin/tours";
import SeoPageEditorForm from "@/components/admin/SeoPageEditorForm";

export const metadata: Metadata = { title: "דף נחיתה חדש" };

export default async function NewSeoPagePage() {
  const tours = await getAllToursAdmin();
  tours.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">דף נחיתה חדש</h1>
      </div>
      <SeoPageEditorForm mode="create" tours={tours} />
    </div>
  );
}
