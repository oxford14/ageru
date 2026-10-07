"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction } from "@/app/actions/orders";
import {
  commentLines,
  estimateCost,
  fieldsForType,
  formatCurrency,
  formatNumber,
  platformLabel,
  type PanelService,
} from "@/lib/panel/shared";
import { CustomerPicker } from "@/components/customers/customer-picker";
import { ServicePicker } from "@/components/orders/service-picker";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-60";

export function OrderForm({
  services,
  currency,
  balance,
  topUpUrl,
  recentIds,
  initialServiceId,
  initialLink,
}: {
  services: PanelService[];
  currency: string;
  balance: number | null;
  topUpUrl: string;
  recentIds: string[];
  initialServiceId?: string;
  initialLink?: string;
}) {
  const router = useRouter();
  const initial = services.find((s) => s.id === initialServiceId) ?? null;
  const [service, setService] = useState<PanelService | null>(initial);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [link, setLink] = useState(initialLink ?? "");
  const [quantity, setQuantity] = useState(initial ? String(Math.max(initial.min, Math.min(1000, initial.max))) : "");
  const [comments, setComments] = useState("");
  const [username, setUsername] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef<string | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // A new attempt gets a new key; retries of the same attempt reuse it.
  useEffect(() => {
    idempotencyKey.current = null;
  }, [service, link, quantity, comments, username, answer]);

  const fields = service ? fieldsForType(service.type) : null;
  const lines = useMemo(() => commentLines(comments), [comments]);
  const qty = Number(quantity);
  const units = !fields ? 0 : fields.comments ? lines.length : fields.quantity ? qty : 1;
  const cost = service && units > 0 ? estimateCost(service, units) : 0;
  const after = balance != null ? balance - cost : null;
  const short = after != null && after < 0;

  const problems: string[] = [];
  if (!customerId) problems.push("Pick a customer");
  if (service && fields) {
    if (!link.trim()) problems.push("Add the link");
    if (fields.quantity && (!Number.isInteger(qty) || qty < service.min || qty > service.max)) {
      problems.push(`Quantity must be ${formatNumber(service.min)}–${formatNumber(service.max)}`);
    }
    if (fields.comments && (lines.length < service.min || lines.length > service.max)) {
      problems.push(`Enter ${formatNumber(service.min)}–${formatNumber(service.max)} comments`);
    }
    if (fields.username && !username.trim()) problems.push("Add the username");
    if (fields.answerNumber && !answer.trim()) problems.push("Add the answer number");
  }
  const canSubmit = !!service && !!fields && problems.length === 0 && !pending;

  function choose(s: PanelService) {
    setService(s);
    setError(null);
    setQuantity((q) => {
      const n = Number(q);
      if (Number.isInteger(n) && n >= s.min && n <= s.max) return q;
      return String(Math.max(s.min, Math.min(1000, s.max)));
    });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !canSubmit) return;
    idempotencyKey.current ??= crypto.randomUUID();
    const key = idempotencyKey.current;
    setError(null);
    startTransition(async () => {
      const res = await placeOrderAction({
        customerId: customerId!,
        serviceId: service.id,
        link: link.trim(),
        quantity: fields?.quantity ? qty : undefined,
        comments: fields?.comments ? lines.join("\n") : undefined,
        username: fields?.username ? username.trim() : undefined,
        answerNumber: fields?.answerNumber ? answer.trim() : undefined,
        idempotencyKey: key,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(
        res.data.providerOrderId ? `Order placed · panel #${res.data.providerOrderId}` : "Order placed"
      );
      router.push(`/orders/${res.data.id}`);
    });
  }

  const presets = service
    ? [...new Set([service.min, 100, 500, 1000, 5000, 10000])]
        .filter((n) => n >= service.min && n <= service.max)
        .slice(0, 5)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section
        aria-label="Choose a service"
        className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-card lg:h-[calc(100vh-11rem)]"
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Step n={1} done={!!service} />
          <h2 className="text-sm font-semibold">Choose a service</h2>
        </div>
        <ServicePicker
          services={services}
          currency={currency}
          recentIds={recentIds}
          selectedId={service?.id}
          onSelect={choose}
          initialPlatform={initial?.platform ?? "all"}
          className="flex-1"
        />
      </section>

      <div ref={detailsRef} className="scroll-mt-20 lg:sticky lg:top-10">
        <form onSubmit={submit} className="rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Step n={2} done={false} />
            <h2 className="text-sm font-semibold">Order details</h2>
          </div>

          {!service ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <MousePointerClick className="size-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Pick a service first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Filter by platform, or search for a name or a service ID from the panel.
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-4">
              <CustomerPicker
                value={customerId}
                selectedName={customerName}
                onChange={(id, name) => {
                  setCustomerId(id);
                  setCustomerName(name);
                }}
                disabled={pending}
              />
              <div className="rounded-md bg-muted/60 p-3">
                <p className="text-[13px] leading-snug font-medium">{service.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">#{service.id}</span> · {platformLabel(service.platform)} ·{" "}
                  {formatCurrency(service.rate, currency)}
                  {service.type.toLowerCase() === "package" ? " per order" : " per 1,000"}
                </p>
                {service.refill || service.cancel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[service.refill && "Refill available", service.cancel && "Can be cancelled"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>

              <Field label="Link" htmlFor="link" hint="The full post, video or profile URL.">
                <input
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  className={fieldClass}
                  disabled={pending}
                />
              </Field>

              {fields?.quantity ? (
                <Field
                  label="Quantity"
                  htmlFor="quantity"
                  hint={`Between ${formatNumber(service.min)} and ${formatNumber(service.max)}.`}
                >
                  <input
                    id="quantity"
                    type="number"
                    inputMode="numeric"
                    min={service.min}
                    max={service.max}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={cn(fieldClass, "tabular-nums")}
                    disabled={pending}
                  />
                  {presets.length > 1 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {presets.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setQuantity(String(n))}
                          className={cn(
                            "h-7 rounded-md border px-2.5 text-xs tabular-nums transition-colors",
                            Number(quantity) === n
                              ? "border-primary bg-accent font-medium text-accent-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          {formatNumber(n)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </Field>
              ) : null}

              {fields?.comments ? (
                <Field
                  label="Comments"
                  htmlFor="comments"
                  hint={`One per line · ${lines.length} of ${formatNumber(service.min)}–${formatNumber(service.max)}`}
                >
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={6}
                    className={cn(fieldClass, "h-auto py-2 leading-relaxed")}
                    disabled={pending}
                  />
                </Field>
              ) : null}

              {fields?.username ? (
                <Field label="Comment author" htmlFor="username" hint="Username of the person who wrote the comment.">
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={fieldClass}
                    disabled={pending}
                  />
                </Field>
              ) : null}

              {fields?.answerNumber ? (
                <Field label="Answer number" htmlFor="answer" hint="Which poll option to vote for, e.g. 1.">
                  <input
                    id="answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    inputMode="numeric"
                    className={fieldClass}
                    disabled={pending}
                  />
                </Field>
              ) : null}

              <dl className="space-y-1.5 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Estimated cost</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(cost, currency)}</dd>
                </div>
                {balance != null ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Balance after</dt>
                    <dd className={cn("tabular-nums", short && "font-medium text-destructive")}>
                      {formatCurrency(after ?? 0, currency)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {short ? (
                <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                  Not enough balance on the panel.{" "}
                  {topUpUrl ? (
                    <a href={topUpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center font-medium underline underline-offset-2">
                      Add funds <ArrowUpRight className="size-3" />
                    </a>
                  ) : null}
                </p>
              ) : null}

              {error ? (
                <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13px] leading-relaxed text-destructive">
                  {error}
                </p>
              ) : null}

              <div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {pending ? "Sending to panel…" : `Place order · ${formatCurrency(cost, currency)}`}
                </button>
                {problems.length && !pending ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">{problems[0]}</p>
                ) : null}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Step({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}
    >
      {n}
    </span>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
