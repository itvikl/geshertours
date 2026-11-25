import * as z from "zod";
import "@/lib/validation/zodLocale";
import { ADMIN_ROLES } from "@/lib/auth/roles";

const RoleSchema = z.enum(ADMIN_ROLES, { error: "יש לבחור תפקיד." });

/** "Add account": the password is only needed when the email has no login yet. */
export const AddAdminAccountInputSchema = z.object({
  email: z.email({ error: "יש להזין כתובת אימייל תקינה." }),
  role: RoleSchema,
  password: z.preprocess(
    (v) => (typeof v === "string" && v === "" ? undefined : v),
    z.string().min(8, { error: "הסיסמה חייבת להכיל לפחות 8 תווים." }).optional()
  ),
});

export type AddAdminAccountInput = z.infer<typeof AddAdminAccountInputSchema>;

/** Role dropdown on an Admin accounts row. */
export const ChangeAccountRoleInputSchema = z.object({
  uid: z.string().min(1),
  role: RoleSchema,
});
