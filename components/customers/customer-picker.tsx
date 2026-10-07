"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  createCustomerAction,
  searchCustomersAction,
  type CustomerListItem,
} from "@/app/actions/customers";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15";

export function CustomerPicker({
  value,
  selectedName,
  onChange,
  disabled,
  className,
}: {
  value: string | null;
  selectedName?: string | null;
  onChange: (id: string, name: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const res = await searchCustomersAction(q);
    setLoading(false);
    if (res.ok) setOptions(res.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load(query);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const trimmed = query.trim();
  const exactMatch = options.some((o) => o.name.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length >= 1 && !exactMatch;

  function pick(c: CustomerListItem) {
    onChange(c.id, c.name);
    setQuery("");
    setOpen(false);
  }

  function createInline() {
    if (!trimmed || pending) return;
    startTransition(async () => {
      const res = await createCustomerAction({ name: trimmed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onChange(res.data.id, res.data.name);
      setQuery("");
      setOpen(false);
    });
  }

  const label = selectedName ?? options.find((o) => o.id === value)?.name;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Customer</label>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          fieldClass,
          "flex items-center justify-between gap-2 text-left",
          !value && "text-muted-foreground",
          disabled && "opacity-60"
        )}
      >
        <span className="truncate">{label ?? "Search or add customer…"}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          role="listbox"
          id={listId}
        >
          <div className="border-b p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name…"
              className={cn(fieldClass, "h-9")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && showCreate) {
                  e.preventDefault();
                  createInline();
                }
              }}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </li>
            ) : null}
            {!loading && options.length === 0 && !showCreate ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No customers yet.</li>
            ) : null}
            {options.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === c.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                    value === c.id && "bg-muted"
                  )}
                  onClick={() => pick(c)}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  {value === c.id ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </button>
              </li>
            ))}
            {showCreate ? (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                  disabled={pending}
                  onClick={createInline}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Add &ldquo;{trimmed}&rdquo; as customer
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
