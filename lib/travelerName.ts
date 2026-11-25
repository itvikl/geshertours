import type { Traveler } from "@/lib/types";

type Names = Pick<Traveler, "firstName" | "lastName" | "passportFirstName" | "passportLastName">;

/** The English name as printed in the passport, or "" when it wasn't given. */
export function passportName(t: Names): string {
  return `${t.passportFirstName ?? ""} ${t.passportLastName ?? ""}`.trim();
}

/** "ישראל ישראלי (ISRAEL ISRAELI)": the Hebrew name, then the passport name when there is one. */
export function travelerDisplayName(t: Names): string {
  const name = `${t.firstName} ${t.lastName}`.trim();
  const english = passportName(t);
  return english ? `${name} (${english})` : name;
}
