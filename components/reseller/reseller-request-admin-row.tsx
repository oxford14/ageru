"use client";

import { useTransition } from "react";
import {
  completeResellerRequestAction,
  failResellerRequestAction,
  fulfillResellerRequestAction,
} from "@/app/actions/reseller-admin";
import type { ResellerRequestRow } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";

export function ResellerRequestAdminRow({
  request,
  serviceName,
  resellerLabel,
  amountLabel,
  offers,
}: {
  request: ResellerRequestRow;
  serviceName: string;
  resellerLabel: string;
  amountLabel: string;
  offers: { id: string; provider_id: string; cost_per_unit: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{serviceName}</p>
          <p className="text-muted-foreground">
            {resellerLabel} · qty {request.quantity.toLocaleString()} · {amountLabel}
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{request.target_url}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
          {request.status}
        </span>
      </div>
      {request.status === "pending" || request.status === "processing" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {offers.map((offer) => (
            <Button
              key={offer.id}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await fulfillResellerRequestAction({
                    requestId: request.id,
                    providerOfferId: offer.id,
                    markCompleted: true,
                  });
                })
              }
            >
              Fulfill (offer {offer.id.slice(0, 8)}…)
            </Button>
          ))}
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await failResellerRequestAction({
                  requestId: request.id,
                  reason: "Provider fulfillment failed",
                });
              })
            }
          >
            Fail & refund
          </Button>
        </div>
      ) : null}
      {request.status === "processing" ? (
        <Button
          className="mt-2"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await completeResellerRequestAction(request.id);
            })
          }
        >
          Mark completed
        </Button>
      ) : null}
      {request.failure_reason ? (
        <p className="mt-2 text-xs text-destructive">{request.failure_reason}</p>
      ) : null}
    </div>
  );
}
