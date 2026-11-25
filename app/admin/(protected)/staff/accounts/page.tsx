import type { Metadata } from "next";
import Link from "next/link";
import { requireAccountManager } from "@/lib/auth/dal";
import { getTwoFactorUidsAdmin, listAdminUsersAdmin } from "@/lib/data/admin/adminUsers";
import AdminUserRoleForm from "@/components/admin/AdminUserRoleForm";
import AccountRoleSelect from "@/components/admin/AccountRoleSelect";
import DeleteAdminAccountButton from "@/components/admin/DeleteAdminAccountButton";
import ResetTwoFactorButton from "@/components/admin/ResetTwoFactorButton";
import { isAdmin2faRequired } from "@/lib/auth/mfa";
import {
  ADMIN_ROLES,
  assignableRoles,
  canManageAccount,
  isAdminRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  roleLabel,
} from "@/lib/auth/roles";

export const metadata: Metadata = { title: "חשבונות ניהול" };

export default async function AdminAccountsPage() {
  const session = await requireAccountManager();
  const users = await listAdminUsersAdmin();
  // Highest role first, then by email.
  const rank = (role: unknown) => (isAdminRole(role) ? ADMIN_ROLES.indexOf(role) : ADMIN_ROLES.length);
  users.sort((a, b) => rank(a.role) - rank(b.role) || (a.email ?? "").localeCompare(b.email ?? ""));
  const twoFactorUids = await getTwoFactorUidsAdmin(users.map((u) => u.uid));
  const required = isAdmin2faRequired();
  const roles = assignableRoles(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">חשבונות ניהול</h1>
        <p className="mt-1 text-sm text-ink-muted">
          מי יכול להיכנס למערכת הניהול. רק מפתחים ומנהלי על רואים את הדף הזה.
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          אימות דו-שלבי{" "}
          <strong className="text-ink">{required ? "חובה" : "רשות"}</strong> לכל החשבונות
          {required
            ? " — חשבונות עם אפליקציית אימות מזינים את הקוד ממנה; כל השאר מקבלים קוד במייל בכל כניסה."
            : " — חשבונות שהגדירו אפליקציית אימות מזינים את הקוד ממנה בכל כניסה."}
        </p>
      </div>

      <details className="mb-6 rounded-xl border border-line bg-white p-5 text-sm">
        <summary className="cursor-pointer font-semibold text-ink">מה כל תפקיד יכול לעשות</summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {ADMIN_ROLES.map((r) => (
            <div key={r} className="contents">
              <dt className="font-medium text-ink">{ROLE_LABELS[r]}</dt>
              <dd className="text-ink-muted">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
      </details>

      <AdminUserRoleForm roles={roles} />

      <div className="mt-6 overflow-hidden overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[560px] text-start text-sm">
          <thead className="border-b border-line bg-sand-warm/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">אימייל</th>
              <th className="px-4 py-3">תפקיד</th>
              <th className="px-4 py-3">אימות דו-שלבי</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => {
              const isSelf = user.uid === session.uid;
              const manageable = !isSelf && isAdminRole(user.role) && canManageAccount(session.role, user.role);
              return (
                <tr key={user.uid}>
                  <td className="px-4 py-3 text-ink">
                    {user.email ?? "—"}
                    {isSelf && (
                      <Link href="/admin/account" className="ms-2 text-xs text-ink-muted hover:text-ink hover:underline">
                        (זה אתם — לניהול ב״החשבון שלי״)
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {manageable && isAdminRole(user.role) ? (
                      <AccountRoleSelect uid={user.uid} email={user.email} role={user.role} options={roles} />
                    ) : (
                      roleLabel(user.role)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {twoFactorUids.has(user.uid) ? (
                      <span className="font-medium text-olive">אפליקציה</span>
                    ) : required ? (
                      <span className="font-medium text-olive">מייל</span>
                    ) : (
                      <span className="text-ink-muted">כבוי</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    {manageable && (
                      <span className="inline-flex items-start justify-end gap-1">
                        {twoFactorUids.has(user.uid) && <ResetTwoFactorButton uid={user.uid} email={user.email} />}
                        <DeleteAdminAccountButton uid={user.uid} email={user.email} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
