import { and, desc, eq, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointments, expenses } from "../../../db/schema";
import { getManager } from "../../../lib/auth";

export async function GET() {
  const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { const [income, costs] = await Promise.all([getDb().select().from(appointments).where(and(eq(appointments.organizationId, manager.organizationId), notInArray(appointments.status, ["awaiting_payment", "payment_failed", "blocked"]))).orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime)).limit(500), getDb().select().from(expenses).where(eq(expenses.organizationId, manager.organizationId)).orderBy(desc(expenses.expenseDate), desc(expenses.id)).limit(500)]); return Response.json({ income, expenses: costs }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o financeiro" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { const body = await request.json() as { description?: string; category?: string; amount?: number; date?: string; method?: string }; if (!body.description?.trim() || !body.category?.trim() || !body.amount || body.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "") || !body.method?.trim()) return Response.json({ error: "Preencha os dados da despesa" }, { status: 400 }); const rows = await getDb().insert(expenses).values({ organizationId: manager.organizationId, description: body.description.trim(), category: body.category.trim(), amountCents: Math.round(body.amount * 100), expenseDate: body.date!, paymentMethod: body.method.trim() }).returning(); return Response.json({ expense: rows[0] }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a despesa" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { const id = Number(new URL(request.url).searchParams.get("id")); if (!id) return Response.json({ error: "Lançamento inválido" }, { status: 400 }); await getDb().delete(expenses).where(and(eq(expenses.id, id), eq(expenses.organizationId, manager.organizationId))); return Response.json({ deleted: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível excluir" }, { status: 500 }); }
}
