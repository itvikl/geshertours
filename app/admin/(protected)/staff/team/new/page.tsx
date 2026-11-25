import type { Metadata } from "next";
import StaffMemberForm from "@/components/admin/StaffMemberForm";

export const metadata: Metadata = { title: "איש/אשת צוות חדש/ה" };

export default function NewStaffMemberPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">איש/אשת צוות חדש/ה</h1>
      </div>
      <StaffMemberForm mode="create" />
    </div>
  );
}
