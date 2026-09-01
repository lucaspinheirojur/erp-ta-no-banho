import { and, desc, eq, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointments, clients, services } from "../../../db/schema";
import { getManager } from "../../../lib/auth";

function cleanPhone(value = "") { return value.replace(/\D/g, ""); }
function hasFullName(value = "") { return value.trim().split(/\s+/).filter(Boolean).length >= 2; }
function timeMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
function durationMinutes(value = "1h") { const hours = value.match(/(\d+(?:[.,]\d+)?)\s*h/i), minutes = value.match(/(\d+)\s*min/i); return Math.round((hours ? Number(hours[1].replace(",", ".")) * 60 : 0) + (minutes ? Number(minutes[1]) : 0)) || 60; }

export async function GET() { const manager = await getManager(); if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 }); try { const rows = await getDb().select().from(appointments).where(and(eq(appointments.organizationId, manager.organizationId), notInArray(appointments.status, ["awaiting_payment", "payment_failed"]))).orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime)).limit(200); return Response.json({ appointments: rows }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a agenda" }, { status: 500 }); } }

export async function POST(request: Request) {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try {
    const data = await request.json() as { type?: "appointment" | "block"; name?: string; phone?: string; service?: string; date?: string; time?: string; end?: string; reason?: string; priceCents?: number; paidCents?: number; paymentMethod?: string };
    const date = data.date?.trim() ?? "", time = data.time?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return Response.json({ error: "Informe data e horário válidos" }, { status: 400 });
    if (data.type === "block") {
      const end = data.end?.trim() ?? "";
      if (!/^\d{2}:\d{2}$/.test(end) || end <= time) return Response.json({ error: "O horário final deve ser posterior ao inicial" }, { status: 400 });
      const existing = await getDb().select().from(appointments).where(and(eq(appointments.organizationId, manager.organizationId), eq(appointments.appointmentDate, date)));
      const serviceRows = await getDb().select().from(services).where(eq(services.organizationId, manager.organizationId));
      const conflict = existing.some(item => { const start = timeMinutes(item.appointmentTime); const storedEnd = item.status === "blocked" ? item.externalReference?.split(":")[1] : undefined; const itemEnd = storedEnd ? timeMinutes(storedEnd) : start + durationMinutes(serviceRows.find(service => service.name === item.service.split(" — ")[0])?.duration); return timeMinutes(time) < itemEnd && timeMinutes(end) > start && item.status !== "cancelled"; });
      if (conflict) return Response.json({ error: "Já existe um atendimento ou bloqueio neste período" }, { status: 409 });
      const rows = await getDb().insert(appointments).values({ organizationId: manager.organizationId, clientName: "Período bloqueado", phone: "0000000000", service: `__BLOCKED__:${data.reason?.trim() || "Indisponível"}`, appointmentDate: date, appointmentTime: time, paymentMethod: "Não se aplica", paymentOption: "none", priceCents: 0, depositCents: 0, paidCents: 0, balanceCents: 0, externalReference: `BLOCK:${end}:${crypto.randomUUID()}`, paymentStatus: "none", status: "blocked" }).returning();
      return Response.json({ appointment: rows[0] }, { status: 201 });
    }
    const name = data.name?.trim() ?? "", phone = cleanPhone(data.phone), serviceName = data.service?.trim() ?? "";
    if (!hasFullName(name)) return Response.json({ error: "Informe nome e sobrenome da cliente" }, { status: 400 });
    if (phone.length < 10) return Response.json({ error: "Informe um WhatsApp válido" }, { status: 400 });
    const service = (await getDb().select().from(services).where(and(eq(services.organizationId, manager.organizationId), eq(services.name, serviceName), eq(services.active, true))).limit(1))[0];
    if (!service || service.category === "config") return Response.json({ error: "Selecione um serviço ativo" }, { status: 400 });
    const existing = await getDb().select().from(appointments).where(and(eq(appointments.organizationId, manager.organizationId), eq(appointments.appointmentDate, date)));
    const serviceRows = await getDb().select().from(services).where(eq(services.organizationId, manager.organizationId));
    const requestedStart = timeMinutes(time), requestedEnd = requestedStart + durationMinutes(service.duration);
    const conflict = existing.some(item => { const start = timeMinutes(item.appointmentTime); const storedEnd = item.status === "blocked" ? item.externalReference?.split(":")[1] : undefined; const itemEnd = storedEnd ? timeMinutes(storedEnd) : start + durationMinutes(serviceRows.find(entry => entry.name === item.service.split(" — ")[0])?.duration); return requestedStart < itemEnd && requestedEnd > start && item.status !== "cancelled"; });
    if (conflict) return Response.json({ error: "Este período já está ocupado" }, { status: 409 });
    const priceCents = Number.isFinite(data.priceCents) ? Math.max(0, Math.round(data.priceCents!)) : service.priceCents;
    const paidCents = Math.max(0, Math.min(Number.isFinite(data.paidCents) ? Math.round(data.paidCents!) : 0, priceCents));
    const rows = await getDb().insert(appointments).values({ organizationId: manager.organizationId, clientName: name, phone, service: service.name, appointmentDate: date, appointmentTime: time, paymentMethod: data.paymentMethod?.trim() || "A definir", paymentOption: paidCents ? paidCents >= priceCents ? "full" : "partial" : "at_service", priceCents, depositCents: 0, paidCents, balanceCents: priceCents - paidCents, externalReference: `MANUAL:${crypto.randomUUID()}`, paymentStatus: paidCents >= priceCents ? "approved" : paidCents > 0 ? "partial" : "pending", status: "confirmed" }).returning();
    await getDb().insert(clients).values({ organizationId: manager.organizationId, name, phone }).onConflictDoUpdate({ target: [clients.organizationId, clients.phone], set: { name, updatedAt: new Date().toISOString() } });
    return Response.json({ appointment: rows[0] }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o agendamento" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try {
    const data = await request.json() as { id?: number; paidCents?: number; paymentMethod?: string; courtesy?: boolean; oldName?: string; oldPhone?: string; name?: string; phone?: string };
    if (data.id && data.paidCents !== undefined) { const rows = await getDb().select().from(appointments).where(and(eq(appointments.id, data.id), eq(appointments.organizationId, manager.organizationId))).limit(1); if (!rows.length) return Response.json({ error: "Agendamento não encontrado" }, { status: 404 }); const paidCents = Math.max(0, Math.min(data.paidCents, rows[0].priceCents)); await getDb().update(appointments).set({ paidCents, balanceCents: rows[0].priceCents - paidCents, paymentMethod: data.paymentMethod?.trim() || rows[0].paymentMethod, paymentStatus: paidCents >= rows[0].priceCents ? "approved" : "partial", status: data.courtesy ? "courtesy" : paidCents >= rows[0].priceCents ? "completed" : "confirmed" }).where(and(eq(appointments.id, data.id), eq(appointments.organizationId, manager.organizationId))); return Response.json({ updated: true }); }
    const oldName = data.oldName?.trim(), oldPhone = data.oldPhone?.trim(), name = data.name?.trim(), phone = data.phone?.replace(/\D/g, "");
    if (!oldName || !oldPhone || !name || !phone || phone.length < 10) return Response.json({ error: "Informe nome e WhatsApp válidos" }, { status: 400 });
    await getDb().update(appointments).set({ clientName: name, phone }).where(and(eq(appointments.organizationId, manager.organizationId), eq(appointments.clientName, oldName), eq(appointments.phone, oldPhone)));
    return Response.json({ updated: true, name, phone });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a cliente" }, { status: 500 }); }
}
