import { verifyAndConfirmPayment } from "../infinitepay";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const order_nsu = url.searchParams.get("order_nsu") ?? undefined;
  const confirmed = await verifyAndConfirmPayment({ order_nsu, transaction_nsu: url.searchParams.get("transaction_nsu") ?? undefined, slug: url.searchParams.get("slug") ?? undefined }).catch(() => false);
  return Response.redirect(new URL(`/agendar/novo?payment=${confirmed ? "success" : "pending"}&ref=${encodeURIComponent(order_nsu ?? "")}`, url.origin), 303);
}
