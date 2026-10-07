"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Pencil, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerListItem,
} from "@/app/actions/customers";
import { timeAgo } from "@/lib/panel/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15";

type Editing = { mode: "create" } | { mode: "edit"; customer: CustomerListItem } | null;

export function CustomersManager({ customers }: { customers: CustomerListItem[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.notes ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers…"
            className={cn(fieldClass, "pl-9")}
          />
        </div>
        <Button type="button" onClick={() => setEditing({ mode: "create" })}>
          <UserPlus className="size-4" />
          Add customer
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {customers.length === 0
            ? "No customers yet. Add one to tag orders and track boosted links."
            : "No matches for your search."}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {visible.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/customers/${c.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="font-medium tracking-[-0.01em]">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.orderCount} order{c.orderCount === 1 ? "" : "s"}
                  {c.lastOrderAt ? ` · last ${timeAgo(c.lastOrderAt)}` : ""}
                </p>
              </Link>
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Edit ${c.name}`}
                onClick={() => setEditing({ mode: "edit", customer: c })}
              >
                <Pencil className="size-4" />
              </button>
              <Link
                href={`/customers/${c.id}`}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`View ${c.name}`}
              >
                <ChevronRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CustomerDialog editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function CustomerDialog({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = editing !== null;
  const isEdit = editing?.mode === "edit";

  useEffect(() => {
    if (!editing) return;
    if (editing.mode === "edit") {
      setName(editing.customer.name);
      setNotes(editing.customer.notes ?? "");
    } else {
      setName("");
      setNotes("");
    }
    setError(null);
  }, [editing]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res =
                editing?.mode === "edit"
                  ? await updateCustomerAction({
                      id: editing.customer.id,
                      name,
                      notes,
                    })
                  : await createCustomerAction({ name, notes });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              toast.success(isEdit ? "Customer updated" : "Customer added");
              onClose();
              router.refresh();
            });
          }}
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="Client or brand name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(fieldClass, "min-h-[80px] resize-y py-2")}
              placeholder="Handle, package, anything useful later"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
