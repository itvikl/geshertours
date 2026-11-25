import "server-only";
import ExcelJS from "exceljs";
import { passportName } from "@/lib/travelerName";
import { BOOKING_STATUS_LABELS, OCCUPANCY_LABELS } from "@/lib/adminLabels";
import type { DepartureRegistrantsResult } from "@/lib/data/admin/history";

const STATUS_LABELS: Record<string, string> = BOOKING_STATUS_LABELS;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { timeZone: "UTC" });
}

/**
 * Past departures export — a "Departures" summary sheet plus a
 * "Travelers" sheet with one row per traveler (contact/payment columns
 * repeated per row so the sheet filters/sorts cleanly in Excel).
 */
export async function buildHistoryWorkbook(results: DepartureRegistrantsResult[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const departuresSheet = workbook.addWorksheet("מועדי יציאה", { views: [{ rightToLeft: true }] });
  departuresSheet.columns = [
    { header: "טיול", key: "tour", width: 36 },
    { header: "תאריך התחלה", key: "start", width: 14 },
    { header: "תאריך סיום", key: "end", width: 14 },
    { header: "הזמנות", key: "bookings", width: 10 },
    { header: "מטיילים", key: "travelers", width: 10 },
    { header: "סה״כ שולם", key: "paid", width: 14 },
  ];

  const travelersSheet = workbook.addWorksheet("מטיילים", { views: [{ rightToLeft: true }] });
  travelersSheet.columns = [
    { header: "טיול", key: "tour", width: 36 },
    { header: "תאריך התחלה", key: "start", width: 14 },
    { header: "מטייל", key: "traveler", width: 24 },
    { header: "Name in passport", key: "passportName", width: 24 },
    { header: "חדר", key: "occupancy", width: 12 },
    { header: "תזונה", key: "dietary", width: 18 },
    { header: "איש קשר להזמנה", key: "contactName", width: 24 },
    { header: "אימייל", key: "contactEmail", width: 28 },
    { header: "טלפון", key: "contactPhone", width: 18 },
    { header: "סטטוס ההזמנה", key: "status", width: 16 },
    { header: "סה״כ ההזמנה", key: "total", width: 14 },
    { header: "שולם בהזמנה", key: "paid", width: 14 },
  ];

  for (const sheet of [departuresSheet, travelersSheet]) sheet.getRow(1).font = { bold: true };

  for (const { departure, tour, registrants } of results) {
    if (!departure) continue;
    const tourTitle = tour?.title ?? "";
    const active = registrants.filter(({ booking }) => booking.status !== "cancelled");

    departuresSheet.addRow({
      tour: tourTitle,
      start: formatDate(departure.startDate),
      end: formatDate(departure.endDate),
      bookings: active.length,
      travelers: active.reduce((sum, { booking }) => sum + booking.travelerCount, 0),
      paid: registrants.reduce((sum, { booking }) => sum + booking.amountPaid, 0),
    });

    for (const { booking, travelers } of registrants) {
      // Bookings without a travelers subcollection still get one row so the contact isn't lost.
      const rows = travelers.length > 0 ? travelers : [null];
      for (const traveler of rows) {
        travelersSheet.addRow({
          tour: tourTitle,
          start: formatDate(departure.startDate),
          traveler: traveler ? `${traveler.firstName} ${traveler.lastName}` : "",
          passportName: traveler ? passportName(traveler) : "",
          occupancy: traveler ? (OCCUPANCY_LABELS[traveler.occupancy] ?? traveler.occupancy) : "",
          dietary: traveler?.dietary ?? "",
          contactName: booking.contactName,
          contactEmail: booking.contactEmail,
          contactPhone: booking.contactPhone ?? "",
          status: STATUS_LABELS[booking.status] ?? booking.status,
          total: booking.priceBreakdown.grandTotal,
          paid: booking.amountPaid,
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
