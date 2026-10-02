"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ClipboardPaste,
  Coins,
  Eye,
  Heart,
  History,
  Link2,
  Loader2,
  MessageCircle,
  Pencil,
  Radio,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  UserPlus,
  Vote,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction } from "@/app/actions/orders";
import {
  getServiceDescriptionAction,
  toggleFavoriteAction,
  type ComposerCatalog,
  type ComposerContext,
  type ComposerHistoryItem,
} from "@/app/actions/composer";
import {
  GOAL_ORDER,
  PICK_COPY,
  fitsTarget,
  formatDuration,
  goalLabel,
  goalOf,
  pickServices,
  quantityToSlider,
  readLink,
  sliderToQuantity,
  type GoalKey,
  type PickReason,
} from "@/lib/panel/compose";
import {
  commentLines,
  estimateCost,
  fieldsForType,
  formatCurrency,
  formatNumber,
  platformLabel,
  shortLink,
  type PanelService,
} from "@/lib/panel/shared";
import { PlatformGlyph } from "@/components/composer/platform-glyph";
import { LinkHistory, StartPanels, linkKey } from "@/components/composer/history-panels";
import { SendSequence, type SendPhase } from "@/components/composer/send-sequence";
import { cn } from "@/lib/utils";

export type ComposerPrefill = { serviceId?: string; link?: string; quantity?: number };

const GOAL_ICON: Record<GoalKey, typeof Heart> = {
  followers: UserPlus,
  likes: Heart,
  views: Eye,
  comments: MessageCircle,
  shares: Repeat2,
  saves: Bookmark,
  live: Radio,
  votes: Vote,
  other: Sparkles,
};

const PICK_ICON: Record<PickReason, typeof Heart> = {
  favorite: Star,
  usual: History,
  cheapest: Coins,
  refill: ShieldCheck,
  fastest: Zap,
};

const clampQty = (q: number, s: PanelService) => Math.max(s.min, Math.min(s.max, q));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function OrderComposer({
  catalog,
  context,
  prefill,
  onClose,
  onBusyChange,
}: {
  catalog: Extract<ComposerCatalog, { ok: true }>;
  context: ComposerContext | null;
  prefill: ComposerPrefill | null;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const services = catalog.services;
  const history = useMemo(() => context?.history ?? [], [context]);
  const currency = context?.currency ?? "USD";
  const balance = context?.balance ?? null;

  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const goalById = useMemo(() => new Map(services.map((s) => [s.id, goalOf(s)])), [services]);
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of history) {
      if (o.serviceId && o.status !== "provider_failed") m.set(o.serviceId, (m.get(o.serviceId) ?? 0) + 1);
    }
    return m;
  }, [history]);

  // ---- state ---------------------------------------------------------------
  const pre = prefill?.serviceId ? byId.get(prefill.serviceId) : undefined;
  const [linkInput, setLinkInput] = useState(prefill?.link ?? "");
  const [platformChoice, setPlatformChoice] = useState<string | null>(pre?.platform ?? null);
  const [choosingPlatform, setChoosingPlatform] = useState(false);
  const [goal, setGoal] = useState<GoalKey | null>(pre ? goalOf(pre) : null);
  const [serviceId, setServiceId] = useState<string | null>(pre?.id ?? null);
  const [quantity, setQuantity] = useState(() =>
    pre ? String(clampQty(prefill?.quantity ?? 1000, pre)) : ""
  );
  const [comments, setComments] = useState("");
  const [username, setUsername] = useState("");
  const [answer, setAnswer] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [browseQuery, setBrowseQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [descriptions, setDescriptions] = useState<Record<string, string | null>>({});
  // Local star changes layered over the saved favourites (optimistic).
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});

  const [phase, setPhase] = useState<"compose" | SendPhase>("compose");
  const [stage, setStage] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ id: string; ref: string | null } | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const whatRef = useRef<HTMLElement>(null);
  const whichRef = useRef<HTMLElement>(null);
  const amountRef = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  const reveal = (ref: React.RefObject<HTMLElement | null>) =>
    requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" })
    );

  // A changed order is a new attempt; retries of the same attempt reuse the key.
  useEffect(() => {
    idempotencyKey.current = null;
  }, [linkInput, serviceId, quantity, comments, username, answer]);

  // ---- derived -------------------------------------------------------------
  const insight = useMemo(() => readLink(linkInput), [linkInput]);

  const platformCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of services) if (fieldsForType(s.type)) c[s.platform] = (c[s.platform] ?? 0) + 1;
    return c;
  }, [services]);

  const detected = insight?.platform && platformCounts[insight.platform] ? insight.platform : null;
  const platform = platformChoice ?? detected;
  const showPlatformPicker = !!insight && (!platform || choosingPlatform);

  const goals = useMemo(() => {
    if (!platform) return [];
    const stats = new Map<GoalKey, { count: number; min: number }>();
    for (const s of services) {
      if (s.platform !== platform || !fieldsForType(s.type)) continue;
      const g = goalById.get(s.id)!;
      const st = stats.get(g) ?? { count: 0, min: Infinity };
      st.count += 1;
      st.min = Math.min(st.min, Number(s.rate));
      stats.set(g, st);
    }
    const suggested = insight?.suggested ?? [];
    return [...stats.entries()]
      .map(([key, st]) => ({ key, ...st, suggested: suggested.includes(key) }))
      .sort((a, b) => {
        const sa = a.suggested ? suggested.indexOf(a.key) : 99;
        const sb = b.suggested ? suggested.indexOf(b.key) : 99;
        return sa - sb || GOAL_ORDER.indexOf(a.key) - GOAL_ORDER.indexOf(b.key);
      });
  }, [platform, services, goalById, insight]);

  const candidates = useMemo(() => {
    if (!platform || !goal) return [];
    const inGoal = services.filter(
      (s) => s.platform === platform && goalById.get(s.id) === goal && fieldsForType(s.type)
    );
    const fitted = inGoal.filter((s) => fitsTarget(s, insight?.kind ?? null));
    return fitted.length ? fitted : inGoal;
  }, [platform, goal, services, goalById, insight]);

  const favorites = useMemo(() => {
    const set = new Set(context?.favorites ?? []);
    for (const [id, on] of Object.entries(favOverrides)) {
      if (on) set.add(id);
      else set.delete(id);
    }
    return set;
  }, [context, favOverrides]);

  const favoriteServices = useMemo(
    () => [...favorites].map((id) => byId.get(id)).filter((x): x is PanelService => !!x),
    [favorites, byId]
  );

  const picks = useMemo(() => pickServices(candidates, usage, favorites), [candidates, usage, favorites]);

  const browseList = useMemo(() => {
    const terms = browseQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return [...candidates]
      .filter((s) => terms.every((t) => `${s.id} ${s.name}`.toLowerCase().includes(t)))
      .sort(
        (a, b) =>
          Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || Number(a.rate) - Number(b.rate)
      );
  }, [candidates, browseQuery, favorites]);

  const service = serviceId ? (byId.get(serviceId) ?? null) : null;
  const fields = service ? fieldsForType(service.type) : null;
  const lines = useMemo(() => commentLines(comments), [comments]);
  const qty = Number(quantity);
  const qtyIssue =
    service && fields?.quantity && quantity
      ? qty < service.min
        ? { message: `Minimum for this service is ${formatNumber(service.min)}.`, fix: service.min }
        : qty > service.max
          ? { message: `Maximum for this service is ${formatNumber(service.max)}.`, fix: service.max }
          : null
      : null;
  const units = !fields ? 0 : fields.comments ? lines.length : fields.quantity ? qty : 1;
  const cost = service && units > 0 ? estimateCost(service, units) : 0;
  const after = balance != null ? balance - cost : null;
  const short = after != null && after < 0;

  const linkHistory = useMemo(() => {
    if (!insight) return [];
    const key = linkKey(insight.link);
    return history.filter((o) => linkKey(o.link) === key);
  }, [insight, history]);

  let blocker: string | null = null;
  if (!insight) blocker = "Paste a link to start";
  else if (!platform) blocker = "Choose the platform";
  else if (!goal) blocker = "Choose what to boost";
  else if (!service || !fields) blocker = "Pick a service";
  else if (fields.quantity && (!Number.isInteger(qty) || qty < service.min || qty > service.max))
    blocker = `Quantity must be ${formatNumber(service.min)}–${formatNumber(service.max)}`;
  else if (fields.comments && (lines.length < service.min || lines.length > service.max))
    blocker = `Add ${formatNumber(service.min)}–${formatNumber(service.max)} comments`;
  else if (fields.username && !username.trim()) blocker = "Add the username";
  else if (fields.answerNumber && !answer.trim()) blocker = "Add the poll answer";
  else if (short) blocker = "Not enough balance";
  const canSend = !blocker && phase === "compose";

  // ---- actions -------------------------------------------------------------
  function changeLink(value: string) {
    setLinkInput(value);
    setChoosingPlatform(false);
    if (!value.trim()) {
      setPlatformChoice(null);
      setGoal(null);
      setServiceId(null);
      return;
    }
    // A link to a different platform starts the choice over; a username or
    // same-platform link keeps what is already picked (e.g. "Order again").
    const next = readLink(value)?.platform;
    if (next && platformCounts[next] && next !== platform) {
      setPlatformChoice(null);
      setGoal(null);
      setServiceId(null);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) changeLink(text.trim());
    } catch {
      linkRef.current?.focus();
    }
  }

  function choosePlatform(key: string) {
    setPlatformChoice(key);
    setChoosingPlatform(false);
    setGoal(null);
    setServiceId(null);
    reveal(whatRef);
  }

  function chooseGoal(g: GoalKey) {
    setGoal(g);
    setBrowseAll(false);
    setBrowseQuery("");
    setAboutOpen(false);
    // Preselect the top pick so the order is one click from ready.
    const inGoal = services.filter(
      (s) => s.platform === platform && goalById.get(s.id) === g && fieldsForType(s.type)
    );
    const fitted = inGoal.filter((s) => fitsTarget(s, insight?.kind ?? null));
    const first = pickServices(fitted.length ? fitted : inGoal, usage, favorites)[0]?.service;
    if (first) selectService(first, false);
    else setServiceId(null);
    reveal(whichRef);
  }

  function selectService(s: PanelService, scroll = true) {
    setServiceId(s.id);
    setAboutOpen(false);
    setQuantity((q) => {
      const n = Number(q);
      return Number.isInteger(n) && n >= s.min && n <= s.max ? q : String(clampQty(1000, s));
    });
    if (scroll) reveal(amountRef);
  }

  async function toggleFavorite(s: PanelService) {
    const next = !favorites.has(s.id);
    setFavOverrides((o) => ({ ...o, [s.id]: next }));
    const res = await toggleFavoriteAction(s.id, next);
    if (!res.ok) {
      setFavOverrides((o) => ({ ...o, [s.id]: !next }));
      toast.error(res.error);
    } else if (next) {
      toast.success("Starred. It'll be the first pick next time.");
    }
  }

  /** Jump straight to a starred service; only the link is left to fill in. */
  function startWithService(s: PanelService) {
    setPlatformChoice(s.platform);
    setGoal(goalById.get(s.id) ?? null);
    selectService(s, false);
    requestAnimationFrame(() => linkRef.current?.focus());
  }

  function repeatOrder(o: ComposerHistoryItem) {
    const s = o.serviceId ? byId.get(o.serviceId) : undefined;
    if (!s) {
      toast.error("That service is no longer listed on the panel.");
      return;
    }
    setPlatformChoice(s.platform);
    setGoal(goalById.get(s.id) ?? null);
    selectService(s, false);
    setQuantity(String(clampQty(o.quantity, s)));
    reveal(amountRef);
  }

  async function toggleAbout() {
    if (!service) return;
    const next = !aboutOpen;
    setAboutOpen(next);
    if (next && !(service.id in descriptions)) {
      const text = await getServiceDescriptionAction(service.id).catch(() => null);
      setDescriptions((d) => ({ ...d, [service.id]: text }));
    }
  }

  async function send() {
    if (!canSend || !service || !fields || !insight) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setSendError(null);
    setStage(0);
    setPhase("sending");
    onBusyChange(true);

    const toStage1 = setTimeout(() => setStage(1), 550);
    const [res] = await Promise.all([
      placeOrderAction({
        serviceId: service.id,
        link: insight.link,
        quantity: fields.quantity ? qty : undefined,
        comments: fields.comments ? lines.join("\n") : undefined,
        username: fields.username ? username.trim() : undefined,
        answerNumber: fields.answerNumber ? answer.trim() : undefined,
        idempotencyKey: idempotencyKey.current,
      }),
      // Let the sequence read as a sequence even when the panel is instant.
      wait(reduce ? 0 : 1400),
    ]);
    clearTimeout(toStage1);
    onBusyChange(false);

    if (!res.ok) {
      setSendError(res.error);
      setPhase("error");
      router.refresh();
      return;
    }
    setStage(2);
    setPlaced({ id: res.data.id, ref: res.data.providerOrderId });
    await wait(reduce ? 0 : 500);
    setPhase("done");
    router.refresh();
  }

  // Ctrl/Cmd + Enter sends from anywhere in the composer.
  function onComposerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
      e.preventDefault();
      void send();
    }
  }

  function resetForAnother(keepLink: boolean) {
    setPhase("compose");
    setStage(0);
    setPlaced(null);
    setGoal(null);
    setServiceId(null);
    setQuantity("");
    setComments("");
    setUsername("");
    setAnswer("");
    idempotencyKey.current = null;
    if (!keepLink) {
      setLinkInput("");
      setPlatformChoice(null);
      requestAnimationFrame(() => linkRef.current?.focus());
    } else {
      reveal(whatRef);
    }
  }

  // ---- render --------------------------------------------------------------
  if (phase !== "compose") {
    return (
      <SendSequence
        phase={phase}
        stage={stage}
        panelName={catalog.panelName}
        summary={
          service
            ? `${formatNumber(units)} × ${goal ? goalLabel(goal, platform).toLowerCase() : "units"} for ${insight ? shortLink(insight.link) : "your link"}`
            : ""
        }
        orderRef={placed?.ref ?? null}
        error={sendError}
        topUpUrl={catalog.topUpUrl}
        onTrack={() => {
          if (placed) router.push(`/orders/${placed.id}`);
          onClose();
        }}
        onAnother={() => resetForAnother(false)}
        onSameLink={() => resetForAnother(true)}
        onBack={() => setPhase("compose")}
      />
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-1 md:grid-cols-[minmax(0,1fr)_300px]" onKeyDown={onComposerKeyDown}>
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3.5 pr-12 sm:px-5">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-[-0.01em]">New order</p>
            <p className="text-xs text-muted-foreground">Paste a link. We&apos;ll work out the rest.</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6">
          <ol className="relative space-y-8 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:bg-border">
            {/* 1 — Where */}
            <Step n={1} title="Where should it go?" done={!!insight && !!platform}>
              <div
                className={cn(
                  "flex h-14 items-center gap-3 rounded-xl border bg-background px-3.5 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/12",
                  insight ? "border-input" : "border-dashed border-foreground/25"
                )}
              >
                {insight?.platform ? (
                  <PlatformGlyph platform={platform ?? insight.platform} className="size-7" />
                ) : (
                  <Link2 className="size-5 shrink-0 text-muted-foreground" />
                )}
                <input
                  ref={linkRef}
                  autoFocus
                  value={linkInput}
                  onChange={(e) => changeLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && insight) {
                      e.preventDefault();
                      reveal(whatRef);
                    }
                  }}
                  placeholder="https://instagram.com/reel/…  or  @username"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Link or username"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60"
                />
                {linkInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      changeLink("");
                      linkRef.current?.focus();
                    }}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear link"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    <ClipboardPaste className="size-3.5" />
                    Paste
                  </button>
                )}
              </div>

              <AnimatePresence initial={false} mode="wait">
                {insight ? (
                  <motion.p
                    key="insight"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground"
                  >
                    {platform ? (
                      <>
                        <span className="font-medium text-foreground">{platformLabel(platform)}</span>
                        {insight.kindLabel && insight.kind !== "username" ? <span>· {insight.kindLabel}</span> : null}
                        {insight.handle ? <span>· @{insight.handle}</span> : null}
                        <button
                          type="button"
                          onClick={() => setChoosingPlatform((v) => !v)}
                          className="ml-1 text-primary hover:underline"
                        >
                          {choosingPlatform ? "Keep" : "Not right?"}
                        </button>
                      </>
                    ) : (
                      <span>
                        {insight.kind === "username"
                          ? "A username. Which platform is it on?"
                          : `${platformLabel(insight.platform ?? "")} isn't offered by ${catalog.panelName}. Pick a platform:`}
                      </span>
                    )}
                  </motion.p>
                ) : linkInput.trim() ? (
                  <motion.p key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-[13px] text-muted-foreground">
                    That doesn&apos;t look like a link yet. Paste the full address or an @username.
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {showPlatformPicker ? (
                <PlatformPicker counts={platformCounts} current={platform} onPick={choosePlatform} />
              ) : null}

              {!insight && !linkInput.trim() ? (
                context ? (
                  <StartPanels
                    history={history}
                    favorites={favoriteServices}
                    currency={currency}
                    onUseLink={changeLink}
                    onPickService={startWithService}
                    onNavigate={onClose}
                  />
                ) : (
                  <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                )
              ) : null}

              {insight && linkHistory.length ? (
                <LinkHistory orders={linkHistory} onRepeat={repeatOrder} onNavigate={onClose} />
              ) : null}
            </Step>

            {/* 2 — What */}
            {platform && !showPlatformPicker ? (
                <Step n={2} title="What should it get?" done={!!goal} sectionRef={whatRef} appear>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {goals.map((g) => {
                      const Icon = GOAL_ICON[g.key];
                      const active = goal === g.key;
                      return (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => chooseGoal(g.key)}
                          aria-pressed={active}
                          className={cn(
                            "group relative flex flex-col items-start rounded-xl border bg-card p-3 text-left transition-all",
                            active
                              ? "border-primary bg-accent/60 shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_15%,transparent)]"
                              : "hover:-translate-y-px hover:border-foreground/20 hover:shadow-sm"
                          )}
                        >
                          <span className="flex w-full items-center justify-between">
                            <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            {g.suggested ? (
                              <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                                Suggested
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-2.5 text-sm font-medium">{goalLabel(g.key, platform)}</span>
                          <span className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            from {formatCurrency(g.min, currency)} · {g.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Step>
            ) : null}

            {/* 3 — Which */}
            {platform && goal && !showPlatformPicker ? (
                <Step key={`which-${goal}`} n={3} title="Which service?" done={!!service} sectionRef={whichRef} appear>
                  {picks.length ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {picks.map(({ service: s, reason }) => {
                        const Icon = PICK_ICON[reason];
                        const active = s.id === serviceId;
                        return (
                          <div key={s.id} className="relative">
                            <button
                              type="button"
                              onClick={() => selectService(s)}
                              aria-pressed={active}
                              className={cn(
                                "flex h-full w-full flex-col rounded-xl border bg-card p-3.5 text-left transition-all",
                                active
                                  ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_15%,transparent)]"
                                  : "hover:border-foreground/20 hover:shadow-sm"
                              )}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", active ? "text-primary" : "text-foreground/80")}>
                                  <Icon className="size-3.5" />
                                  {PICK_COPY[reason].title}
                                </span>
                                <span
                                  className={cn(
                                    "flex size-4 items-center justify-center rounded-full border",
                                    active ? "border-primary bg-primary text-primary-foreground" : "border-input"
                                  )}
                                >
                                  {active ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
                                </span>
                              </span>
                              <span className="mt-2 line-clamp-2 text-[13px] leading-snug">{s.name}</span>
                              <span className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2.5 pr-8 text-xs text-muted-foreground">
                                <span className="text-sm font-semibold text-foreground tabular-nums">
                                  {formatCurrency(s.rate, currency)}
                                </span>
                                <span>{s.type.toLowerCase() === "package" ? "per order" : "/ 1k"}</span>
                                {formatDuration(s.avgSeconds) ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Timer className="size-3" />
                                    {formatDuration(s.avgSeconds)}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                            <FavoriteStar
                              active={favorites.has(s.id)}
                              onToggle={() => toggleFavorite(s)}
                              className="absolute right-2 bottom-2"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No services here can be ordered from this app.</p>
                  )}

                  <button
                    type="button"
                    onClick={() => setBrowseAll((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", browseAll && "rotate-180")} />
                    {browseAll ? "Hide the full list" : `See all ${candidates.length} options`}
                  </button>

                  <AnimatePresence initial={false}>
                    {browseAll ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 rounded-xl border bg-card">
                          <label className="relative block border-b">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              value={browseQuery}
                              onChange={(e) => setBrowseQuery(e.target.value)}
                              placeholder="Filter by name or ID"
                              className="h-10 w-full rounded-t-xl bg-transparent pr-3 pl-9 text-sm outline-none"
                            />
                          </label>
                          <ul className="max-h-64 divide-y overflow-y-auto">
                            {browseList.slice(0, 80).map((s) => (
                              <li key={s.id} className="relative">
                                <button
                                  type="button"
                                  onClick={() => selectService(s)}
                                  className={cn(
                                    "flex w-full items-start gap-3 py-2.5 pr-11 pl-3 text-left transition-colors",
                                    s.id === serviceId ? "bg-accent" : "hover:bg-muted/60"
                                  )}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 text-[13px] leading-snug">{s.name}</span>
                                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                      <span className="font-mono">#{s.id}</span> · {formatNumber(s.min)}–{formatNumber(s.max)}
                                      {s.refill ? " · refill" : ""}
                                      {formatDuration(s.avgSeconds) ? ` · ${formatDuration(s.avgSeconds)}` : ""}
                                    </span>
                                  </span>
                                  <span className="shrink-0 text-[13px] font-medium tabular-nums">
                                    {formatCurrency(s.rate, currency)}
                                  </span>
                                </button>
                                <FavoriteStar
                                  active={favorites.has(s.id)}
                                  onToggle={() => toggleFavorite(s)}
                                  className="absolute top-2 right-2"
                                />
                              </li>
                            ))}
                            {!browseList.length ? (
                              <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches.</li>
                            ) : null}
                          </ul>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Step>
            ) : null}

            {/* 4 — How many */}
            {service && fields && !showPlatformPicker ? (
                <Step
                  key={`amount-${service.id}`}
                  appear
                  n={4}
                  title={fields.quantity ? "How many?" : "Details"}
                  done={!blocker}
                  sectionRef={amountRef}
                >
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-[13px] leading-snug font-medium">{service.name}</p>
                      <div className="-mt-1 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={toggleAbout}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {aboutOpen ? "Hide details" : "Details"}
                        </button>
                        <FavoriteStar active={favorites.has(service.id)} onToggle={() => toggleFavorite(service)} />
                      </div>
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      <span className="font-mono">#{service.id}</span>
                      <span>{formatNumber(service.min)}–{formatNumber(service.max)}</span>
                      {service.refill ? <span>Refill</span> : null}
                      {service.cancel ? <span>Cancellable</span> : null}
                    </p>
                    <AnimatePresence initial={false}>
                      {aboutOpen ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-line text-foreground/80">
                            {service.id in descriptions ? (
                              descriptions[service.id] ? (
                                cleanDescription(descriptions[service.id]!)
                              ) : (
                                "The panel has no description for this service."
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" /> Loading…
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {fields.quantity ? (
                      <div className="mt-5">
                        <label
                          className={cn(
                            "group flex cursor-text items-center gap-3 rounded-xl border bg-background px-4 py-2.5 transition-[border-color,box-shadow] hover:border-foreground/25 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/12",
                            qtyIssue && "border-destructive/50 focus-within:border-destructive focus-within:ring-destructive/10"
                          )}
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label="Quantity"
                            aria-invalid={!!qtyIssue}
                            value={quantity ? formatNumber(Number(quantity)) : ""}
                            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
                            onFocus={(e) => e.currentTarget.select()}
                            placeholder="0"
                            className="w-full min-w-0 bg-transparent text-4xl font-semibold tracking-[-0.03em] tabular-nums outline-none placeholder:text-muted-foreground/40"
                          />
                          <span className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className="text-sm whitespace-nowrap text-muted-foreground">
                              {goal ? goalLabel(goal, platform).toLowerCase() : "units"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 group-focus-within:text-primary">
                              <Pencil className="size-3" />
                              Type any amount
                            </span>
                          </span>
                        </label>
                        {qtyIssue ? (
                          <p className="mt-2 flex items-center gap-2 text-xs text-destructive">
                            {qtyIssue.message}
                            <button
                              type="button"
                              onClick={() => setQuantity(String(qtyIssue.fix))}
                              className="rounded-md border border-destructive/30 px-1.5 py-0.5 font-medium hover:bg-destructive/5"
                            >
                              Use {formatNumber(qtyIssue.fix)}
                            </button>
                          </p>
                        ) : null}
                        <input
                          type="range"
                          min={0}
                          max={1000}
                          aria-label="Quantity slider"
                          value={quantityToSlider(Number(quantity) || service.min, service.min, service.max)}
                          onChange={(e) =>
                            setQuantity(String(sliderToQuantity(Number(e.target.value), service.min, service.max)))
                          }
                          className="mt-3 w-full accent-primary"
                        />
                        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                          <span>{formatNumber(service.min)}</span>
                          <span>{formatNumber(service.max)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {[...new Set([service.min, 500, 1000, 2500, 5000, 10000, 50000])]
                            .filter((n) => n >= service.min && n <= service.max)
                            .slice(0, 6)
                            .map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setQuantity(String(n))}
                                className={cn(
                                  "h-7 rounded-full border px-3 text-xs tabular-nums transition-colors",
                                  qty === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                              >
                                {formatNumber(n)}
                              </button>
                            ))}
                        </div>
                      </div>
                    ) : null}

                    {fields.comments ? (
                      <label className="mt-4 block">
                        <span className="mb-1.5 flex justify-between text-[13px] font-medium">
                          Comments
                          <span className="font-normal text-muted-foreground tabular-nums">
                            {lines.length} / {formatNumber(service.min)}–{formatNumber(service.max)}
                          </span>
                        </span>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={5}
                          placeholder={"One comment per line\nLove this!\nSo good 🔥"}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
                        />
                      </label>
                    ) : null}

                    {fields.username ? (
                      <label className="mt-4 block">
                        <span className="mb-1.5 block text-[13px] font-medium">Username</span>
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="without the @"
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
                        />
                      </label>
                    ) : null}

                    {fields.answerNumber ? (
                      <label className="mt-4 block">
                        <span className="mb-1.5 block text-[13px] font-medium">Poll answer number</span>
                        <input
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          inputMode="numeric"
                          placeholder="e.g. 1"
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
                        />
                      </label>
                    ) : null}
                  </div>
                </Step>
            ) : null}
          </ol>
        </div>

        {/* Mobile footer — the slip lives in the side column on desktop */}
        <div className="flex items-center gap-3 border-t bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{blocker ?? "Ready to send"}</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(cost, currency)}</p>
          </div>
          <SendButton disabled={!canSend} onClick={send} compact />
        </div>
      </div>

      <aside className="hidden min-h-0 flex-col border-l bg-muted/35 md:flex">
        <OrderSlip
          platform={platform}
          link={insight?.link ?? null}
          goal={goal}
          service={service}
          units={units}
          cost={cost}
          balance={balance}
          currency={currency}
          blocker={blocker}
          canSend={canSend}
          topUpUrl={catalog.topUpUrl}
          onSend={send}
        />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Step({
  n,
  title,
  done,
  sectionRef,
  appear,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  sectionRef?: React.RefObject<HTMLElement | null>;
  /** Animate in when the step is first revealed. */
  appear?: boolean;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const motionProps =
    appear && !reduce
      ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }
      : {};
  return (
    <motion.li className="relative pl-10" {...motionProps}>
      <span
        className={cn(
          "absolute top-0 left-0 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-4 ring-popover transition-colors",
          done ? "bg-primary text-primary-foreground" : "border border-foreground/20 bg-popover text-foreground"
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
      </span>
      <section ref={sectionRef} className="scroll-mt-4">
        <h3 className="mb-3 pt-0.5 text-sm font-semibold">{title}</h3>
        {children}
      </section>
    </motion.li>
  );
}

function FavoriteStar({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      title={active ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        active ? "text-warning" : "text-muted-foreground/50 hover:bg-muted hover:text-warning",
        className
      )}
    >
      <Star className={cn("size-4", active && "fill-current")} />
    </button>
  );
}

function PlatformPicker({
  counts,
  current,
  onPick,
}: {
  counts: Record<string, number>;
  current: string | null;
  onPick: (key: string) => void;
}) {
  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="mt-3 grid max-h-60 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border bg-card p-2 sm:grid-cols-3">
      {list.map(([key, n]) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
            key === current ? "bg-accent font-medium" : "hover:bg-muted"
          )}
        >
          <PlatformGlyph platform={key} className="size-5 text-[9px]" />
          <span className="min-w-0 flex-1 truncate">{platformLabel(key)}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">{n}</span>
        </button>
      ))}
    </div>
  );
}

function SendButton({
  disabled,
  onClick,
  compact,
}: {
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_16px_-8px_rgb(37_99_235/0.8)] transition-all hover:bg-primary/92 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
        compact ? "h-11 px-5 text-sm" : "h-12 w-full text-[15px]"
      )}
    >
      Send order
      <ArrowRight className="size-4 transition-transform group-enabled:group-hover:translate-x-0.5" />
    </button>
  );
}

function OrderSlip({
  platform,
  link,
  goal,
  service,
  units,
  cost,
  balance,
  currency,
  blocker,
  canSend,
  topUpUrl,
  onSend,
}: {
  platform: string | null;
  link: string | null;
  goal: GoalKey | null;
  service: PanelService | null;
  units: number;
  cost: number;
  balance: number | null;
  currency: string;
  blocker: string | null;
  canSend: boolean;
  topUpUrl: string;
  onSend: () => void;
}) {
  const share = balance && balance > 0 ? Math.min(100, (cost / balance) * 100) : cost > 0 ? 100 : 0;
  const over = balance != null && cost > balance;
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Order slip</p>

      <dl className="mt-4 space-y-3.5 text-[13px]">
        <SlipRow label="Target">
          {link ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <PlatformGlyph platform={platform} className="size-4 rounded text-[7px]" />
              <span className="truncate">{shortLink(link)}</span>
            </span>
          ) : null}
        </SlipRow>
        <SlipRow label="Boost">{goal ? goalLabel(goal, platform) : null}</SlipRow>
        <SlipRow label="Service">
          {service ? (
            <span className="block">
              <span className="line-clamp-2 leading-snug">{service.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">#{service.id}</span>
            </span>
          ) : null}
        </SlipRow>
        <SlipRow label="Amount">{service && units > 0 ? formatNumber(units) : null}</SlipRow>
        <SlipRow label="Usually takes">{service ? (formatDuration(service.avgSeconds) ?? "—") : null}</SlipRow>
      </dl>

      {/* perforation */}
      <div className="relative -mx-5 my-5 border-t border-dashed border-foreground/15">
        <span className="absolute -top-2 -left-2 size-4 rounded-full bg-popover" />
        <span className="absolute -top-2 -right-2 size-4 rounded-full bg-popover" />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">Total</span>
        <motion.span
          key={cost.toFixed(6)}
          initial={{ opacity: 0.4, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-[-0.02em] tabular-nums"
        >
          {formatCurrency(cost, currency)}
        </motion.span>
      </div>

      {balance != null ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
            <motion.div
              className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
              animate={{ width: `${share}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
          <p className={cn("mt-1.5 text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
            {over
              ? `Short by ${formatCurrency(cost - balance, currency)}`
              : `${formatCurrency(balance - cost, currency)} left of ${formatCurrency(balance, currency)}`}
          </p>
          {over && topUpUrl ? (
            <a
              href={topUpUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              Add funds <ArrowUpRight className="size-3" />
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto pt-6">
        <SendButton disabled={!canSend} onClick={onSend} />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {blocker ?? (
            <>
              or press <kbd className="rounded border bg-card px-1 font-sans text-[10px]">Ctrl</kbd>{" "}
              <kbd className="rounded border bg-card px-1 font-sans text-[10px]">Enter</kbd>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function SlipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children ?? <span className="text-muted-foreground/50">—</span>}</dd>
    </div>
  );
}

/** Panel descriptions are light markdown; show them as readable plain text. */
function cleanDescription(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
