"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DepositForm() {
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(false);

  async function onDeposit() {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Deposit failed");
        return;
      }
      if (json.data.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
        return;
      }
      toast.success("Wallet credited (manual/dev mode)");
      window.location.reload();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 max-w-sm">
      <div className="space-y-2">
        <Label>Amount (PHP)</Label>
        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <Button onClick={onDeposit} disabled={loading}>
        {loading ? "Processing..." : "Deposit"}
      </Button>
    </div>
  );
}
