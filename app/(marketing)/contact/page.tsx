import type { Metadata } from "next";
import PageHeader from "@/components/marketing/PageHeader";
import ContactForm from "@/components/marketing/ContactForm";
import { getSiteContent } from "@/lib/data/siteContent";
// Phone numbers are the site's single Settings doc (already admin-editable
// at /admin/settings), not duplicated as their own site-content fields.
import { getSiteSettings } from "@/lib/data/admin/settings";
import {
  DEFAULT_SITE_EMAIL,
  SITE_ADDRESS,
  SITE_FACEBOOK_URL,
  whatsappDisplay,
  whatsappHref,
} from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "צור קשר",
  description: "שאלות על טיול או על טיול בהתאמה אישית? התקשרו, כתבו לנו או השאירו הודעה לצוות טיולי גשר.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [content, settings] = await Promise.all([getSiteContent("contact"), getSiteSettings()]);

  return (
    <div>
      <PageHeader title={content.title} lede={content.lede} image={content.heroImage} />
      <div className="mx-auto grid max-w-3xl gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-ice)]">
            מעדיפים לדבר?
          </p>
          <a
            href={`tel:${settings.phone.replace(/\D/g, "")}`}
            className="font-display text-3xl font-bold text-[var(--color-mist)] transition hover:text-[var(--color-ice)]"
          >
            {settings.phone}
          </a>
          {settings.phoneAlt && (
            <a
              href={`tel:${settings.phoneAlt.replace(/\D/g, "")}`}
              className="text-sm text-[var(--color-slate)] transition hover:text-[var(--color-ice)]"
            >
              או {settings.phoneAlt}
            </a>
          )}
          <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-[var(--color-slate)]">
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--color-ice)]"
            >
              וואטסאפ: <span dir="ltr">{whatsappDisplay()}</span>
            </a>
            <a
              href={`mailto:${settings.email || DEFAULT_SITE_EMAIL}`}
              className="transition hover:text-[var(--color-ice)]"
            >
              דוא&quot;ל: <span dir="ltr">{settings.email || DEFAULT_SITE_EMAIL}</span>
            </a>
            <span>{SITE_ADDRESS}</span>
            <a
              href={SITE_FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--color-ice)]"
            >
              בקרו אותנו בפייסבוק
            </a>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
