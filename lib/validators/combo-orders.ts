import { z } from "zod";
import { placeOrderSchema } from "@/lib/validators/orders";

export const comboOrderLineSchema = placeOrderSchema
  .omit({ idempotencyKey: true, customerId: true })
  .extend({
    slotId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
  });

export const placeComboOrderSchema = z.object({
  customerId: z.string().uuid("Pick a customer."),
  comboPlanId: z.string().uuid(),
  comboGroupId: z.string().uuid(),
  lines: z.array(comboOrderLineSchema).min(1).max(20),
});

export type PlaceComboOrderPayload = z.infer<typeof placeComboOrderSchema>;

export const comboPlanItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(120),
  linkLabel: z.string().min(1).max(120),
  linkPlaceholder: z.string().max(200).optional(),
  defaultQuantity: z.number().int().positive().optional().nullable(),
  categoryHint: z.string().max(120).optional().nullable(),
  serviceId: z.string().max(32).optional().nullable(),
});

export const saveComboPlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  platform: z.string().max(32).optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  items: z.array(comboPlanItemInputSchema).min(1).max(20),
});

export type SaveComboPlanPayload = z.infer<typeof saveComboPlanSchema>;
