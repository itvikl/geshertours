import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data/admin/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "הגדרות" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">הגדרות</h1>
        <p className="mt-1 text-sm text-ink-muted">ברירות מחדל כלליות לטיולים ולהזמנות חדשים.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
