import type { Metadata } from "next";
import { getAllToursAdmin } from "@/lib/data/admin/tours";
import { getAllDeparturesAdmin } from "@/lib/data/admin/bookings";
import BookingManualForm from "@/components/admin/BookingManualForm";

export const metadata: Metadata = { title: "הזמנה חדשה" };

export default async function NewBookingPage() {
  const [tours, departures] = await Promise.all([getAllToursAdmin(), getAllDeparturesAdmin()]);
  const publishedTours = tours
    .filter((t) => t.status !== "archived")
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">הזמנה חדשה</h1>
        <p className="mt-1 text-sm text-ink-muted">
          רישום הזמנה שהתקבלה בטלפון או בדרך אחרת שאינה באתר.
        </p>
      </div>
      <BookingManualForm tours={publishedTours} departures={departures} />
    </div>
  );
}
