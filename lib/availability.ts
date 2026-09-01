import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { services } from "../db/schema";

export type DayAvailability = { day: string; enabled: boolean; start: string; end: string; breakStart: string; breakEnd: string };
export type AvailabilityConfig = { days: DayAvailability[]; intervalMinutes: number; minimumAdvanceHours: number };

export const AVAILABILITY_KEY = "__CONFIG_AVAILABILITY__";

export const defaultAvailability: AvailabilityConfig = {
  days: [
    { day: "Segunda-feira", enabled: false, start: "08:30", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
    { day: "Terça-feira", enabled: true, start: "10:30", end: "17:30", breakStart: "12:00", breakEnd: "13:00" },
    { day: "Quarta-feira", enabled: true, start: "10:30", end: "19:30", breakStart: "12:00", breakEnd: "13:00" },
    { day: "Quinta-feira", enabled: true, start: "09:30", end: "20:30", breakStart: "12:00", breakEnd: "13:00" },
    { day: "Sexta-feira", enabled: true, start: "09:30", end: "20:30", breakStart: "12:00", breakEnd: "13:00" },
    { day: "Sábado", enabled: true, start: "08:30", end: "17:30", breakStart: "12:30", breakEnd: "13:30" },
    { day: "Domingo", enabled: false, start: "08:30", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  ],
  intervalMinutes: 15,
  minimumAdvanceHours: 24,
};

function valid(config: unknown): config is AvailabilityConfig {
  if (!config || typeof config !== "object") return false;
  const value = config as AvailabilityConfig;
  return Array.isArray(value.days) && value.days.length === 7 && Number.isFinite(value.intervalMinutes) && Number.isFinite(value.minimumAdvanceHours);
}

export async function getAvailability(organizationId = "ta-no-banho") {
  const row = (await getDb().select().from(services).where(and(eq(services.organizationId, organizationId), eq(services.name, AVAILABILITY_KEY))).limit(1))[0];
  if (!row) return defaultAvailability;
  try { const parsed: unknown = JSON.parse(row.detail); return valid(parsed) ? parsed : defaultAvailability; }
  catch { return defaultAvailability; }
}

export async function saveAvailability(organizationId: string, config: AvailabilityConfig) {
  if (!valid(config)) throw new Error("Configuração de disponibilidade inválida.");
  const now = new Date().toISOString();
  await getDb().insert(services).values({ organizationId, name: AVAILABILITY_KEY, groupName: "Sistema", category: "config", detail: JSON.stringify(config), duration: "0", priceCents: 0, sessions: 1, active: true, updatedAt: now }).onConflictDoUpdate({ target: [services.organizationId, services.name], set: { detail: JSON.stringify(config), active: true, updatedAt: now } });
  return config;
}
