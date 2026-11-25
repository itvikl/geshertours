import Link from "next/link";
import { DEPARTURE_STATUS_LABELS } from "@/lib/adminLabels";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTourByIdAdmin } from "@/lib/data/admin/tours";
import { getDeparturesForTour } from "@/lib/data/tours";
import { getAllStaffAdmin } from "@/lib/data/admin/staff";
import { availableSeats, type Departure } from "@/lib/types";
import CancelDepartureButton from "@/components/admin/CancelDepartureButton";
import { IconLink } from "@/components/admin/IconAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tourId: string }>;
}): Promise<Metadata> {
  const { tourId } = await params;
  const tour = await getTourByIdAdmin(tourId);
  return { title: tour ? `מועדי יציאה — ${tour.title}` : "מועדי יציאה" };
}

export default async function TourDeparturesPage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const { tourId } = await params;
  const [tour, departures, staff] = await Promise.all([
    getTourByIdAdmin(tourId),
    getDeparturesForTour(tourId),
    getAllStaffAdmin(),
  ]);
  if (!tour) notFound();

  const staffById = new Map(staff.map((s) => [s.staffId, s]));

  return (
    <div>
      <p className="mb-1 text-sm text-ink-muted">
        <Link href={`/admin/tours/${tourId}`} className="hover:text-ink">
          {tour.title}
        </Link>
      </p>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">מועדי יציאה</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {departures.length === 1 ? "מועד אחד" : `${departures.length} מועדים`}
          </p>
        </div>
        <Link
          href={`/admin/tours/${tourId}/departures/new`}
          className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          + מועד יציאה חדש
        </Link>
      </div>

      {departures.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-ink-muted">
          עדיין אין מועדי יציאה. הוסיפו מועד כדי שאפשר יהיה להירשם לטיול.
        </p>
      ) : (
        <div className="overflow-hidden overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead className="border-b border-line bg-sand-warm/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">תאריכים</th>
                <th className="px-4 py-3">סטטוס</th>
                <th className="px-4 py-3">מקומות</th>
                <th className="px-4 py-3">מדריך/ה</th>
                <th className="px-4 py-3">משגיח/ת כשרות</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {departures.map((departure) => (
                <tr key={departure.departureId} className="align-middle">
                  <td className="px-4 py-3 text-ink">
                    {new Date(departure.startDate).toLocaleDateString("he-IL", {
                      timeZone: "UTC",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    –{" "}
                    {new Date(departure.endDate).toLocaleDateString("he-IL", {
                      timeZone: "UTC",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={departure.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {departure.capacityBooked}/{departure.capacityTotal} ·{" "}
                    נותרו {availableSeats(departure)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {departure.guideId ? (staffById.get(departure.guideId)?.name ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {departure.kashrutSupervisorId
                      ? (staffById.get(departure.kashrutSupervisorId)?.name ?? "—")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-3">
                      <IconLink href={`/admin/tours/${tourId}/departures/${departure.departureId}`} icon="edit" label="עריכה" />
                      {departure.status !== "cancelled" && (
                        <CancelDepartureButton
                          departureId={departure.departureId}
                          tourId={tourId}
                          label={departure.startDate}
                        />
                      )}
                    </div>
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

const STATUS_STYLES: Record<Departure["status"], string> = {
  open: "bg-olive/15 text-olive",
  closed: "bg-ink-muted/15 text-ink-muted",
  soldout: "bg-gold/15 text-terracotta-dark",
  cancelled: "bg-terracotta/15 text-terracotta-dark",
};

function StatusBadge({ status }: { status: Departure["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {DEPARTURE_STATUS_LABELS[status]}
    </span>
  );
}
