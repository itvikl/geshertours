import "server-only";
import ExcelJS from "exceljs";
import type { AdminBookingRow } from "@/lib/data/admin/bookings";
import type { DepartureRegistrant } from "@/lib/data/admin/history";
import { BOOKING_STATUS_LABELS, OCCUPANCY_LABELS } from "@/lib/adminLabels";
import type { Tour } from "@/lib/types";

/**
 * One departure's registrants: a "הזמנות" sheet (one row per booking) and a
 * "מטיילים" sheet (one row per traveler, with the Hebrew name and the
 * English name as in the passport — what the airline and hotels need).
 */
export async function buildBookingsWorkbook(
  tour: Tour,
  rows: AdminBookingRow[],
  registrants: DepartureRegistrant[] = []
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("הזמנות", { views: [{ rightToLeft: true }] });

  sheet.columns = [
    { header: "איש קשר", key: "contactName", width: 24 },
    { header: "אימייל", key: "contactEmail", width: 28 },
    { header: "טלפון", key: "contactPhone", width: 18 },
    { header: "תאריך יציאה", key: "departureDate", width: 16 },
    { header: "מטיילים", key: "travelerCount", width: 10 },
    { header: "סטטוס", key: "status", width: 16 },
    { header: "מקדמה", key: "deposit", width: 12 },
    { header: "שולם", key: "paid", width: 12 },
    { header: "סה״כ", key: "total", width: 12 },
    { header: "אופן ההמשך", key: "contactPreference", width: 16 },
    { header: "נשלח", key: "submitted", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const { booking, departure } of rows) {
    sheet.addRow({
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone ?? "",
      departureDate: departure ? new Date(departure.startDate).toLocaleDateString("he-IL", { timeZone: "UTC" }) : "",
      travelerCount: booking.travelerCount,
      status: BOOKING_STATUS_LABELS[booking.status] ?? booking.status,
      deposit: booking.depositAmount,
      paid: booking.amountPaid,
      total: booking.priceBreakdown.grandTotal,
      contactPreference: booking.contactPreference === "callback" ? "חזרה טלפונית" : "תשלום באתר",
      submitted: new Date(booking.createdAt).toLocaleDateString("he-IL"),
    });
  }

  if (registrants.length > 0) {
    const travelersSheet = workbook.addWorksheet("מטיילים", { views: [{ rightToLeft: true }] });
    travelersSheet.columns = [
      { header: "שם פרטי", key: "firstName", width: 16 },
      { header: "שם משפחה", key: "lastName", width: 18 },
      { header: "First name (passport)", key: "passportFirstName", width: 20 },
      { header: "Last name (passport)", key: "passportLastName", width: 20 },
      { header: "מספר דרכון", key: "passport", width: 14 },
      { header: "תאריך לידה", key: "dob", width: 13 },
      { header: "חדר", key: "occupancy", width: 13 },
      { header: "חולק/ת חדר עם", key: "roomWith", width: 20 },
      { header: "תזונה", key: "dietary", width: 18 },
      { header: "איש קשר להזמנה", key: "contactName", width: 22 },
      { header: "טלפון", key: "contactPhone", width: 16 },
    ];
    travelersSheet.getRow(1).font = { bold: true };
    for (const { booking, travelers } of registrants) {
      if (booking.status === "cancelled" || booking.status === "refunded") continue;
      for (const t of travelers) {
        travelersSheet.addRow({
          firstName: t.firstName,
          lastName: t.lastName,
          passportFirstName: t.passportFirstName ?? "",
          passportLastName: t.passportLastName ?? "",
          passport: t.passport ?? "",
          dob: t.dob ?? "",
          occupancy: OCCUPANCY_LABELS[t.occupancy] ?? t.occupancy,
          roomWith: t.roomWith ?? "",
          dietary: t.dietary ?? "",
          contactName: booking.contactName,
          contactPhone: booking.contactPhone ?? "",
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
