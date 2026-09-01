import { PaymentNotice, verifyAndConfirmPayment } from "../infinitepay";

export async function POST(request: Request) { try { const confirmed = await verifyAndConfirmPayment(await request.json() as PaymentNotice); return Response.json({ success: confirmed, message: confirmed ? null : "Pagamento não confirmado" }, { status: confirmed ? 200 : 400 }); } catch { return Response.json({ success: false, message: "Falha ao confirmar pagamento" }, { status: 400 }); } }
