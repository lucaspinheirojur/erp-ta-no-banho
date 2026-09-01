import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { organizations, profiles } from "../db/schema";
import { createSupabaseServerClient } from "./supabase/server";

export type Manager = { userId: string; email: string; fullName: string | null; organizationId: string; role: string; welcomeSeenAt: string | null };

export async function getManager(): Promise<Manager | null> {
  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const rows = await getDb().select().from(profiles).where(and(eq(profiles.userId, user.id), inArray(profiles.role, ["owner", "admin", "staff"]))).limit(1);
  if (!rows.length) return null;
  return { userId: user.id, email: user.email, fullName: rows[0].fullName, organizationId: rows[0].organizationId, role: rows[0].role, welcomeSeenAt: rows[0].welcomeSeenAt };
}

export async function requireManager(returnTo = "/gestao") {
  const manager = await getManager();
  if (!manager) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return manager;
}

export async function ensureInitialOwner() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const db = getDb();
  await db.insert(organizations).values({ id: "ta-no-banho", name: "Tá no Banho", slug: "ta-no-banho" }).onConflictDoNothing();
  const existing = await db.select({ userId: profiles.userId }).from(profiles).limit(1);
  const ownProfile = existing.find(profile => profile.userId === user.id);
  if (existing.length && !ownProfile) return false;
  await db.insert(profiles).values({ userId: user.id, organizationId: "ta-no-banho", email: user.email.toLowerCase(), fullName: user.user_metadata?.full_name ?? "Administrador", role: "owner" }).onConflictDoNothing();
  return true;
}
