import Link from "next/link";
import type { Metadata } from "next";
import { getAllStaffAdmin } from "@/lib/data/admin/staff";
import { IconLink } from "@/components/admin/IconAction";

export const metadata: Metadata = { title: "הצוות" };

export default async function AdminStaffTeamPage() {
  const staff = await getAllStaffAdmin();
  staff.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">הצוות</h1>
          <p className="mt-1 text-sm text-ink-muted">מדריכים ומשגיחי כשרות שמשובצים למועדי היציאה.</p>
        </div>
        <Link
          href="/admin/staff/team/new"
          className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          + איש/אשת צוות חדש/ה
        </Link>
      </div>

      {staff.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-ink-muted">
          עדיין אין אנשי צוות.
        </p>
      ) : (
        <div className="overflow-hidden overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[500px] text-start text-sm">
            <thead className="border-b border-line bg-sand-warm/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">תפקיד</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {staff.map((member) => (
                <tr key={member.staffId} className="align-middle">
                  <td className="px-4 py-3 font-semibold text-ink">{member.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {member.role === "guide" ? "מדריך/ה" : "משגיח/ת כשרות"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <IconLink href={`/admin/staff/team/${member.staffId}`} icon="edit" label="עריכה" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
