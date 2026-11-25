import * as z from "zod";
import "@/lib/validation/zodLocale";

/** Mirrors lib/types.ts SpecialOffer, minus offerId (assigned by the data layer). */
export const OfferInputSchema = z.object({
  title: z.string().min(1, { error: "יש למלא כותרת." }),
  body: z.string().min(1, { error: "יש למלא תוכן." }),
  image: z.string().optional(),
  tourId: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

export type OfferInput = z.infer<typeof OfferInputSchema>;
