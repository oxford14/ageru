import { CustomerMobileNav, CustomerSidebar } from "@/components/layout/customer-nav";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="h-14 border-b flex items-center justify-end px-4 gap-2">
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <CustomerMobileNav />
    </div>
  );
}
