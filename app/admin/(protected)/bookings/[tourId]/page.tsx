import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookingCountsByDepartureForTourAdmin } from "@/lib/data/admin/bookings";
import { getTourByIdAdmin } from "@/lib/data/admin/tours";
import { availableSeats } from "@/lib/types";
import NewBookingsBadge from "@/components/admin/NewBookingsBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tourId: string }>;
}): Promise<Metadata> {
  const { tourId } = await params;
  const tour = await getTourByIdAdmin(tourId);
  return { title: tour ? `${tour.title} — הזמנות` : "הזמנות" };
}

export default async function TourDeparturesBookingsPage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const { tourId } = await params;
  const [tour, rows] = await Promise.all([
    getTourByIdAdmin(tourId),
    getBookingCountsByDepartureForTourAdmin(tourId),
  ]);
  if (!tour) notFound();

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm font-medium text-navy hover:text-navy-light">
        → כל הטיולים
      </Link>

      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{tour.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {rows.length === 1 ? "מועד יציאה אחד" : `${rows.length} מועדי יציאה`} — בחרו מועד כדי לראות את
          הנרשמים
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-ink-muted">
          עדיין אין מועדי יציאה לטיול הזה.
        </p>
      ) : (
        <div className="overflow-hidden overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="border-b border-line bg-sand-warm/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">תאריכים</th>
                <th className="px-4 py-3">מקומות</th>
                <th className="px-4 py-3">נרשמים</th>
                <th className="px-4 py-3">מטיילים</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ departure, registrantCount, travelerCount, newCount }) => (
                <tr key={departure.departureId} className="align-middle">
                  <td className="px-4 py-3 text-ink">
                    <div className="flex flex-col">
                      <NewBookingsBadge count={newCount} />
                      <span>
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
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {departure.capacityBooked}/{departure.capacityTotal} ·{" "}
                    נותרו {availableSeats(departure)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{registrantCount}</td>
                  <td className="px-4 py-3 text-ink-muted">{travelerCount}</td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      href={`/admin/bookings/${tourId}/${departure.departureId}`}
                      className="text-sm font-medium text-navy hover:text-navy-light"
                    >
                      צפייה בנרשמים
                    </Link>
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
