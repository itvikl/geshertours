"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderTours } from "@/lib/actions/tours";
import { formatUsd } from "@/lib/pricing";
import { countryLabel } from "@/lib/countryNames";
import { TOUR_STATUS_LABELS } from "@/lib/adminLabels";
import type { Tour, TourStatus } from "@/lib/types";
import DuplicateTourButton from "@/components/admin/DuplicateTourButton";
import ArchiveTourButton from "@/components/admin/ArchiveTourButton";
import { IconLink } from "@/components/admin/IconAction";

export interface UpcomingCapacity {
  departureCount: number;
  totalCapacity: number;
  totalAvailable: number;
}

interface TourRowData {
  tour: Tour;
  capacity: UpcomingCapacity;
}

/**
 * `limited` = SEO admin (lib/auth/roles.ts): no departure-dates link, and no
 * archiving of live tours (they could then delete them).
 */
export default function SortableToursTable({
  rows: initialRows,
  limited = false,
}: {
  rows: TourRowData[];
  limited?: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  // Re-sync when the server sends fresh rows (router.refresh after archive,
  // revalidation after duplicate) — useState alone would keep the stale list.
  const [syncedRows, setSyncedRows] = useState(initialRows);
  if (initialRows !== syncedRows) {
    setSyncedRows(initialRows);
    setRows(initialRows);
  }
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.tour.tourId === active.id);
    const newIndex = rows.findIndex((r) => r.tour.tourId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rows, oldIndex, newIndex);
    setRows(reordered);

    startTransition(async () => {
      const result = await reorderTours(reordered.map((r) => r.tour.tourId));
      if (!result.ok) setRows(rows); // revert on failure
    });
  }

  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { tour } of rows) {
      for (const c of new Set(tour.countries)) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const needle = query.trim().toLowerCase();
  const isFiltered = needle !== "" || country !== "";
  const visibleRows = isFiltered
    ? rows.filter(
        ({ tour }) =>
          (!needle || tour.title.toLowerCase().includes(needle) || tour.slug.toLowerCase().includes(needle)) &&
          (!country || tour.countries.includes(country))
      )
    : rows;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם הטיול…"
          aria-label="חיפוש לפי שם הטיול"
          className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label="סינון לפי מדינה"
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy"
        >
          <option value="">כל המדינות</option>
          {countryOptions.map(([name, count]) => (
            <option key={name} value={name}>
              {countryLabel(name)} ({count})
            </option>
          ))}
        </select>
        {isFiltered && (
          <>
            <span className="text-sm text-ink-muted">
              מוצגים {visibleRows.length} מתוך {rows.length} — אי אפשר לשנות סדר בזמן סינון
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCountry("");
              }}
              className="text-sm font-medium text-navy hover:text-navy-light"
            >
              ניקוי הסינון
            </button>
          </>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-ink-muted">
          אין טיולים שמתאימים לסינון.
        </p>
      ) : (
        <div className="overflow-hidden overflow-x-auto rounded-xl border border-line bg-white">
          {/* DndContext wraps the <table> (not the <tbody>) because it renders its
              screen-reader live-region <div>s as siblings — a <div> inside a
              <table> is invalid HTML and caused a hydration error. */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead className="border-b border-line bg-sand-warm/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="w-8 px-2 py-3" />
                  <th className="px-4 py-3">טיול</th>
                  <th className="px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3">מדינות</th>
                  <th className="px-4 py-3">מחיר החל מ-</th>
                  <th className="px-4 py-3">מקומות</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <SortableContext
                items={visibleRows.map((r) => r.tour.tourId)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-line">
                  {visibleRows.map(({ tour, capacity }) => (
                    <SortableTourRow key={tour.tourId} tour={tour} capacity={capacity} dragDisabled={isFiltered} limited={limited} />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SortableTourRow({
  tour,
  capacity,
  dragDisabled,
  limited,
}: TourRowData & { dragDisabled: boolean; limited: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tour.tourId,
    // Reordering saves the full list order, so it only makes sense on the unfiltered list.
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="align-middle bg-white">
      <td className="px-2 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={dragDisabled}
          className="cursor-grab touch-none px-1 text-ink-muted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`שינוי מיקום: ${tour.title}`}
        >
          ⠿
        </button>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-ink">{tour.title}</p>
        <p className="text-xs text-ink-muted">/{tour.slug}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={tour.status} />
          {tour.isLegacyMigrated && (
            <span
              className="inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-terracotta-dark"
              title="יובא מהאתר הישן — יש לבדוק מחירים, מועדים ומדינות לפני פרסום"
            >
              יובא
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-ink-muted">{tour.countries.map(countryLabel).join(", ")}</td>
      <td className="px-4 py-3 text-ink-muted">
        {formatUsd(tour.pricing.pricePerPersonDouble)}
      </td>
      <td className="px-4 py-3">
        {capacity.departureCount === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-2.5 py-0.5 text-xs font-semibold text-terracotta-dark">
            אין מועדים עתידיים
          </span>
        ) : (
          <div>
            <p className="font-medium text-ink">
              נותרו {capacity.totalAvailable} מתוך {capacity.totalCapacity}
            </p>
            <p className="text-xs text-ink-muted">
              {capacity.departureCount === 1 ? "מועד קרוב אחד" : `${capacity.departureCount} מועדים קרובים`}
            </p>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-end">
        <div className="flex items-center justify-end gap-1">
          <IconLink href={`/admin/tours/${tour.tourId}/preview`} icon="eye" label="תצוגה מקדימה" newTab />
          {!limited && (
            <IconLink href={`/admin/tours/${tour.tourId}/departures`} icon="calendar" label="מועדי יציאה" />
          )}
          <IconLink href={`/admin/tours/${tour.tourId}`} icon="edit" label="עריכה" />
          <DuplicateTourButton tourId={tour.tourId} variant="link" />
          {tour.status !== "archived" && !(limited && tour.status === "published") && (
            <ArchiveTourButton tourId={tour.tourId} title={tour.title} />
          )}
        </div>
      </td>
    </tr>
  );
}

const STATUS_STYLES: Record<TourStatus, string> = {
  draft: "bg-gold/15 text-terracotta-dark",
  published: "bg-olive/15 text-olive",
  archived: "bg-ink-muted/15 text-ink-muted",
};

function StatusBadge({ status }: { status: TourStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {TOUR_STATUS_LABELS[status]}
    </span>
  );
}
