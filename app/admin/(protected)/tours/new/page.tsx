import type { Metadata } from "next";
import TourEditorForm from "@/components/admin/TourEditorForm";

export const metadata: Metadata = { title: "טיול חדש" };

export default function NewTourPage() {
  return <TourEditorForm mode="create" />;
}
