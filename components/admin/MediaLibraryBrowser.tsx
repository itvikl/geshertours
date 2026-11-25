"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  createMediaCategory,
  deleteMediaCategory,
  deleteUnusedImages,
  listMediaCategories,
  listMediaPage,
  renameMediaCategory,
  setImagesCategory,
} from "@/lib/actions/mediaLibrary";
import { uploadImage } from "@/lib/actions/uploads";
import { countryLabel } from "@/lib/countryNames";
import { useConfirm, useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import type {
  MediaCategory,
  MediaCategoryList,
  MediaLibraryItem,
} from "@/lib/data/admin/mediaLibrary";

/** Pseudo-folders alongside real categories — same values as ALL_MEDIA / UNCATEGORIZED_MEDIA on the server. */
const ALL = "__all";
const UNCATEGORIZED = "__uncategorized";

/**
 * Category-first image library: opens on a grid of folders (custom
 * categories, then one per tour country), and clicking one shows its
 * images, a page at a time as you scroll. "pick" mode (inside
 * MediaLibraryPicker) selects images for a form field; "manage" mode (the
 * Image Library page) creates/renames/deletes categories, assigns images to
 * them, and deletes unused images. Both can upload straight into the open
 * category.
 *
 * Every library image is in our Storage bucket (see lib/media/assets.ts), so
 * thumbnails go through next/image and load small, resized copies.
 */
export default function MediaLibraryBrowser({
  mode,
  multiple = false,
  onPick,
}: {
  mode: "pick" | "manage";
  multiple?: boolean;
  /** pick mode: called with the chosen URLs (once for single, on "Add selected" for multiple). */
  onPick?: (urls: string[]) => void;
}) {
  const [categoryList, setCategoryList] = useState<MediaCategoryList | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // Images of the open scope, loaded page by page.
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const loadedScope = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Searching from the folder view searches every image.
  const scope = categoryId ?? (query.trim() ? ALL : null);

  const reloadCategories = useCallback(async () => {
    try {
      setCategoryList(await listMediaCategories());
      setLoadError(null);
    } catch {
      setLoadError("לא הצלחנו לטעון את ספריית התמונות.");
    }
  }, []);

  /** Loads the page after `cursor` (or the first); `untilEnd` keeps going — search is client-side, so it needs everything. */
  const loadPage = useCallback(
    async (forScope: string, cursor: string | null, untilEnd = false) => {
      setPageLoading(true);
      try {
        let next: string | null = cursor;
        do {
          const page = await listMediaPage(forScope, next);
          // Ignore a late answer for a scope the user already left.
          if (loadedScope.current !== forScope) return;
          const isFirst = next === null;
          setItems((prev) => (isFirst ? page.items : [...prev, ...page.items]));
          setNextCursor(page.nextCursor);
          next = page.nextCursor;
        } while (untilEnd && next);
      } catch {
        setLoadError("לא הצלחנו לטעון את התמונות.");
      } finally {
        setPageLoading(false);
      }
    },
    []
  );

  /** Switches the grid to a new scope (category, ALL, UNCATEGORIZED, or null = folders). */
  function showScope(nextScope: string | null, untilEnd = false) {
    if (nextScope === loadedScope.current) return;
    loadedScope.current = nextScope;
    setItems([]);
    setNextCursor(null);
    if (nextScope) void loadPage(nextScope, null, untilEnd);
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (!value.trim()) {
      if (categoryId === null) showScope(null);
      return;
    }
    if (categoryId === null) showScope(ALL, true);
    else if (nextCursor && !pageLoading && loadedScope.current) {
      void loadPage(loadedScope.current, nextCursor, true);
    }
  }

  /** Re-fetches counts and restarts the open scope from its first page (after any change). */
  const reload = useCallback(async () => {
    const tasks: Promise<void>[] = [reloadCategories()];
    if (loadedScope.current) tasks.push(loadPage(loadedScope.current, null));
    await Promise.all(tasks);
  }, [reloadCategories, loadPage]);

  useEffect(() => {
    listMediaCategories()
      .then(setCategoryList)
      .catch(() => setLoadError("לא הצלחנו לטעון את ספריית התמונות."));
  }, []);

  // Next page when the end of the grid scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!scope || !nextCursor || pageLoading || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadPage(scope, nextCursor);
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scope, nextCursor, pageLoading, loadPage]);

  const categories = useMemo(
    () =>
      (categoryList?.categories ?? []).map((c) => (c.kind === "country" ? { ...c, name: countryLabel(c.name) } : c)),
    [categoryList]
  );
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const current = categoryId ? categoryById.get(categoryId) : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const names = [...item.manualCategoryIds, ...item.autoCategoryIds]
        .map((id) => categoryById.get(id)?.name ?? "")
        .join(" ");
      return `${item.usedIn.join(" ")} ${names}`.toLowerCase().includes(q);
    });
  }, [items, query, categoryById]);

  function openCategory(id: string | null) {
    setCategoryId(id);
    showScope(id);
    // Picking keeps its selection across folders; managing acts per folder.
    if (mode === "manage") setSelected([]);
    setQuery("");
  }

  function toggle(url: string) {
    if (mode === "pick" && !multiple) {
      onPick?.([url]);
      return;
    }
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  }

  /** Runs a library action; a returned string is shown as an error toast. */
  async function run(task: () => Promise<string | null | void>) {
    setBusy(true);
    try {
      const error = await task();
      if (error) toast.error(error);
    } catch {
      toast.error({ title: "משהו השתבש", description: "נסו שוב." });
    }
    setBusy(false);
  }

  const plural = (n: number) => (n === 1 ? "תמונה אחת" : `${n} תמונות`);

  const showFolders = scope === null;
  const canAssignHere = Boolean(current);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        {categoryId !== null ? (
          <button
            type="button"
            onClick={() => openCategory(null)}
            className="text-sm font-medium text-navy hover:text-navy-light"
          >
            → כל הקטגוריות
          </button>
        ) : null}
        <h3 className="text-base font-bold text-ink">
          {categoryId === null
            ? "קטגוריות"
            : categoryId === ALL
              ? "כל התמונות"
              : categoryId === UNCATEGORIZED
                ? "ללא קטגוריה"
                : (current?.name ?? "קטגוריה")}
        </h3>
        {current?.kind === "country" && (
          <span className="rounded-full bg-sand-warm px-2 py-0.5 text-xs font-semibold text-ink-muted">
            מדינה · תמונות של טיולים נוספות אוטומטית
          </span>
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder={categoryId === null ? "חיפוש בכל התמונות…" : "חיפוש בקטגוריה הזו…"}
          className="min-w-44 flex-1 rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-navy"
        />
        {categoryId !== null && (
          <UploadIntoCategory
            disabled={busy}
            label={canAssignHere ? `העלאה ל${current?.name}` : "העלאת תמונות"}
            onUploaded={(urls) =>
              run(async () => {
                if (current) await setImagesCategory(urls, current.id, true);
                await reload();
                toast.success({
                  title: "ההעלאה הסתיימה",
                  description: current ? `${plural(urls.length)} נוספו ל${current.name}.` : `הועלו ${plural(urls.length)}.`,
                });
                if (mode === "pick") {
                  if (!multiple) onPick?.(urls.slice(0, 1));
                  else setSelected((prev) => [...prev, ...urls]);
                }
              })
            }
          />
        )}
        {mode === "manage" && current?.kind === "custom" && (
          <CategoryActions
            category={current}
            disabled={busy}
            onRename={(name) =>
              run(async () => {
                const result = await renameMediaCategory(current.id, name);
                if (!result.ok) return result.error;
                await reload();
                toast.success(`שם הקטגוריה שונה ל״${name}״`);
              })
            }
            onDelete={() =>
              run(async () => {
                await deleteMediaCategory(current.id);
                openCategory(null);
                await reload();
                toast.success({ title: "הקטגוריה נמחקה", description: `״${current.name}״ הוסרה. התמונות שלה נשארות בספרייה.` });
              })
            }
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loadError && <p className="text-sm font-medium text-terracotta-dark">{loadError}</p>}
        {!loadError && categoryList === null && (
          <p className="text-sm text-ink-muted">טוען תמונות…</p>
        )}

        {categoryList !== null && showFolders && (
          <FolderGrid
            categories={categories}
            allCount={categoryList.totalCount}
            uncategorizedCount={categoryList.uncategorizedCount}
            onOpen={openCategory}
            onCreate={(name) =>
              run(async () => {
                const result = await createMediaCategory(name);
                if (!result.ok) return result.error;
                await reload();
                toast.success(`הקטגוריה ״${name}״ נוצרה`);
              })
            }
            disabled={busy}
          />
        )}

        {categoryList !== null && !showFolders && (
          <>
            {visible.length === 0 && !pageLoading && !nextCursor && (
              <p className="text-sm text-ink-muted">
                {query.trim()
                  ? "אין תמונות מתאימות."
                  : "עדיין אין תמונות בקטגוריה — העלו תמונות, או הוסיפו תמונות קיימות מקטגוריה אחרת."}
              </p>
            )}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {visible.map((item) => (
                <ImageTile
                  key={item.url}
                  item={item}
                  categoryById={categoryById}
                  selectedIndex={selected.indexOf(item.url)}
                  onToggle={() => toggle(item.url)}
                />
              ))}
            </ul>
            <div ref={sentinelRef} aria-hidden="true" />
            {pageLoading && <p className="mt-3 text-sm text-ink-muted">טוען תמונות…</p>}
          </>
        )}
      </div>

      {/* Selection bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <span className="text-sm text-ink-muted">נבחרו {selected.length}</span>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-sm font-medium text-ink-muted hover:text-ink"
          >
            ניקוי
          </button>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {mode === "manage" && (
              <>
                <AssignSelect
                  categories={categories}
                  disabled={busy}
                  onAssign={(id) =>
                    run(async () => {
                      await setImagesCategory(selected, id, true);
                      await reload();
                      toast.success(`${plural(selected.length)} נוספו ל${categoryById.get(id)?.name ?? "קטגוריה"}`);
                    })
                  }
                />
                {current && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await setImagesCategory(selected, current.id, false);
                        const stillAuto = selected.filter((url) =>
                          items.find((i) => i.url === url)?.autoCategoryIds.includes(current.id)
                        ).length;
                        const removed = selected.length - stillAuto;
                        setSelected([]);
                        await reload();
                        if (removed > 0) toast.success(`${plural(removed)} הוסרו מ${current.name}`);
                        if (stillAuto > 0) {
                          toast.info({
                            title: `${plural(stillAuto)} נשארו ב${current.name}`,
                            description: `הן נשארות כאן אוטומטית כי טיול ל${current.name} משתמש בהן.`,
                          });
                        }
                      })
                    }
                    className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sand-warm disabled:opacity-60"
                  >
                    הסרה מ{current.name}
                  </button>
                )}
                <DeleteImagesButton
                  count={selected.length}
                  disabled={busy}
                  onDelete={() =>
                    run(async () => {
                      const result = await deleteUnusedImages(selected);
                      setSelected([]);
                      await reload();
                      if (result.deleted > 0) toast.success(`נמחקו ${plural(result.deleted)}`);
                      if (result.inUse > 0) {
                        toast.warning({
                          title: `${plural(result.inUse)} לא נמחקו`,
                          description: "הן מופיעות באתר — הסירו אותן קודם מהדף שבו הן מופיעות.",
                        });
                      }
                    })
                  }
                />
              </>
            )}
            {mode === "pick" && (
              <button
                type="button"
                onClick={() => onPick?.(selected)}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
              >
                הוספת הנבחרות
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FolderGrid({
  categories,
  allCount,
  uncategorizedCount,
  onOpen,
  onCreate,
  disabled,
}: {
  categories: MediaCategory[];
  allCount: number;
  uncategorizedCount: number;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  disabled: boolean;
}) {
  const [newName, setNewName] = useState("");
  const custom = categories.filter((c) => c.kind === "custom");
  const countries = categories.filter((c) => c.kind === "country");

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          onCreate(newName);
          setNewName("");
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="שם קטגוריה חדשה, למשל: בתי כנסת"
          maxLength={60}
          className="min-w-52 flex-1 rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-navy sm:max-w-sm"
        />
        <button
          type="submit"
          disabled={disabled || !newName.trim()}
          title={!newName.trim() ? "הקלידו קודם שם לקטגוריה" : undefined}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-40"
        >
          + יצירת קטגוריה
        </button>
      </form>

      <FolderSection title="הספרייה">
        <Folder name="כל התמונות" count={allCount} onClick={() => onOpen(ALL)} />
        <Folder name="ללא קטגוריה" count={uncategorizedCount} onClick={() => onOpen(UNCATEGORIZED)} />
      </FolderSection>

      {custom.length > 0 && (
        <FolderSection title="הקטגוריות שלי">
          {custom.map((c) => (
            <Folder key={c.id} name={c.name} count={c.imageCount} onClick={() => onOpen(c.id)} />
          ))}
        </FolderSection>
      )}

      {countries.length > 0 && (
        <FolderSection title="מדינות">
          {countries.map((c) => (
            <Folder
              key={c.id}
              name={c.name}
              count={c.imageCount}
              onClick={() => onOpen(c.id)}
              country
            />
          ))}
        </FolderSection>
      )}
    </div>
  );
}

function FolderSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
    </section>
  );
}

function Folder({
  name,
  count,
  onClick,
  country = false,
}: {
  name: string;
  count: number;
  onClick: () => void;
  country?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-start transition-colors hover:border-navy hover:bg-sand-warm/40"
    >
      <span className="text-xl" aria-hidden="true">
        {country ? "🌍" : "📁"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{name}</span>
        <span className="block text-xs text-ink-muted">
          {count === 1 ? "תמונה אחת" : `${count} תמונות`}
        </span>
      </span>
    </button>
  );
}

function ImageTile({
  item,
  categoryById,
  selectedIndex,
  onToggle,
}: {
  item: MediaLibraryItem;
  categoryById: Map<string, MediaCategory>;
  selectedIndex: number;
  onToggle: () => void;
}) {
  const isSelected = selectedIndex >= 0;
  const categoryNames = Array.from(new Set([...item.manualCategoryIds, ...item.autoCategoryIds]))
    .map((id) => categoryById.get(id)?.name)
    .filter(Boolean);
  const tooltip = [
    item.usedIn.length ? `מופיעה ב:\n${item.usedIn.join("\n")}` : "עדיין לא בשימוש",
    categoryNames.length ? `קטגוריות: ${categoryNames.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        title={tooltip}
        className={`block w-full overflow-hidden rounded-lg border-2 text-start transition-colors ${
          isSelected ? "border-navy" : "border-transparent hover:border-line"
        }`}
      >
        <span className="relative block aspect-[4/3] bg-sand-warm">
          <Image
            src={item.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 200px, 45vw"
            className="object-cover"
          />
          {isSelected && (
            <span className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
              {selectedIndex + 1}
            </span>
          )}
        </span>
        <span className="block truncate px-1.5 pt-1 text-xs text-ink-muted">
          {item.usedIn[0] ?? "לא בשימוש"}
          {item.usedIn.length > 1 ? ` +${item.usedIn.length - 1}` : ""}
        </span>
        {categoryNames.length > 0 && (
          <span className="block truncate px-1.5 pb-1 text-[11px] text-navy/80">
            {categoryNames.join(" · ")}
          </span>
        )}
      </button>
    </li>
  );
}

function DeleteImagesButton({
  count,
  disabled,
  onDelete,
}: {
  count: number;
  disabled: boolean;
  onDelete: () => void;
}) {
  const confirm = useConfirm();

  async function handleClick() {
    const ok = await confirm({
      title: count === 1 ? "למחוק את התמונה לצמיתות?" : `למחוק ${count} תמונות לצמיתות?`,
      description: "תמונות שמופיעות באתר לא יימחקו.",
      confirmLabel: "מחיקה",
      tone: "danger",
    });
    if (ok) onDelete();
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-terracotta-dark transition-colors hover:bg-sand-warm disabled:opacity-60"
    >
      מחיקת תמונות
    </button>
  );
}

function AssignSelect({
  categories,
  disabled,
  onAssign,
}: {
  categories: MediaCategory[];
  disabled: boolean;
  onAssign: (categoryId: string) => void;
}) {
  return (
    <select
      value=""
      disabled={disabled || categories.length === 0}
      title={categories.length === 0 ? "צרו קודם קטגוריה" : undefined}
      onChange={(e) => e.target.value && onAssign(e.target.value)}
      className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-navy disabled:opacity-60"
    >
      <option value="">הוספה לקטגוריה…</option>
      {categories.some((c) => c.kind === "custom") && (
        <optgroup label="הקטגוריות שלי">
          {categories
            .filter((c) => c.kind === "custom")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </optgroup>
      )}
      <optgroup label="מדינות">
        {categories
          .filter((c) => c.kind === "country")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </optgroup>
    </select>
  );
}

function CategoryActions({
  category,
  disabled,
  onRename,
  onDelete,
}: {
  category: MediaCategory;
  disabled: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: `למחוק את ״${category.name}״?`,
      description: "התמונות שלה נשארות בספרייה (ללא קטגוריה, אם זו הייתה הקטגוריה היחידה שלהן).",
      confirmLabel: "מחיקת הקטגוריה",
      tone: "danger",
    });
    if (ok) onDelete();
  }

  return (
    <span className="inline-flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const name = window.prompt("שם חדש לקטגוריה", category.name);
          if (name && name.trim() !== category.name) onRename(name);
        }}
        className="font-medium text-ink-muted hover:text-ink"
      >
        שינוי שם
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={handleDelete}
        className="font-medium text-ink-muted hover:text-terracotta-dark"
      >
        מחיקה
      </button>
    </span>
  );
}

function UploadIntoCategory({
  label,
  disabled,
  onUploaded,
}: {
  label: string;
  disabled: boolean;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImage(formData, "library").catch(() => ({ ok: false as const, error: "Upload failed." }));
      if (result.ok) urls.push(result.url);
      else toast.error({ title: `ההעלאה של ${file.name} נכשלה`, description: result.error });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (urls.length > 0) onUploaded(urls);
  }

  return (
    <span className="inline-flex flex-col">
      <label className="inline-flex cursor-pointer items-center rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        {uploading ? "מעלה…" : `+ ${label}`}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={disabled || uploading}
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </span>
  );
}
