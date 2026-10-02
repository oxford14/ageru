"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
  type ManagedUser,
} from "@/app/actions/users";
import { formatNumber, timeAgo } from "@/lib/panel/shared";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Filter = "all" | "access" | "none";
type Editing = { mode: "create" } | { mode: "edit"; user: ManagedUser } | null;

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-60";

export function UsersManager({ users }: { users: ManagedUser[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Editing>(null);

  const counts = useMemo(
    () => ({
      all: users.length,
      access: users.filter((u) => u.access !== "none").length,
      none: users.filter((u) => u.access === "none").length,
    }),
    [users]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "access" && u.access === "none") return false;
      if (filter === "none" && u.access !== "none") return false;
      return !q || `${u.email} ${u.username ?? ""}`.toLowerCase().includes(q);
    });
  }, [users, query, filter]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg border bg-card p-1" role="tablist" aria-label="Filter users">
          {(
            [
              ["all", "All"],
              ["access", "Has access"],
              ["none", "No access"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
                filter === key ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span className="text-[11px] opacity-60 tabular-nums">{counts[key]}</span>
            </button>
          ))}
        </div>

        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className={cn(fieldClass, "h-9 pl-9")}
          />
        </label>

        <button
          type="button"
          onClick={() => setEditing({ mode: "create" })}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:ml-auto"
        >
          <UserPlus className="size-4" />
          Add user
        </button>
      </div>

      {visible.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_140px_90px_120px_20px] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span>User</span>
            <span>Access</span>
            <span className="text-right">Orders</span>
            <span>Last sign-in</span>
            <span />
          </div>
          <ul className="divide-y">
            {visible.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ mode: "edit", user: u })}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_140px_90px_120px_20px]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar user={u} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                        <span className="truncate">{u.username || u.email.split("@")[0]}</span>
                        {u.isYou ? (
                          <span className="rounded bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">
                            You
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                    </span>
                  </span>
                  <AccessBadge access={u.access} />
                  <span className="hidden text-right text-sm tabular-nums md:block">{formatNumber(u.orderCount)}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {u.lastSignInAt ? timeAgo(u.lastSignInAt) : "Never"}
                  </span>
                  <ChevronRight className="hidden size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 md:block" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium">{query ? `No one matches "${query}"` : "No users here"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query ? "Try a different name or email." : "Add someone to let them place orders with your panel."}
          </p>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        People with access place orders that are paid from your panel balance. Each person only sees their own orders.
        The owner is set by <code className="font-mono">OWNER_EMAIL</code> in <code className="font-mono">.env.local</code>.
      </p>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[460px]">
          {editing ? (
            <UserForm
              key={editing.mode === "edit" ? editing.user.id : "new"}
              editing={editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------

function UserForm({
  editing,
  onDone,
}: {
  editing: Exclude<Editing, null>;
  onDone: () => void;
}) {
  const router = useRouter();
  const user = editing.mode === "edit" ? editing.user : null;
  const isOwner = user?.access === "owner";

  const [email, setEmail] = useState(user?.email ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(!user);
  const [access, setAccess] = useState<"admin" | "none">(user?.access === "none" ? "none" : "admin");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  function generate() {
    setPassword(generatePassword());
    setShowPassword(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = user
        ? await updateUserAction({
            id: user.id,
            email,
            username,
            password: changingPassword ? password : "",
            access,
          })
        : await createUserAction({ email, username, password, access });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      if (user) {
        toast.success("User updated");
        onDone();
      } else {
        setCreated({ email: email.trim().toLowerCase(), password });
      }
    });
  }

  function remove() {
    if (!user) return;
    setError(null);
    startDelete(async () => {
      const res = await deleteUserAction(user.id);
      if (!res.ok) {
        setError(res.error);
        setConfirmDelete(false);
        return;
      }
      toast.success(`${user.email} deleted`);
      router.refresh();
      onDone();
    });
  }

  if (created) {
    return <CreatedSummary email={created.email} password={created.password} access={access} onDone={onDone} />;
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center gap-3 pr-8">
        {user ? <Avatar user={user} size="lg" /> : (
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <DialogTitle className="text-base font-semibold">{user ? "Edit user" : "Add a user"}</DialogTitle>
          <DialogDescription className="truncate text-[13px]">
            {user
              ? `Joined ${timeAgo(user.createdAt)} · ${formatNumber(user.orderCount)} order${user.orderCount === 1 ? "" : "s"}`
              : "They can sign in straight away with the details you set."}
          </DialogDescription>
        </div>
      </div>

      <Field label="Email" htmlFor="user-email" hint={isOwner ? "Owner email is set in .env.local." : undefined}>
        <input
          id="user-email"
          type="email"
          required
          autoFocus={!user}
          autoComplete="off"
          value={email}
          disabled={isOwner || saving}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className={fieldClass}
        />
      </Field>

      <Field label="Display name" htmlFor="user-name" optional>
        <input
          id="user-name"
          value={username}
          disabled={saving}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={email ? email.split("@")[0] : "e.g. Mika"}
          className={fieldClass}
        />
      </Field>

      {changingPassword ? (
        <Field
          label={user ? "New password" : "Password"}
          htmlFor="user-password"
          hint="At least 8 characters. You'll be able to copy it after saving."
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="user-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                disabled={saving}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(fieldClass, "pr-10 font-mono")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={generate}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-muted"
            >
              <Wand2 className="size-3.5" />
              Generate
            </button>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => {
                setChangingPassword(false);
                setPassword("");
              }}
              className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Keep the current password
            </button>
          ) : null}
        </Field>
      ) : (
        <button
          type="button"
          onClick={() => setChangingPassword(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
        >
          <KeyRound className="size-3.5" />
          Set a new password
        </button>
      )}

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">Access</legend>
        {isOwner ? (
          <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-[13px] text-muted-foreground">
            <Crown className="size-4 text-warning" />
            Owner: always has full access, including this page.
          </p>
        ) : (
          <div className="grid gap-2">
            <AccessOption
              selected={access === "admin"}
              onSelect={() => setAccess("admin")}
              icon={ShieldCheck}
              title="Can use the panel"
              body="Places orders, which are paid from your panel balance."
            />
            <AccessOption
              selected={access === "none"}
              onSelect={() => setAccess("none")}
              icon={ShieldOff}
              title="No access"
              body="The account stays, but they can't get into the panel."
            />
          </div>
        )}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13px] leading-relaxed text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {user && !isOwner && !user.isYou ? (
          confirmDelete ? (
            <span className="flex items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-destructive px-3 font-medium text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete for good
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          )
        ) : null}

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="h-9 rounded-lg border bg-card px-3.5 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {user ? "Save changes" : "Add user"}
          </button>
        </div>
      </div>
    </form>
  );
}

function CreatedSummary({
  email,
  password,
  access,
  onDone,
}: {
  email: string;
  password: string;
  access: "admin" | "none";
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
  const text = `Sign in at ${loginUrl}\nEmail: ${email}\nPassword: ${password}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-success text-white">
          <Check className="size-5" strokeWidth={3} />
        </span>
        <div>
          <DialogTitle className="text-base font-semibold">User added</DialogTitle>
          <DialogDescription className="text-[13px]">
            {access === "admin"
              ? "Send them these details. They can sign in now."
              : "The account exists but has no access until you turn it on."}
          </DialogDescription>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 font-mono text-[13px] leading-relaxed break-all whitespace-pre-line">
        {text}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              toast.error("Couldn't copy");
            }
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-sm font-medium hover:bg-muted"
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy details"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium">
        {label}
        {optional ? <span className="text-xs font-normal text-muted-foreground">Optional</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AccessOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-accent/50" : "hover:bg-muted/50"
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-input"
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
    </button>
  );
}

function AccessBadge({ access }: { access: ManagedUser["access"] }) {
  const meta = {
    owner: { label: "Owner", icon: Crown, cls: "bg-warning/15 text-foreground", iconCls: "text-warning" },
    admin: { label: "Has access", icon: ShieldCheck, cls: "bg-primary/10 text-primary", iconCls: "" },
    none: { label: "No access", icon: ShieldOff, cls: "bg-muted text-muted-foreground", iconCls: "" },
  }[access];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.cls)}>
      <Icon className={cn("size-3", meta.iconCls)} />
      {meta.label}
    </span>
  );
}

function Avatar({ user, size = "md" }: { user: ManagedUser; size?: "md" | "lg" }) {
  const name = user.username || user.email;
  const initials = name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of user.email) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "lg" ? "size-10 text-sm" : "size-8 text-xs"
      )}
      style={{ background: `oklch(0.93 0.04 ${hash})`, color: `oklch(0.42 0.12 ${hash})` }}
    >
      {initials || "?"}
    </span>
  );
}

function generatePassword() {
  // No look-alike characters (0/O, 1/l/I) so it can be read out or typed by hand.
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
