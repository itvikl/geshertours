import Link from "next/link";
import type { Metadata } from "next";
import type { SiteContentPageKey } from "@/lib/types";

export const metadata: Metadata = { title: "תוכן האתר" };

const PAGES: { pageKey: SiteContentPageKey; label: string; description: string; publicHref: string }[] = [
  { pageKey: "home", label: "דף הבית", description: "התמונה הראשית, כרטיסי האמון והקריאה לפעולה בסוף.", publicHref: "/" },
  { pageKey: "about", label: "אודות", description: "פתיח הדף וכל מקטעי התוכן.", publicHref: "/about" },
  { pageKey: "custom-tours", label: "טיול בהתאמה אישית", description: "כותרת הדף מעל טופס הבקשה.", publicHref: "/custom-made-tours" },
  { pageKey: "special-offers", label: "מבצעים", description: "כותרת הדף מעל רשימת המבצעים.", publicHref: "/special-offers" },
  { pageKey: "tour-page", label: "דף טיול", description: "נוסח כרטיס ההרשמה, כותרות ותוויות שמשותפים לכל הטיולים.", publicHref: "/tours" },
  { pageKey: "booking", label: "טופס הרשמה", description: "כל שלבי ההרשמה, עד האישור.", publicHref: "/tours" },
  { pageKey: "blog", label: "בלוג", description: "כותרת הדף והנוסח סביב הפוסטים.", publicHref: "/blog" },
  { pageKey: "testimonials", label: "המלצות", description: "כותרת הדף והנוסח — ההמלצות עצמן מגיעות ממסך ״המלצות״.", publicHref: "/testimonials" },
  { pageKey: "faq", label: "שאלות נפוצות", description: "כותרת הדף וכל השאלות והתשובות.", publicHref: "/faq" },
  { pageKey: "contact", label: "צור קשר", description: "כותרת הדף — מספרי הטלפון מגיעים מ״הגדרות״.", publicHref: "/contact" },
  { pageKey: "legal-privacy", label: "מדיניות פרטיות", description: "הכותרת והטקסט המלא של המדיניות.", publicHref: "/legal/privacy" },
  { pageKey: "legal-terms", label: "תקנון", description: "הכותרת והטקסט המלא של התקנון.", publicHref: "/legal/terms-conditions" },
];

export default function SiteContentIndexPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">תוכן האתר</h1>
        <p className="mt-1 text-sm text-ink-muted">
          כל הדפים בתפריט האתר, לעריכה כאן באותו עיצוב שהלקוחות רואים.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PAGES.map((page) => (
          <Link
            key={page.pageKey}
            href={`/admin/site-content/${page.pageKey}`}
            className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-navy/40 hover:bg-sand-warm/40"
          >
            <p className="font-semibold text-ink group-hover:text-navy">{page.label}</p>
            <p className="mt-1 text-sm text-ink-muted">{page.description}</p>
            <p className="mt-3 text-xs font-medium text-navy">עריכה ←</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
