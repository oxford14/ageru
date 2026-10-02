import Link from "next/link";
import { CircleAlert } from "lucide-react";

export function PanelError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="text-sm">
        <p className="font-medium text-destructive">Couldn&apos;t load services from the panel</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
        <p className="mt-2 text-muted-foreground">
          Check the connection in{" "}
          <Link href="/settings" className="font-medium text-foreground underline underline-offset-2">
            Settings
          </Link>
          , then reload.
        </p>
      </div>
    </div>
  );
}
