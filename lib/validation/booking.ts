import * as z from "zod";
import "@/lib/validation/zodLocale";
import { isPassportScanPath } from "@/lib/passportScans";
import {
  LATIN_NAME_PATTERN,
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  PASSPORT_PATTERN,
  PHONE_PATTERN,
} from "@/lib/validation/fields";

export const RoomConfigurationSchema = z.object({
  doubleRooms: z.number().int().min(0),
  singleRooms: z.number().int().min(0),
  triples: z.number().int().min(0),
});

function latinName(error: string) {
  return z.string().trim().max(NAME_MAX_LENGTH).regex(LATIN_NAME_PATTERN, { error });
}

export const TravelerInputSchema = z.object({
  firstName: z
    .string()
    .min(1, { error: "יש למלא שם פרטי." })
    .max(NAME_MAX_LENGTH)
    .regex(NAME_PATTERN, { error: "השם הפרטי יכול להכיל אותיות בלבד." }),
  lastName: z
    .string()
    .min(1, { error: "יש למלא שם משפחה." })
    .max(NAME_MAX_LENGTH)
    .regex(NAME_PATTERN, { error: "שם המשפחה יכול להכיל אותיות בלבד." }),
  dob: z
    .string()
    .optional()
    .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), {
      error: "תאריך הלידה לא יכול להיות בעתיד.",
    }),
  // Optional here so staff can enter a phone booking before they have the
  // passport; the public form requires them (PublicTravelerInputSchema).
  passportFirstName: latinName("השם הפרטי באנגלית יכול להכיל אותיות באנגלית בלבד, כמו בדרכון.").optional(),
  passportLastName: latinName("שם המשפחה באנגלית יכול להכיל אותיות באנגלית בלבד, כמו בדרכון.").optional(),
  passport: z
    .string()
    .regex(PASSPORT_PATTERN, { error: "מספר הדרכון יכול להכיל אותיות באנגלית וספרות בלבד (עד 10)." })
    .optional(),
  // Only a path uploadPassportScan itself produces — never a client-chosen URL.
  passportScanPath: z
    .string()
    .refine(isPassportScanPath, { error: "העלאת צילום הדרכון אינה תקינה." })
    .optional(),
  occupancy: z.enum(["double", "single", "triple", "child"]),
  roomWith: z.string().optional(),
  dietary: z.string().optional(),
});

/** A traveler booked online: the English name as in the passport is required. */
export const PublicTravelerInputSchema = TravelerInputSchema.extend({
  passportFirstName: latinName("יש למלא שם פרטי באנגלית, כמו בדרכון."),
  passportLastName: latinName("יש למלא שם משפחה באנגלית, כמו בדרכון."),
});

/**
 * Everything the public registration form (components/marketing/BookingForm)
 * submits. No pricing fields here on purpose — the server action recomputes
 * the price from the tour/departure's own data (PRD FR-13), never trusting
 * a total sent by the client.
 */
export const BookingInputSchema = z.object({
  departureId: z.string().min(1, { error: "יש לבחור מועד יציאה." }),
  roomConfiguration: RoomConfigurationSchema,
  childCount: z.number().int().min(0),
  travelers: z
    .array(TravelerInputSchema)
    .min(1, { error: "נדרש לפחות מטייל אחד." }),
  contactName: z.string().min(1, { error: "יש למלא שם." }),
  contactEmail: z.email({ error: "יש להזין כתובת אימייל תקינה." }),
  contactPhone: z
    .string()
    .regex(PHONE_PATTERN, { error: "יש להזין מספר טלפון תקין." })
    .optional(),
  contactPreference: z.enum(["callback", "pay_online"], {
    error: "יש לבחור איך תרצו להשלים את התשלום.",
  }),
});

export type BookingInput = z.infer<typeof BookingInputSchema>;

/**
 * Public-flow-only extension: the amount the customer chose (or was forced
 * into, for a guaranteed departure) via the payment slider in BookingForm.
 * Re-validated server-side against the departure's bookingAssurance and
 * price range in createBookingCore — this schema only guards "it's a
 * positive number", not the actual floor/ceiling (those need the tour's
 * pricing, which isn't available until the server action loads it).
 */
export const PublicBookingInputSchema = BookingInputSchema.extend({
  travelers: z
    .array(PublicTravelerInputSchema)
    .min(1, { error: "נדרש לפחות מטייל אחד." }),
  // 0 is valid: a tour with no deposit can be reserved without paying anything now.
  paymentAmount: z.number().min(0, { error: "יש לבחור סכום לתשלום." }),
});
export type PublicBookingInput = z.infer<typeof PublicBookingInputSchema>;

/**
 * Same shape as BookingInputSchema plus an admin-chosen initial status —
 * used by createManualBooking (e.g. a phone registration) where there's no
 * Stripe leg to determine status, so staff set it directly.
 */
export const ManualBookingInputSchema = BookingInputSchema.extend({
  status: z.enum(["pending_payment", "partial_paid", "paid_in_full"], {
    error: "יש לבחור סטטוס.",
  }),
});
export type ManualBookingInput = z.infer<typeof ManualBookingInputSchema>;
