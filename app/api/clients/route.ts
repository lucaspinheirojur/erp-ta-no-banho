import { and, asc, eq } from "drizzle-orm";
import { getManager } from "../../../lib/auth";
import { getDb } from "../../../db";
import { clients } from "../../../db/schema";

function cleanPhone(value = "") { return value.replace(/\D/g, ""); }

export async function GET() {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  const rows = await getDb().select().from(clients).where(eq(clients.organizationId, manager.organizationId)).orderBy(asc(clients.name));
  return Response.json({ clients: rows });
}

export async function POST(request: Request) {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try {
    const body = await request.json() as { name?: string; phone?: string; notes?: string };
    const name = body.name?.trim() ?? "";
    const phone = cleanPhone(body.phone);
    if (name.length < 2) return Response.json({ error: "Informe o nome da cliente" }, { status: 400 });
    if (phone.length < 10) return Response.json({ error: "Informe um WhatsApp válido" }, { status: 400 });
    const existing = await getDb().select().from(clients).where(and(eq(clients.organizationId, manager.organizationId), eq(clients.phone, phone))).limit(1);
    if (existing.length) return Response.json({ error: "Já existe uma cliente com este WhatsApp" }, { status: 409 });
    const rows = await getDb().insert(clients).values({ organizationId: manager.organizationId, name, phone, notes: body.notes?.trim() || null }).returning();
    return Response.json({ client: rows[0] }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar a cliente" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try {
    const body = await request.json() as { id?: number; name?: string; phone?: string; notes?: string };
    const name = body.name?.trim() ?? "";
    const phone = cleanPhone(body.phone);
    if (!body.id || name.length < 2 || phone.length < 10) return Response.json({ error: "Preencha nome e WhatsApp corretamente" }, { status: 400 });
    const rows = await getDb().update(clients).set({ name, phone, notes: body.notes?.trim() || null, updatedAt: new Date().toISOString() }).where(and(eq(clients.id, body.id), eq(clients.organizationId, manager.organizationId))).returning();
    if (!rows.length) return Response.json({ error: "Cliente não encontrada" }, { status: 404 });
    return Response.json({ client: rows[0] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a cliente" }, { status: 500 });
  }
}
