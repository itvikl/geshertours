"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/feedback/AdminFeedbackProvider";
import { addAdminAccount } from "@/lib/actions/adminUsers";
import { ROLE_LABELS, type AdminRole } from "@/lib/auth/roles";

/**
 * "Add account": creates the login when the email has none yet (password
 * required), otherwise just sets the role on the existing login.
 */
export default function AdminUserRoleForm({ roles }: { roles: AdminRole[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>(roles.includes("staff") ? "staff" : roles[0]);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    let result;
    try {
      result = await addAdminAccount({ email, password, role });
    } catch {
      setSaving(false);
      toast.error({ title: "השמירה נכשלה", description: "משהו השתבש בשרת — נסו שוב." });
      return;
    }
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      toast.error({
        title: "החשבון לא נשמר",
        description: result.errors.email?.[0] ?? result.errors.password?.[0] ?? result.errors.role?.[0] ?? "בדקו את הפרטים ונסו שוב.",
      });
      return;
    }

    toast.success(
      result.created
        ? {
            title: "החשבון נוצר",
            description: `נוצר חשבון עבור ${email}. העבירו להם את הסיסמה — הכניסה בכתובת /admin/login.`,
            duration: 8000,
          }
        : { title: "ההרשאה עודכנה", description: `ל-${email} כבר היה חשבון — התפקיד שלו עכשיו: ${ROLE_LABELS[role]}.` }
    );
    setEmail("");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-base font-bold text-ink">הוספת חשבון</h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        מייל חדש: יוצר חשבון עם הסיסמה הזו. חשבון קיים: משנה רק את התפקיד
        (אפשר להשאיר את הסיסמה ריקה).
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="email">
            אימייל
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-64 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
          {errors.email && <p className="mt-1 text-xs text-terracotta-dark">{errors.email[0]}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="password">
            סיסמה
          </label>
          <input
            id="password"
            type="text"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="לפחות 8 תווים"
            className="mt-1.5 w-52 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
          {errors.password && (
            <p className="mt-1 max-w-52 text-xs text-terracotta-dark">{errors.password[0]}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="role">
            תפקיד
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="mt-1.5 w-40 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-7 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
        >
          {saving ? "שומר…" : "הוספת חשבון"}
        </button>
      </div>
    </form>
  );
}
