import type { Metadata } from "next";
import MediaLibraryBrowser from "@/components/admin/MediaLibraryBrowser";

export const metadata: Metadata = { title: "ספריית תמונות" };

/**
 * Manage view of the same catalog MediaLibraryPicker offers inside every
 * image field: create categories, upload into them, and assign images.
 */
export default function AdminMediaPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">ספריית תמונות</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ארגנו את התמונות בקטגוריות — תמונות של טיולים ממוינות אוטומטית לפי המדינה. סמנו
          תמונות כדי להוסיף אותן לקטגוריות נוספות; אחר כך אפשר לבחור אותן ב״בחירה מהספרייה״
          ליד כל שדה תמונה.
        </p>
      </div>
      <div className="flex h-[calc(100vh-12rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-line bg-white">
        <MediaLibraryBrowser mode="manage" />
      </div>
    </div>
  );
}
