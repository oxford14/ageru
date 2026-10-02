"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export async function createSupportTicket(formData: FormData) {
  const user = await requireUser();
  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "");
  const supabase = await createClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject })
    .select("*")
    .single();

  if (error || !ticket) throw new Error(error?.message ?? "Failed");

  await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    user_id: user.id,
    message,
    is_staff: false,
  });

  revalidatePath("/support");
}
