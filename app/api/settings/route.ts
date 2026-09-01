import { getDb } from "../../../db";
import { services } from "../../../db/schema";
import { getManager } from "../../../lib/auth";
import {
  CASH_KEY,
  getBookingSettings,
  setBookingMode,
  type BookingMode,
} from "../../../lib/booking-settings";

export async function GET() {
  try {
    return Response.json(await getBookingSettings());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as configurações",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const manager = await getManager();
  if (!manager)
    return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  try {
    const body = (await request.json()) as {
      cashEnabled?: boolean;
      bookingMode?: BookingMode;
    };
    if (body.cashEnabled === undefined && !body.bookingMode)
      return Response.json({ error: "Configuração inválida" }, { status: 400 });
    if (
      body.bookingMode &&
      !["open", "paused", "management_only"].includes(body.bookingMode)
    )
      return Response.json(
        { error: "Modo de agenda inválido" },
        { status: 400 },
      );
    if (typeof body.cashEnabled === "boolean")
      await getDb()
        .insert(services)
        .values({
          organizationId: manager.organizationId,
          name: CASH_KEY,
          groupName: "Sistema",
          category: "config",
          detail: "Controla o pagamento presencial",
          duration: "0",
          priceCents: 0,
          sessions: 1,
          active: body.cashEnabled,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [services.organizationId, services.name],
          set: {
            active: body.cashEnabled,
            updatedAt: new Date().toISOString(),
          },
        });
    if (body.bookingMode)
      await setBookingMode(manager.organizationId, body.bookingMode);
    return Response.json(await getBookingSettings(manager.organizationId));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível salvar",
      },
      { status: 500 },
    );
  }
}
