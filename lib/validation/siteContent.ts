import * as z from "zod";
import "@/lib/validation/zodLocale";
import { placeholdersIn, type CopySection } from "@/lib/siteCopy";

const TrustSignalInputSchema = z.object({
  title: z.string().min(1, { error: "שדה חובה." }),
  body: z.string().min(1, { error: "שדה חובה." }),
});

export const SiteContentHomeInputSchema = z.object({
  heroImage: z.string().min(1, { error: "יש לבחור תמונה ראשית." }),
  heroEyebrow: z.string().min(1, { error: "שדה חובה." }),
  heroTitleLine1: z.string().min(1, { error: "שדה חובה." }),
  heroTitleHighlight: z.string().min(1, { error: "שדה חובה." }),
  heroSubtitle: z.string().min(1, { error: "שדה חובה." }),
  heroPrimaryCta: z.string().min(1, { error: "שדה חובה." }),
  trustSignals: z.tuple([TrustSignalInputSchema, TrustSignalInputSchema, TrustSignalInputSchema]),
  ctaHeading: z.string().min(1, { error: "שדה חובה." }),
  ctaHeadingHighlight: z.string().min(1, { error: "שדה חובה." }),
  ctaBody: z.string().min(1, { error: "שדה חובה." }),
  ctaPrimaryButton: z.string().min(1, { error: "שדה חובה." }),
  ctaSecondaryButton: z.string().min(1, { error: "שדה חובה." }),
});

const SiteContentSectionInputSchema = z.object({
  sectionId: z.string().min(1),
  heading: z.string().min(1, { error: "שדה חובה." }),
  body: z.string().min(1, { error: "שדה חובה." }),
});

export const SiteContentAboutInputSchema = z.object({
  heroImage: z.string().optional(),
  eyebrow: z.string().min(1, { error: "שדה חובה." }),
  title: z.string().min(1, { error: "שדה חובה." }),
  lede: z.string().min(1, { error: "שדה חובה." }),
  sections: z.array(SiteContentSectionInputSchema).min(1, { error: "יש להוסיף לפחות מקטע אחד." }),
});

export const SiteContentSimplePageInputSchema = z.object({
  heroImage: z.string().optional(),
  eyebrow: z.string().optional(),
  title: z.string().min(1, { error: "שדה חובה." }),
  lede: z.string().optional(),
});

const SiteContentFaqItemInputSchema = z.object({
  itemId: z.string().min(1),
  question: z.string().min(1, { error: "שדה חובה." }),
  answer: z.string().min(1, { error: "שדה חובה." }),
});

export const SiteContentFaqInputSchema = z.object({
  heroImage: z.string().optional(),
  title: z.string().min(1, { error: "שדה חובה." }),
  lede: z.string().optional(),
  items: z.array(SiteContentFaqItemInputSchema).min(1, { error: "יש להוסיף לפחות שאלה אחת." }),
});

export const SiteContentContactInputSchema = z.object({
  heroImage: z.string().optional(),
  title: z.string().min(1, { error: "שדה חובה." }),
  lede: z.string().min(1, { error: "שדה חובה." }),
});

/** Builds the schema for a CopyContentForm page from its field list. A mistyped {placeholder} is rejected here because visitors would otherwise see it literally. */
export function copyInputSchema(sections: CopySection[]) {
  const shape: Record<string, z.ZodType<string | undefined>> = {};
  for (const field of sections.flatMap((section) => section.fields)) {
    if (field.image) {
      shape[field.key] = z.string().optional();
      continue;
    }
    const allowed = field.placeholders ?? [];
    const base = field.optional ? z.string().trim() : z.string().trim().min(1, { error: "שדה חובה." });
    shape[field.key] = base.refine(
      (value) => placeholdersIn(value).every((name) => allowed.includes(name)),
      {
        error: allowed.length
          ? `בסוגריים מסולסלים אפשר להשתמש כאן רק ב-${allowed.map((name) => `{${name}}`).join(", ")}.`
          : "אי אפשר להשתמש בסוגריים מסולסלים בשדה הזה.",
      }
    );
  }
  return z.object(shape);
}

export const SiteContentLegalInputSchema = z.object({
  heroImage: z.string().optional(),
  title: z.string().min(1, { error: "שדה חובה." }),
  body: z.string().min(1, { error: "שדה חובה." }),
});
