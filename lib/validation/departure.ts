import * as z from "zod";
import "@/lib/validation/zodLocale";

/**
 * Admin-editable subset of lib/types.ts Departure. Deliberately excludes
 * departureId/tourId (assigned by the data layer), capacityBooked/
 * capacityHeld (system-managed via the booking transaction — never form
 * input), balanceDueDate (derived server-side from startDate + the tour's
 * pricing). pricingOverride holds only the date's own double/single price.
 */
export const DepartureInputSchema = z
  .object({
    startDate: z.string().min(1, { error: "יש לבחור תאריך התחלה." }),
    endDate: z.string().min(1, { error: "יש לבחור תאריך סיום." }),
    capacityTotal: z.number().int().min(0, { error: "מספר המקומות חייב להיות 0 או יותר." }),
    status: z.enum(["open", "closed", "soldout", "cancelled"]),
    // Internal-only signal (see keshertour-trip-validation-plan) — never shown to customers.
    minGroupSizeMet: z.boolean(),
    guideId: z.string().optional(),
    kashrutSupervisorId: z.string().optional(),
    // Customer-facing trust badge — missing/undefined is treated as "conditional".
    bookingAssurance: z.enum(["conditional", "guaranteed"]).optional(),
    /** Tour.versions id; blank = the main version. */
    versionId: z.string().optional(),
    note: z.string().trim().max(200).optional(),
    pricingOverride: z
      .object({
        pricePerPersonDouble: z.number().min(0).optional(),
        pricePerPersonSingle: z.number().min(0).optional(),
      })
      .optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    error: "תאריך הסיום חייב להיות באותו יום או אחרי תאריך ההתחלה.",
    path: ["endDate"],
  });

export type DepartureInput = z.infer<typeof DepartureInputSchema>;
