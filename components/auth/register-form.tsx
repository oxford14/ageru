"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { branding } from "@/lib/config/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 rounded-lg border-input bg-background pl-9 text-[15px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 hover:border-foreground/20 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 md:text-[15px]";

export function RegisterForm({ errorMessage }: { errorMessage?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <form
      action={signUp}
      className="flex flex-col gap-6"
      onSubmit={() => setPending(true)}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.025em]">
            Create account
          </h1>
          <p className="text-sm text-muted-foreground">
            Private panel. Use the owner email for {branding.appName}.
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="username">Username</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="yourname"
                className={fieldClass}
                required
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={fieldClass}
                required
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={cn(fieldClass, "pr-11")}
                minLength={8}
                required
                disabled={pending}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <Button type="submit" className="h-11 w-full text-[15px] font-medium" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </form>
  );
}
