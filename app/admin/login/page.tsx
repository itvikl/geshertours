import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import BrandLogo from "@/components/marketing/BrandLogo";

export const metadata: Metadata = {
  title: "כניסה לניהול",
  robots: { index: false, follow: false },
};

/** Set by the My account page after a change that ends the current session. */
const NOTICES: Record<string, string> = {
  "password-changed": "הסיסמה שונתה. היכנסו עם הסיסמה החדשה.",
  "2fa-off": "אפליקציית האימות הוסרה. היכנסו שוב.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { notice } = await searchParams;
  const initialNotice = typeof notice === "string" ? (NOTICES[notice] ?? null) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-warm px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-[0_20px_50px_rgba(36,31,24,0.08)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandLogo onLightBackground />
          <p className="text-sm font-medium text-ink-muted">כניסה לניהול</p>
        </div>
        <LoginForm initialNotice={initialNotice} />
      </div>
    </div>
  );
}
