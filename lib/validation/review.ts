import * as z from "zod";
import "@/lib/validation/zodLocale";

/** Mirrors lib/types.ts Review, minus reviewId (assigned by the data layer). */
export const ReviewInputSchema = z.object({
  tourId: z.string().min(1, { error: "יש לבחור טיול." }),
  customerName: z.string().min(1, { error: "יש למלא את שם הלקוח." }),
  rating: z.number().int().min(1).max(5).optional(),
  photo: z.string().optional(),
  destination: z.string().trim().max(60).optional(),
  body: z.string().min(1, { error: "יש למלא את טקסט ההמלצה." }),
  status: z.enum(["pending", "approved", "rejected"]),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;
