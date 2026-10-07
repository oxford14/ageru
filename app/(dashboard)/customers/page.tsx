import { getCustomerDetailAction, listCustomersAction } from "@/app/actions/customers";
import { requireOwner } from "@/lib/auth/owner";
import { PageHeader } from "@/components/app/page-header";
import { CustomerBook } from "@/components/customers/customer-book";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await requireOwner();
  const { c } = await searchParams;
  const [list, detail] = await Promise.all([
    listCustomersAction(),
    c ? getCustomerDetailAction(c) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Your client book. Every order is tagged to a customer, so their links and spend live here."
        className={c ? "hidden lg:flex" : undefined}
      />
      {list.ok ? (
        <CustomerBook
          customers={list.data}
          selectedId={c ?? null}
          detail={detail?.ok ? detail.data : null}
          detailError={detail && !detail.ok ? detail.error : null}
        />
      ) : (
        <p className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          {list.error}
        </p>
      )}
    </div>
  );
}
