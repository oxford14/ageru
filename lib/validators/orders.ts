import { z } from "zod";

export const placeOrderSchema = z.object({
  customerId: z.string().uuid("Pick a customer."),
  serviceId: z.string().min(1).max(32),
  link: z.string().trim().min(3, "Enter a link").max(2048),
  quantity: z.number().int().positive().optional(),
  comments: z.string().max(100_000).optional(),
  username: z.string().max(200).optional(),
  answerNumber: z.string().max(20).optional(),
  idempotencyKey: z.string().uuid(),
});

export type PlaceOrderPayload = z.infer<typeof placeOrderSchema>;
