import "server-only";
import ExcelJS from "exceljs";
import type { AdminLeadRow } from "@/lib/data/admin/leads";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/leadLabels";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL");
}

/** Leads export — one row per lead, newest first (same order as the admin table). */
export async function buildLeadsWorkbook(rows: AdminLeadRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("פניות", { views: [{ rightToLeft: true }] });
  sheet.columns = [
    { header: "התקבלה", key: "received", width: 12 },
    { header: "שם", key: "name", width: 24 },
    { header: "אימייל", key: "email", width: 28 },
    { header: "טלפון", key: "phone", width: 18 },
    { header: "מדינה", key: "country", width: 16 },
    { header: "טיול", key: "tour", width: 32 },
    { header: "יעד", key: "destination", width: 20 },
    { header: "גודל הקבוצה", key: "groupSize", width: 11 },
    { header: "מתאריך", key: "travelStartDate", width: 12 },
    { header: "עד תאריך", key: "travelEndDate", width: 12 },
    { header: "מקור", key: "source", width: 14 },
    { header: "סטטוס", key: "status", width: 12 },
    { header: "הודעה", key: "message", width: 50 },
    { header: "הערות", key: "notes", width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const { lead, tour } of rows) {
    sheet.addRow({
      received: formatDate(lead.createdAt),
      name: lead.name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      country: lead.country ?? "",
      tour: tour?.title ?? "",
      destination: lead.destination ?? "",
      groupSize: lead.groupSize ?? "",
      travelStartDate: lead.travelStartDate ?? "",
      travelEndDate: lead.travelEndDate ?? "",
      source: LEAD_SOURCE_LABELS[lead.source] ?? lead.source,
      status: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
      message: lead.message ?? "",
      notes: lead.notes ?? "",
    });
  }
  sheet.getColumn("message").alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn("notes").alignment = { wrapText: true, vertical: "top" };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
