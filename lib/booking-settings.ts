import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { services } from "../db/schema";

export type BookingMode = "open" | "paused" | "management_only";

export const CASH_KEY = "__CONFIG_CASH_ENABLED__";
export const BOOKING_ENABLED_KEY = "__CONFIG_BOOKING_ENABLED__";
export const BOOKING_VISIBLE_KEY = "__CONFIG_BOOKING_VISIBLE__";

const CONFIGS: Record<string, string> = {
  [CASH_KEY]: "Controla o pagamento presencial",
  [BOOKING_ENABLED_KEY]: "Controla a criação de agendamentos públicos",
  [BOOKING_VISIBLE_KEY]: "Controla a visibilidade do agendamento público",
};

async function ensureSettings(organizationId: string) {
  const db = getDb();
  for (const [name, detail] of Object.entries(CONFIGS)) {
    await db.insert(services).values({ organizationId, name, groupName: "Sistema", category: "config", detail, duration: "0", priceCents: 0, sessions: 1, active: true }).onConflictDoNothing({ target: [services.organizationId, services.name] });
  }
}

export async function getBookingSettings(organizationId = "ta-no-banho") {
  await ensureSettings(organizationId);
  const rows = await getDb().select().from(services).where(and(eq(services.organizationId, organizationId), inArray(services.name, Object.keys(CONFIGS))));
  const enabled = (key: string) => rows.find(row => row.name === key)?.active !== false;
  const bookingEnabled = enabled(BOOKING_ENABLED_KEY);
  const bookingVisible = enabled(BOOKING_VISIBLE_KEY);
  const bookingMode: BookingMode = bookingEnabled ? "open" : bookingVisible ? "paused" : "management_only";
  return { cashEnabled: enabled(CASH_KEY), bookingMode };
}

export async function setBookingMode(organizationId: string, mode: BookingMode) {
  const db = getDb();
  const now = new Date().toISOString();
  const values = [
    { name: BOOKING_ENABLED_KEY, active: mode === "open" },
    { name: BOOKING_VISIBLE_KEY, active: mode !== "management_only" },
  ];
  for (const value of values) {
    await db.insert(services).values({ organizationId, name: value.name, groupName: "Sistema", category: "config", detail: CONFIGS[value.name], duration: "0", priceCents: 0, sessions: 1, active: value.active, updatedAt: now }).onConflictDoUpdate({ target: [services.organizationId, services.name], set: { active: value.active, updatedAt: now } });
  }
}
