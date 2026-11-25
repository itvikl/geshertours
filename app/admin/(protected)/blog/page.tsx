import Link from "next/link";
import { PUBLISH_STATUS_LABELS } from "@/lib/adminLabels";
import type { Metadata } from "next";
import { getAllBlogPostsAdmin } from "@/lib/data/admin/blog";
import type { BlogPost } from "@/lib/types";
import { formatBlogDate } from "@/lib/blogDate";
import { IconLink } from "@/components/admin/IconAction";

export const metadata: Metadata = { title: "בלוג" };

export default async function AdminBlogPage() {
  const posts = await getAllBlogPostsAdmin();
  // Newest first — matches the public /blog ordering, and keeps recent posts
  // reachable now that the legacy migration added 58 of them (an A–Z sort
  // buried anything written this year).
  posts.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">בלוג</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {posts.length === 1 ? "פוסט אחד" : `${posts.length} פוסטים`}
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          + פוסט חדש
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-ink-muted">
          עדיין אין פוסטים. צרו את הפוסט הראשון כדי להתחיל.
        </p>
      ) : (
        <div className="overflow-hidden overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[600px] text-start text-sm">
            <thead className="border-b border-line bg-sand-warm/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">פוסט</th>
                <th className="px-4 py-3">סטטוס</th>
                <th className="px-4 py-3">תאריך פרסום</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {posts.map((post) => (
                <tr key={post.postId} className="align-middle">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{post.title}</p>
                    <p className="text-xs text-ink-muted">/blog/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatBlogDate(post.publishedAt, "short") || "—"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <IconLink href={`/admin/blog/${post.postId}`} icon="edit" label="עריכה" />
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

const STATUS_STYLES: Record<BlogPost["status"], string> = {
  draft: "bg-gold/15 text-terracotta-dark",
  published: "bg-olive/15 text-olive",
};

function StatusBadge({ status }: { status: BlogPost["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {PUBLISH_STATUS_LABELS[status]}
    </span>
  );
}
