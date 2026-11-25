import * as z from "zod";
import "@/lib/validation/zodLocale";

/** Mirrors lib/types.ts SeoLandingPage, minus pageId (assigned by the data layer). */
export const SeoPageInputSchema = z.object({
  slug: z
    .string()
    .min(1, { error: "יש למלא כתובת (slug)." })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      error: "הכתובת חייבת להיות באותיות אנגליות קטנות, מופרדות במקפים (למשל kosher-tour-to-italy).",
    }),
  title: z.string().min(1, { error: "יש למלא כותרת." }),
  body: z.string().min(1, { error: "יש למלא תוכן." }),
  tourIds: z.array(z.string()),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

export type SeoPageInput = z.infer<typeof SeoPageInputSchema>;
