"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Loader2, X } from "lucide-react";
import { LogoMark } from "@/components/app/logo-mark";
import { cn } from "@/lib/utils";

export type SendPhase = "sending" | "done" | "error";

export function SendSequence({
  phase,
  stage,
  panelName,
  summary,
  orderRef,
  error,
  topUpUrl,
  onTrack,
  onAnother,
  onSameLink,
  onBack,
}: {
  phase: SendPhase;
  /** 0 checking, 1 sending, 2 confirmed */
  stage: number;
  panelName: string;
  summary: string;
  orderRef: string | null;
  error: string | null;
  topUpUrl?: string;
  onTrack: () => void;
  onAnother: () => void;
  onSameLink: () => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const stages = ["Checking the details", `Sending to ${panelName}`, `Confirmed by ${panelName}`];
  const balanceProblem = !!error && /balance|fund/i.test(error);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      {/* Emblem */}
      <div className="relative flex size-28 items-center justify-center">
        {phase === "sending" && !reduce
          ? [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-primary/40"
                initial={{ scale: 0.55, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
              />
            ))
          : null}

        <AnimatePresence mode="wait">
          {phase === "sending" ? (
            <motion.div
              key="mark"
              className="flex size-20 items-center justify-center rounded-full bg-card shadow-[0_0_0_1px_var(--border),0_10px_30px_-12px_rgb(37_99_235/0.5)]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={reduce ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, y: [0, -5, 0] }}
              exit={{ y: -60, opacity: 0, transition: { duration: 0.35, ease: "easeIn" } }}
              transition={reduce ? undefined : { y: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }}
            >
              <LogoMark className="size-9" />
            </motion.div>
          ) : phase === "done" ? (
            <motion.div
              key="done"
              className="flex size-20 items-center justify-center rounded-full bg-success text-white"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="error"
              className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={reduce ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, x: [0, -10, 10, -6, 6, 0] }}
              transition={{ duration: 0.5 }}
            >
              <X className="size-9" strokeWidth={2.4} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Headline */}
      <div className="mt-6 min-h-[64px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold tracking-[-0.02em]">
              {phase === "sending"
                ? "Sending your order…"
                : phase === "done"
                  ? "Order is on its way"
                  : "The order didn't go through"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {phase === "error" ? error : summary}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stages */}
      {phase !== "error" ? (
        <ol className="mt-6 w-full max-w-xs space-y-2.5 text-left">
          {stages.map((label, i) => {
            const state = i < stage || phase === "done" ? "done" : i === stage ? "active" : "todo";
            return (
              <motion.li
                key={label}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: state === "todo" ? 0.45 : 1, x: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.08 }}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full",
                    state === "done" ? "bg-success text-white" : state === "active" ? "text-primary" : "border border-border"
                  )}
                >
                  {state === "done" ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                      <Check className="size-3" strokeWidth={3} />
                    </motion.span>
                  ) : state === "active" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                </span>
                <span className={cn(state === "active" && "font-medium")}>{label}</span>
              </motion.li>
            );
          })}
        </ol>
      ) : null}

      {/* Actions */}
      <AnimatePresence>
        {phase === "done" ? (
          <motion.div
            className="mt-8 flex w-full max-w-sm flex-col gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {orderRef ? (
              <p className="mb-1 text-xs text-muted-foreground">
                Panel order <span className="font-mono text-foreground">#{orderRef}</span>
              </p>
            ) : null}
            <button
              type="button"
              onClick={onTrack}
              className="h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Track this order
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onSameLink} className="h-9 rounded-lg border bg-card text-[13px] font-medium hover:bg-muted">
                Same link, more
              </button>
              <button type="button" onClick={onAnother} className="h-9 rounded-lg border bg-card text-[13px] font-medium hover:bg-muted">
                New link
              </button>
            </div>
          </motion.div>
        ) : phase === "error" ? (
          <motion.div
            className="mt-8 flex w-full max-w-sm flex-col gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {balanceProblem && topUpUrl ? (
              <a
                href={topUpUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add funds on {panelName} <ArrowUpRight className="size-4" />
              </a>
            ) : null}
            <button type="button" onClick={onBack} className="h-10 rounded-lg border bg-card text-sm font-medium hover:bg-muted">
              Back to the order
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
