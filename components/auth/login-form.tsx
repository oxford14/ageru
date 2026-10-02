"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { branding } from "@/lib/config/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DotMap } from "@/components/auth/dot-map";

const labelClass = "text-[13px] font-medium text-foreground/80";

const fieldClass =
  "h-11 rounded-lg border-input bg-background px-3.5 text-[15px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 hover:border-foreground/20 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/15 md:text-[15px] dark:bg-input/20";

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.97 } as const,
        animate: { opacity: 1, scale: 1 } as const,
        transition: { duration: 0.5 },
      };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-100 p-4 dark:from-blue-950/40 dark:via-background dark:to-indigo-950/30">
      <motion.div
        {...motionProps}
        className="flex w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-xl"
      >
        <div className="relative hidden h-[min(600px,85vh)] w-1/2 overflow-hidden border-r md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/40">
            <DotMap />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mb-6"
              >
                <Image
                  src={branding.logoPath}
                  alt={branding.appName}
                  width={280}
                  height={280}
                  className="h-auto w-52 object-contain drop-shadow-md"
                  priority
                />
              </motion.div>
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="max-w-xs text-center text-sm text-muted-foreground"
              >
                Send boosting orders to your panel and watch every one
                deliver, in one place.
              </motion.p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex justify-center md:hidden">
              <Image
                src={branding.logoPath}
                alt={branding.appName}
                width={200}
                height={200}
                className="h-auto w-36 object-contain"
              />
            </div>

            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] text-foreground md:text-[30px]">
              Welcome back
            </h1>
            <p className="mt-1.5 mb-8 text-sm text-muted-foreground">
              Sign in to your {branding.appName} account.
            </p>

            {errorMessage ? (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </div>
            ) : null}

            <form
              action={signIn}
              className="space-y-5"
              onSubmit={() => setPending(true)}
            >
              <div className="space-y-2">
                <Label htmlFor="email" className={labelClass}>
                  Email
                </Label>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={labelClass}>
                    Password
                  </Label>
                  <a
                    href={`mailto:${branding.supportEmail}?subject=Password%20reset%20request`}
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(fieldClass, "pr-11")}
                    required
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onHoverStart={() => setCtaHovered(true)}
                onHoverEnd={() => setCtaHovered(false)}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    "relative h-11 w-full overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700",
                    ctaHovered && "shadow-lg shadow-blue-500/25"
                  )}
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <span className="flex items-center justify-center">
                      Sign in
                      <ArrowRight className="ml-2 size-4" />
                    </span>
                  )}
                  {ctaHovered && !pending && !reduceMotion ? (
                    <motion.span
                      initial={{ left: "-100%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm"
                    />
                  ) : null}
                </Button>
              </motion.div>

              <div className="pt-2 text-center text-sm">
                <p className="text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
