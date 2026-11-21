import Link from "next/link";
import PageHeader from "@/components/marketing/PageHeader";

/**
 * Body of the site's 404 page. Rendered by app/not-found.tsx (unmatched URLs,
 * which sit outside the marketing layout and so wrap this in it) and by
 * app/(marketing)/not-found.tsx (notFound() thrown from a marketing page, which
 * is already inside that layout — wrapping again would show two headers).
 */
export default function NotFoundContent() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title="לא מצאנו את הדף הזה"
        lede="ייתכן שהדף הועבר, או שהטיול כבר לא פעיל. עיינו בטיולים הנוכחיים או צרו איתנו קשר."
      />
      <div className="flex flex-wrap justify-center gap-4 px-4 py-14">
        <Link
          href="/#featured-tours"
          className="rounded-full bg-[var(--color-ice)] px-6 py-3 text-sm font-semibold text-[var(--color-glacier)] transition hover:opacity-90"
        >
          לכל הטיולים
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-[var(--color-border-ice-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-mist)] transition hover:border-[var(--color-ice)]"
        >
          צרו קשר
        </Link>
      </div>
    </>
  );
}
