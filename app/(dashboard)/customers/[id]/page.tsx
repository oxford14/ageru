import { redirect } from "next/navigation";

// Customer profiles open inside the client book; keep old links working.
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/customers?c=${encodeURIComponent(id)}`);
}
