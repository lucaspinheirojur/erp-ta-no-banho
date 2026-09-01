import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { services } from "../../../db/schema";
import { serviceCatalog, type BookingCategory, type PackageVisit } from "../../service-catalog";
import { getManager } from "../../../lib/auth";

const ORGANIZATION_ID = "ta-no-banho";
const CASH_SETTING_NAME = "__CONFIG_CASH_ENABLED__";
function serialize(row: typeof services.$inferSelect) { return { id: row.id, name: row.name, group: row.groupName, category: row.category as BookingCategory, detail: row.detail, duration: row.duration, price: row.priceCents / 100, sessions: row.sessions, visits: row.visitsJson ? JSON.parse(row.visitsJson) as PackageVisit[] : undefined, active: row.active }; }

async function syncOfficialCatalog(organizationId = ORGANIZATION_ID) {
  const db = getDb();
  const existing = await db.select({ name: services.name }).from(services).where(eq(services.organizationId, organizationId));
  const registered = new Set(existing.map(item => item.name));
  const missing = serviceCatalog.filter(item => !registered.has(item.name));
  for (let index = 0; index < missing.length; index += 8) {
    const group = missing.slice(index, index + 8);
    await db.insert(services).values(group.map(item => ({ organizationId, name: item.name, groupName: item.group, category: item.category, detail: item.detail, duration: item.duration, priceCents: Math.round(item.price * 100), sessions: item.sessions, visitsJson: item.visits ? JSON.stringify(item.visits) : null, active: true }))).onConflictDoNothing({ target: [services.organizationId, services.name] });
  }
  await db.update(services).set({ active: false, updatedAt: new Date().toISOString() }).where(eq(services.name, "Teste de pagamento"));
}

export async function GET(request: Request) {
  try { const account = await getManager(); const management = new URL(request.url).searchParams.get("management") === "1" && !!account; const organizationId = account?.organizationId ?? ORGANIZATION_ID; await syncOfficialCatalog(organizationId); const rows = await getDb().select().from(services).where(management ? and(eq(services.organizationId, organizationId), ne(services.name, CASH_SETTING_NAME)) : and(eq(services.organizationId, organizationId), eq(services.active, true), ne(services.name, CASH_SETTING_NAME))).orderBy(asc(services.category), asc(services.groupName), asc(services.id)); return Response.json({ services: rows.map(serialize) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os serviços" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { const body = await request.json() as { name?: string; group?: string; category?: BookingCategory; detail?: string; duration?: string; price?: number; sessions?: number; visits?: PackageVisit[] }; const name = body.name?.trim(), groupName = body.group?.trim(), detail = body.detail?.trim(), duration = body.duration?.trim(); if (!name || !groupName || !detail || !duration || !["avulso","fidelidade"].includes(body.category || "") || !body.price || body.price <= 0) return Response.json({ error: "Preencha todos os dados obrigatórios" }, { status: 400 }); const inserted = await getDb().insert(services).values({ organizationId: manager.organizationId, name, groupName, category: body.category!, detail, duration, priceCents: Math.round(body.price * 100), sessions: Math.max(1, body.sessions || 1), visitsJson: body.visits?.length ? JSON.stringify(body.visits) : null, active: true }).returning(); return Response.json({ service: serialize(inserted[0]) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { const body = await request.json() as { id?: number; name?: string; group?: string; detail?: string; duration?: string; price?: number; active?: boolean }; if (!body.id) return Response.json({ error: "Serviço inválido" }, { status: 400 }); const updates: Partial<typeof services.$inferInsert> = { updatedAt: new Date().toISOString() }; if (body.name !== undefined) updates.name = body.name.trim(); if (body.group !== undefined) updates.groupName = body.group.trim(); if (body.detail !== undefined) updates.detail = body.detail.trim(); if (body.duration !== undefined) updates.duration = body.duration.trim(); if (body.price !== undefined) updates.priceCents = Math.round(body.price * 100); if (body.active !== undefined) updates.active = body.active; if (!updates.name && body.name !== undefined) return Response.json({ error: "Informe o nome do serviço" }, { status: 400 }); const changed = await getDb().update(services).set(updates).where(and(eq(services.id, body.id), eq(services.organizationId, manager.organizationId))).returning(); return Response.json({ service: serialize(changed[0]) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { const id = Number(new URL(request.url).searchParams.get("id")); if (!id) return Response.json({ error: "Serviço inválido" }, { status: 400 }); await getDb().delete(services).where(and(eq(services.id, id), eq(services.organizationId, manager.organizationId))); return Response.json({ deleted: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível excluir" }, { status: 500 }); }
}
