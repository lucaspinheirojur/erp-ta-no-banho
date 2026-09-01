import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointments } from "../../../db/schema";

const HANDLE = process.env.INFINITEPAY_HANDLE;
export type PaymentNotice = { invoice_slug?: string; slug?: string; transaction_nsu?: string; order_nsu?: string };

export async function verifyAndConfirmPayment(data: PaymentNotice) {
  const slug = data.invoice_slug ?? data.slug;
  if (!HANDLE || !slug || !data.transaction_nsu || !data.order_nsu) return false;
  const response = await fetch("https://api.checkout.infinitepay.io/payment_check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: HANDLE, order_nsu: data.order_nsu, transaction_nsu: data.transaction_nsu, slug }) });
  const payment = await response.json() as { paid?: boolean; paid_amount?: number; capture_method?: string };
  if (!response.ok || !payment.paid) return false;
  const db = getDb();
  const rows = await db.select().from(appointments).where(eq(appointments.externalReference, data.order_nsu));
  if (!rows.length) return false;
  const received = Math.min(payment.paid_amount ?? 0, rows.reduce((sum, row) => sum + row.priceCents, 0));
  const share = Math.floor(received / rows.length);
  for (let i = 0; i < rows.length; i += 1) {
    const paidCents = i === rows.length - 1 ? received - share * (rows.length - 1) : share;
    await db.update(appointments).set({ paymentId: data.transaction_nsu, paymentMethod: payment.capture_method === "credit_card" ? "Cartão InfinitePay" : "Pix InfinitePay", paymentStatus: "approved", paidCents, balanceCents: Math.max(0, rows[i].priceCents - paidCents), status: "confirmed" }).where(eq(appointments.id, rows[i].id));
  }
  return true;
}
