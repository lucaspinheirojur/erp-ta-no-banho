import { and, eq, lt, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointments, clients, pets, services } from "../../../../db/schema";
import { serviceCatalog, visitsFor } from "../../../service-catalog";
import { getBookingSettings } from "../../../../lib/booking-settings";

const HANDLE = process.env.INFINITEPAY_HANDLE;
const ORGANIZATION_ID = "ta-no-banho";
type Input = {
  name?: string;
  phone?: string;
  petName?: string;
  petBreed?: string;
  petSize?: string;
  service?: string;
  dates?: string[];
  timesByDate?: Record<string, string>;
  paymentOption?: "deposit" | "full";
  method?: "pix" | "card" | "cash";
};
function hasFullName(value = "") {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}
function timeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
function durationMinutes(value = "1h") {
  const hours = value.match(/(\d+(?:[.,]\d+)?)\s*h/i);
  const minutes = value.match(/(\d+)\s*min/i);
  return Math.round((hours ? Number(hours[1].replace(",", ".")) * 60 : 0) + (minutes ? Number(minutes[1]) : 0)) || 60;
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as Input;
    const name = data.name?.trim(),
      phone = data.phone?.trim(),
      petName = data.petName?.trim(),
      service = data.service?.trim();
    const normalizedPhone = phone?.replace(/\D/g, "") ?? "";
    const dates = Array.isArray(data.dates)
      ? [...new Set(data.dates)].sort()
      : [];
    const db = getDb();
    const settings = await getBookingSettings();
    if (settings.bookingMode !== "open")
      return Response.json(
        { error: "O agendamento on-line está temporariamente indisponível" },
        { status: 403 },
      );
    const stored = service
      ? await db
          .select()
          .from(services)
          .where(and(eq(services.organizationId, ORGANIZATION_ID), eq(services.name, service), eq(services.active, true)))
          .limit(1)
      : [];
    const storedService = stored[0];
    const selectedService = storedService
      ? {
          name: storedService.name,
          group: storedService.groupName,
          category: storedService.category as "avulso" | "fidelidade",
          detail: storedService.detail,
          duration: storedService.duration,
          price: storedService.priceCents / 100,
          sessions: storedService.sessions,
          visits: storedService.visitsJson
            ? JSON.parse(storedService.visitsJson)
            : undefined,
        }
      : serviceCatalog.find((item) => item.name === service);
    const paymentOption = data.paymentOption === "full" ? "full" : "deposit";
    const cash = data.method === "cash";
    if (cash) {
      if (!settings.cashEnabled)
        return Response.json(
          { error: "O pagamento em dinheiro está indisponível no momento" },
          { status: 400 },
        );
    }
    if (!hasFullName(name))
      return Response.json(
        { error: "Informe nome e sobrenome da cliente" },
        { status: 400 },
      );
    if (
      normalizedPhone.length < 10 ||
      !petName ||
      !service ||
      !selectedService ||
      dates.length !== selectedService.sessions ||
      dates.length > 8
    )
      return Response.json(
        { error: "Confira os dados do tutor, do pet e do serviço" },
        { status: 400 },
      );
    if (
      dates.some(
        (date) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !/^\d{2}:\d{2}$/.test(data.timesByDate?.[date] ?? ""),
      )
    )
      return Response.json(
        { error: "Selecione data e horário válidos" },
        { status: 400 },
      );
    const nowInSaoPaulo = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );
    nowInSaoPaulo.setHours(0, 0, 0, 0);
    const lastOpenMonth = new Date(
      nowInSaoPaulo.getFullYear(),
      nowInSaoPaulo.getMonth() + (nowInSaoPaulo.getDate() >= 25 ? 1 : 0),
      1,
    );
    const lastOpenDay = new Date(
      lastOpenMonth.getFullYear(),
      lastOpenMonth.getMonth() + 1,
      0,
    );
    if (
      dates.some((value) => {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return (
          date < nowInSaoPaulo || date > lastOpenDay || date.getDay() === 0
        );
      })
    )
      return Response.json(
        {
          error:
            "Esta data ainda não está disponível. A agenda do próximo mês abre no dia 25.",
        },
        { status: 400 },
      );
    const paymentHoldLimit = new Date(
      Date.now() - 30 * 60 * 1000,
    ).toISOString();
    await db
      .update(appointments)
      .set({ status: "cancelled", paymentStatus: "expired", balanceCents: 0 })
      .where(
        and(
          eq(appointments.status, "awaiting_payment"),
          eq(appointments.organizationId, ORGANIZATION_ID),
          lt(appointments.createdAt, paymentHoldLimit),
        ),
      );
    const serviceRows = await db.select().from(services).where(eq(services.organizationId, ORGANIZATION_ID));
    const visits = visitsFor(selectedService);
    for (const [index, date] of dates.entries()) {
      const scheduled = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, ORGANIZATION_ID),
            eq(appointments.appointmentDate, date),
            ne(appointments.status, "cancelled"),
          ),
        );
      const requestedStart = timeMinutes(data.timesByDate![date]);
      const requestedEnd = requestedStart + durationMinutes(visits[index]?.duration ?? selectedService.duration);
      const occupied = scheduled.some((item) => {
        const existingStart = timeMinutes(item.appointmentTime);
        const blockedEnd = item.status === "blocked" ? item.externalReference?.split(":")[1] : undefined;
        const existingService = serviceRows.find((entry) => entry.name === item.service.split(" — ")[0]);
        const existingEnd = blockedEnd ? timeMinutes(blockedEnd) : existingStart + durationMinutes(existingService?.duration);
        return requestedStart < existingEnd && requestedEnd > existingStart;
      });
      if (occupied)
        return Response.json(
          { error: `O período escolhido em ${date} já está ocupado` },
          { status: 409 },
        );
    }
    const totalCents = Math.round(selectedService.price * 100);
    const amountCents =
      paymentOption === "full" ? totalCents : Math.round(totalCents * 0.5);
    const ref = crypto.randomUUID(),
      origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    if (!cash && !HANDLE)
      return Response.json(
        { error: "InfinitePay do Tá no Banho ainda não configurada" },
        { status: 503 },
      );
    const baseSessionCents = Math.floor(totalCents / dates.length);
    await db
      .insert(clients)
      .values({
        organizationId: ORGANIZATION_ID,
        name: name!,
        phone: normalizedPhone,
      })
      .onConflictDoUpdate({
        target: [clients.organizationId, clients.phone],
        set: { name: name!, updatedAt: new Date().toISOString() },
      });
    const client = (
      await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.organizationId, ORGANIZATION_ID),
            eq(clients.phone, normalizedPhone),
          ),
        )
        .limit(1)
    )[0];
    const existingPet = client
      ? (
          await db
            .select()
            .from(pets)
            .where(
              and(
                eq(pets.organizationId, ORGANIZATION_ID),
                eq(pets.clientId, client.id),
                eq(pets.name, petName!),
              ),
            )
            .limit(1)
        )[0]
      : undefined;
    const pet =
      existingPet ??
      (client
        ? (
            await db
              .insert(pets)
              .values({
                organizationId: ORGANIZATION_ID,
                clientId: client.id,
                name: petName!,
                breed: data.petBreed?.trim() || null,
                size: data.petSize?.trim() || "Não informado",
              })
              .returning()
          )[0]
        : undefined);
    await db.insert(appointments).values(
      dates.map((date, index) => {
        const priceCents =
          index === dates.length - 1
            ? totalCents - baseSessionCents * (dates.length - 1)
            : baseSessionCents;
        const visit = visits[index];
        return {
          organizationId: ORGANIZATION_ID,
          petId: pet?.id,
          clientName: name!,
          phone: normalizedPhone,
          petName: petName!,
          service:
            selectedService.category === "fidelidade"
              ? `${service} — ${visit.label}`
              : service,
          appointmentDate: date,
          appointmentTime: data.timesByDate![date],
          paymentMethod: cash ? "Dinheiro" : "InfinitePay",
          paymentOption: cash ? "at_service" : paymentOption,
          priceCents,
          depositCents: cash
            ? 0
            : paymentOption === "deposit"
              ? Math.round(priceCents * 0.5)
              : priceCents,
          paidCents: 0,
          balanceCents: cash ? priceCents : 0,
          externalReference: ref,
          paymentStatus: "pending",
          status: cash ? "confirmed" : "awaiting_payment",
        };
      }),
    );
    if (cash) return Response.json({ confirmed: true, externalReference: ref });
    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle: HANDLE,
        order_nsu: ref,
        redirect_url: `${origin}/api/payments/return`,
        webhook_url: `${origin}/api/payments/webhook`,
        customer: { name, phone_number: `+55${normalizedPhone}` },
        items: [
          {
            description: `${paymentOption === "full" ? "Pagamento integral" : "Sinal de 50%"} - ${service} - ${petName}`,
            quantity: 1,
            price: amountCents,
          },
        ],
      }),
    });
    const checkout = (await response.json()) as {
      url?: string;
      checkout_url?: string;
      message?: string;
    };
    const checkoutUrl = checkout.url ?? checkout.checkout_url;
    if (!response.ok || !checkoutUrl) {
      await db
        .update(appointments)
        .set({ paymentStatus: "failed", status: "payment_failed" })
        .where(eq(appointments.externalReference, ref));
      return Response.json(
        { error: checkout.message || "Não foi possível criar o pagamento" },
        { status: 502 },
      );
    }
    await db
      .update(appointments)
      .set({ checkoutUrl })
      .where(eq(appointments.externalReference, ref));
    return Response.json({ checkoutUrl, externalReference: ref, amountCents });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o pagamento",
      },
      { status: 500 },
    );
  }
}
