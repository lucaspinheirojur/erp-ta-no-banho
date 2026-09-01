import { getManager } from "../../../lib/auth";
import { getAvailability, saveAvailability, type AvailabilityConfig } from "../../../lib/availability";

export async function GET() {
  try { return Response.json(await getAvailability()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os horários" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try { return Response.json(await saveAvailability(manager.organizationId, await request.json() as AvailabilityConfig)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar os horários" }, { status: 400 }); }
}
