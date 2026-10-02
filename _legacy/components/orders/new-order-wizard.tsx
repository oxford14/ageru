"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { calculateCharge, formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

type Platform = { id: string; name: string; slug: string };
type Category = { id: string; platform_id: string; name: string };
type Service = {
  id: string;
  platform_id: string;
  category_id: string;
  name: string;
  description: string | null;
  customer_rate: string;
  min_quantity: number;
  max_quantity: number;
  speed: string | null;
  start_time: string | null;
  refill_supported: boolean;
  cancel_supported: boolean;
  target_input_type: string;
};

export function NewOrderWizard({
  platforms,
  categories,
  services,
  walletBalance,
}: {
  platforms: Platform[];
  categories: Category[];
  services: Service[];
  walletBalance: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [platformId, setPlatformId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [quantity, setQuantity] = useState(1000);
  const [loading, setLoading] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.platform_id === platformId),
    [categories, platformId]
  );

  const filteredServices = useMemo(
    () => services.filter((s) => s.category_id === categoryId),
    [services, categoryId]
  );

  const selectedService = services.find((s) => s.id === serviceId);

  const total = selectedService
    ? calculateCharge(selectedService.customer_rate, quantity)
    : "0";

  const balanceAfter = useMemo(() => {
    const bal = parseFloat(walletBalance);
    const charge = parseFloat(total);
    return (bal - charge).toFixed(4);
  }, [walletBalance, total]);

  async function placeOrder() {
    if (!selectedService) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          targetUrl,
          quantity,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Order failed");
        return;
      }
      toast.success(`Order ${json.data.order_number} placed`);
      router.push(`/orders/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <span key={s} className={step === s ? "text-primary font-medium" : ""}>
            Step {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Platform</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {platforms.map((p) => (
              <Button
                key={p.id}
                variant={platformId === p.id ? "default" : "outline"}
                onClick={() => {
                  setPlatformId(p.id);
                  setCategoryId("");
                  setServiceId("");
                  setStep(2);
                }}
              >
                {p.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Category</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {filteredCategories.map((c) => (
              <Button
                key={c.id}
                variant={categoryId === c.id ? "default" : "outline"}
                onClick={() => {
                  setCategoryId(c.id);
                  setServiceId("");
                  setStep(3);
                }}
              >
                {c.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredServices.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full text-left border rounded-lg p-3 hover:bg-muted ${serviceId === s.id ? "border-primary" : ""}`}
                onClick={() => {
                  setServiceId(s.id);
                  setQuantity(s.min_quantity);
                  setStep(4);
                }}
              >
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
                <p className="text-sm mt-1">
                  {formatMoney(calculateCharge(s.customer_rate, 1000))} / 1k · Min {s.min_quantity} · Max{" "}
                  {s.max_quantity}
                </p>
                {s.speed && <p className="text-xs">Speed: {s.speed}</p>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 4 && selectedService && (
        <Card>
          <CardHeader>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Target {selectedService.target_input_type === "url" ? "URL" : "Input"}</Label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..."
            />
            <Button disabled={!targetUrl} onClick={() => setStep(5)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 5 && selectedService && (
        <Card>
          <CardHeader>
            <CardTitle>Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              min={selectedService.min_quantity}
              max={selectedService.max_quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <p className="text-lg font-semibold">Price: {formatMoney(total)}</p>
            <Button onClick={() => setStep(6)}>Review</Button>
          </CardContent>
        </Card>
      )}

      {step === 6 && selectedService && (
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Service:</span> {selectedService.name}
            </p>
            <p>
              <span className="text-muted-foreground">Target:</span> {targetUrl}
            </p>
            <p>
              <span className="text-muted-foreground">Quantity:</span> {quantity.toLocaleString()}
            </p>
            <p>
              <span className="text-muted-foreground">Total:</span> {formatMoney(total)}
            </p>
            <p>
              <span className="text-muted-foreground">Wallet:</span> {formatMoney(walletBalance)}
            </p>
            <p>
              <span className="text-muted-foreground">After order:</span>{" "}
              {formatMoney(balanceAfter)}
            </p>
            <Button className="w-full mt-4" disabled={loading} onClick={placeOrder}>
              {loading ? "Placing..." : "PLACE ORDER"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step > 1 && (
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))}>
          Back
        </Button>
      )}
    </div>
  );
}
