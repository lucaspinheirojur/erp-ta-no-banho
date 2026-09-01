import type { Metadata } from "next";
import BookingFlow from "../booking-flow";
import { redirect } from "next/navigation";
import { getBookingSettings } from "../../../lib/booking-settings";

export const metadata: Metadata = { title: "Nova reserva | Tá no Banho", description: "Escolha o serviço, a data e o horário do seu pet." };
export const dynamic = "force-dynamic";
export default async function NovoAgendamentoPage() { const { bookingMode } = await getBookingSettings().catch(() => ({ bookingMode: "open" as const })); if (bookingMode !== "open") redirect("/agendar"); return <BookingFlow />; }
