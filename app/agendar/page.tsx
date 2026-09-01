import type { Metadata } from "next";
import Image from "next/image";
import InstallApp from "./install-app";
import { getBookingSettings } from "../../lib/booking-settings";

export const metadata: Metadata = {
  title: "Tá no Banho | Reserva online",
  description: "Escolha o cuidado do seu pet e reserve online.",
};
export const dynamic = "force-dynamic";

export default async function AgendarCoverPage() {
  const { bookingMode } = await getBookingSettings().catch(() => ({
    bookingMode: "open" as const,
  }));
  if (bookingMode === "management_only")
    return (
      <main className="booking-cover photo-cover">
        <div className="photo-cover-shade" />
        <section className="photo-cover-content">
          <Image
            src="/logo-ta-no-banho.jpeg"
            alt="Tá no Banho"
            className="photo-cover-logo"
            width={330}
            height={130}
            unoptimized
          />
          <div className="booking-closed-card">
            <h1>Reservas on-line indisponíveis</h1>
            <p>Entre em contato diretamente com o Tá no Banho.</p>
          </div>
        </section>
      </main>
    );
  return (
    <main className="booking-cover photo-cover">
      <div className="photo-cover-shade" />
      <section className="photo-cover-content">
        <Image
          src="/logo-ta-no-banho.jpeg"
          alt="Tá no Banho"
          className="photo-cover-logo"
          width={330}
          height={130}
          unoptimized
        />
        <div className="photo-cover-actions">
          {bookingMode === "open" ? (
            <a href="/agendar/novo">Agendar meu horário</a>
          ) : (
            <div className="booking-paused">
              <b>Agenda temporariamente fechada</b>
              <small>Novos horários serão liberados em breve.</small>
            </div>
          )}
          <InstallApp />
        </div>
      </section>
      <a className="cover-privacy-link" href="/privacidade">
        Política de Privacidade
      </a>
    </main>
  );
}
