import { redirect } from "next/navigation";

// Ordering happens in the composer modal; keep old links and bookmarks working
// by opening it on top of the orders list.
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; link?: string; quantity?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ compose: "1" });
  if (params.service) qs.set("service", params.service);
  if (params.link) qs.set("link", params.link);
  if (params.quantity) qs.set("quantity", params.quantity);
  redirect(`/orders?${qs}`);
}
