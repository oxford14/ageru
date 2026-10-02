import { AdminSidebar } from "@/components/layout/admin-nav";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <p className="text-sm text-muted-foreground">Administration</p>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
