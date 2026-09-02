"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  serviceCatalog,
  visitsFor,
  type BookingCategory,
} from "../service-catalog";

type DayAvailability = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};
type AvailabilityConfig = {
  days: DayAvailability[];
  intervalMinutes: number;
  minimumAdvanceHours: number;
};
const defaultAvailability: AvailabilityConfig = {
  days: [
    {
      day: "Segunda-feira",
      enabled: false,
      start: "08:30",
      end: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      day: "Terça-feira",
      enabled: true,
      start: "10:30",
      end: "17:30",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      day: "Quarta-feira",
      enabled: true,
      start: "10:30",
      end: "19:30",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      day: "Quinta-feira",
      enabled: true,
      start: "09:30",
      end: "20:30",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      day: "Sexta-feira",
      enabled: true,
      start: "09:30",
      end: "20:30",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      day: "Sábado",
      enabled: true,
      start: "08:30",
      end: "17:30",
      breakStart: "12:30",
      breakEnd: "13:30",
    },
    {
      day: "Domingo",
      enabled: false,
      start: "08:30",
      end: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
  ],
  intervalMinutes: 15,
  minimumAdvanceHours: 24,
};
function minutesFor(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
function durationMinutes(value: string) {
  const normalized = value.toLowerCase().trim();
  const clock = normalized.match(/(\d+)\s*:\s*(\d+)/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const hours = normalized.match(/(\d+(?:[.,]\d+)?)\s*h/);
  if (hours) return Math.round(Number(hours[1].replace(",", ".")) * 60);
  const minutes = normalized.match(/(\d+)\s*min/);
  if (minutes) return Number(minutes[1]);
  const plain = normalized.match(/\d+/);
  return plain ? Number(plain[0]) : 60;
}
function dayFor(config: AvailabilityConfig, date: Date) {
  const day = date.getDay();
  return config.days[day === 0 ? 6 : day - 1];
}
const labels = [
  "Tipo",
  "Serviço",
  "Datas",
  "Horários",
  "Seus dados",
  "Pagamento",
];
const monthNames = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const weekNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const serviceAddress = "Endereço confirmado após a reserva";

function keyFor(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function shortDate(key: string) {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}
function calendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(first).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
}

export default function BookingFlow() {
  const [catalog, setCatalog] = useState(serviceCatalog);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<BookingCategory>("avulso");
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [serviceName, setServiceName] = useState(serviceCatalog[0].name);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date().getMonth());
  const [visibleYear, setVisibleYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [timesByDate, setTimesByDate] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petSize, setPetSize] = useState("Pequeno");
  const [method, setMethod] = useState<"pix" | "card" | "cash">("pix");
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full">(
    "deposit",
  );
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [, setCashEnabled] = useState(true);
  const [depositEnabled, setDepositEnabled] = useState(true);
  const [bookingNow] = useState(() => Date.now());
  const [bookingReference, setBookingReference] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [availability, setAvailability] = useState(defaultAvailability);

  const categoryServices = catalog.filter((item) => item.category === category);
  const service =
    catalog.find((item) => item.name === serviceName) ??
    categoryServices[0] ??
    serviceCatalog[0];
  const groups = [...new Set(categoryServices.map((item) => item.group))];
  const totalPrice = service.price;
  const deposit = totalPrice * 0.5;
  const amount =
    method === "cash" ? 0 : paymentOption === "full" ? totalPrice : deposit;
  const balance = totalPrice - amount;
  const requiredDates = service.sessions;
  const visits = visitsFor(service);
  const allDatesSelected = selectedDates.length === requiredDates;
  const allTimesSelected =
    allDatesSelected && selectedDates.every((date) => timesByDate[date]);
  const scheduleText = selectedDates
    .map(
      (date, index) =>
        `${visits[index]?.label ?? service.name}: ${shortDate(date)} às ${timesByDate[date] ?? "--:--"}`,
    )
    .join(" • ");
  const cells = useMemo(
    () => calendarDays(visibleYear, visibleMonth),
    [visibleYear, visibleMonth],
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastOpenMonth = new Date(
    today.getFullYear(),
    today.getMonth() + (today.getDate() >= 25 ? 1 : 0),
    1,
  );

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("payment");
    const reference =
      new URLSearchParams(window.location.search).get("ref") ?? "";
    queueMicrotask(() => {
      if (reference) setBookingReference(reference);
      if (result === "success") setDone(true);
      if (result === "pending")
        setPaymentError(
          "O pagamento está sendo confirmado. Aguarde alguns instantes.",
        );
    });
  }, []);

  useEffect(() => {
    fetch("/api/services")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          services?: typeof serviceCatalog;
        };
        if (data.services?.length) {
          setCatalog(data.services);
          setServiceName((current) =>
            data.services!.some((item) => item.name === current)
              ? current
              : data.services![0].name,
          );
        }
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { cashEnabled?: boolean; depositEnabled?: boolean }) => {
        if (typeof data.cashEnabled === "boolean") {
          setCashEnabled(data.cashEnabled);
          document.body.classList.toggle("cash-disabled", !data.cashEnabled);
          if (!data.cashEnabled)
            setMethod((current) => (current === "cash" ? "pix" : current));
        }
        if (typeof data.depositEnabled === "boolean") {
          setDepositEnabled(data.depositEnabled);
          if (!data.depositEnabled) setPaymentOption("full");
        }
      })
      .catch(() => undefined);
    return () => document.body.classList.remove("cash-disabled");
  }, []);
  useEffect(() => {
    fetch("/api/availability")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as AvailabilityConfig;
        if (data.days?.length === 7) setAvailability(data);
      })
      .catch(() => undefined);
  }, []);

  function timesForDate(dateKey: string, visitDuration = service.duration) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const hours = dayFor(availability, date);
    if (!hours?.enabled) return [];
    const start = minutesFor(hours.start),
      end = minutesFor(hours.end),
      breakStart = minutesFor(hours.breakStart),
      breakEnd = minutesFor(hours.breakEnd);
    const occupied =
      durationMinutes(visitDuration) + availability.intervalMinutes;
    const earliest =
      bookingNow + availability.minimumAdvanceHours * 60 * 60 * 1000;
    return Array.from(
      { length: Math.max(0, Math.floor((end - start) / 30) + 1) },
      (_, index) => start + index * 30,
    )
      .filter(
        (minutes) =>
          minutes + occupied <= end &&
          (minutes + occupied <= breakStart || minutes >= breakEnd) &&
          new Date(
            year,
            month - 1,
            day,
            Math.floor(minutes / 60),
            minutes % 60,
          ).getTime() >= earliest,
      )
      .map(
        (minutes) =>
          `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      );
  }

  function chooseCategory(next: BookingCategory) {
    setCategory(next);
    setCategoryChosen(true);
    setServiceName(
      catalog.find((item) => item.category === next)?.name ??
        serviceCatalog.find((item) => item.category === next)!.name,
    );
    setSelectedDates([]);
    setTimesByDate({});
  }

  function chooseService(next: string) {
    setServiceName(next);
    setSelectedDates([]);
    setTimesByDate({});
  }

  function toggleDate(day: number) {
    const key = keyFor(visibleYear, visibleMonth, day);
    const date = new Date(visibleYear, visibleMonth, day);
    if (
      date < today ||
      date >
        new Date(
          lastOpenMonth.getFullYear(),
          lastOpenMonth.getMonth() + 1,
          0,
        ) ||
      !dayFor(availability, date)?.enabled ||
      !timesForDate(key).length
    )
      return;
    setSelectedDates((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (requiredDates === 1) return [key];
      if (current.length >= requiredDates) return current;
      return [...current, key].sort();
    });
    setTimesByDate((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function moveMonth(direction: number) {
    const next = new Date(visibleYear, visibleMonth + direction, 1);
    const firstOpenMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (next < firstOpenMonth || next > lastOpenMonth) return;
    setVisibleYear(next.getFullYear());
    setVisibleMonth(next.getMonth());
  }

  async function approve() {
    if (!acceptedRules) {
      setPaymentError(
        "Confirme que leu e aceita as regras de agendamento e atendimento.",
      );
      return;
    }
    setProcessing(true);
    setPaymentError("");
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${name.trim()} ${surname.trim()}`,
          phone,
          petName,
          petBreed,
          petSize,
          service: service.name,
          dates: selectedDates,
          timesByDate,
          paymentOption,
          method,
        }),
      });
      const result = (await response.json()) as {
        checkoutUrl?: string;
        confirmed?: boolean;
        externalReference?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.error || "Não foi possível concluir o agendamento",
        );
      if (result.confirmed) {
        setBookingReference(result.externalReference ?? "");
        setDone(true);
        setProcessing(false);
        return;
      }
      if (!result.checkoutUrl)
        throw new Error(result.error || "Não foi possível abrir o pagamento");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o pagamento",
      );
      setProcessing(false);
    }
  }

  async function copyConfirmation() {
    const message = `Olá! A reserva de ${petName} no Tá no Banho foi confirmada.\n\n${service.name}\n${scheduleText}\n\n${serviceAddress}\n\nCódigo: ${bookingReference || "aguardando confirmação"}`;
    await navigator.clipboard?.writeText(message);
  }

  if (done)
    return (
      <main className="client-shell">
        <section className="booking-success">
          <span>✓</span>
          <Image
            src="/logo-ta-no-banho.jpeg"
            alt="Tá no Banho"
            width={180}
            height={180}
            unoptimized
          />
          <p className="kicker">
            {method === "cash" ? "RESERVA CONFIRMADA" : "PAGAMENTO CONFIRMADO"}
          </p>
          <h1>O horário de {petName} está reservado!</h1>
          <p>
            {method === "cash"
              ? "O pagamento será realizado no atendimento."
              : "A InfinitePay confirmou o pagamento."}
          </p>
          <div>
            <b>{service.name}</b>
            <small>{scheduleText}</small>
            <small>{serviceAddress}</small>
          </div>
          {bookingReference && (
            <small className="booking-code">
              Código da reserva: <b>{bookingReference}</b>
            </small>
          )}
          <button className="flow-primary" onClick={copyConfirmation}>
            Copiar confirmação para WhatsApp
          </button>
          <button
            className="flow-back"
            onClick={() => {
              window.history.replaceState({}, "", "/agendar/novo");
              setDone(false);
              setStep(0);
              setCategoryChosen(false);
            }}
          >
            Fazer outra reserva
          </button>
        </section>
      </main>
    );

  return (
    <main className="client-shell">
      <header className="client-header">
        <Image
          src="/logo-ta-no-banho.jpeg"
          alt="Tá no Banho"
          width={180}
          height={180}
          unoptimized
        />
        <div className="booking-brand-copy">
          <span>Reserva online</span>
          <b>Tá no Banho</b>
        </div>
        <p className="booking-menu-label">ETAPAS DA RESERVA</p>
        <nav className="booking-step-nav" aria-label="Progresso da reserva">
          {labels.map((label, index) => (
            <span key={label} className={index === step ? "active" : index < step ? "done" : ""}>
              <i>{index < step ? "✓" : index + 1}</i>
              {label}
            </span>
          ))}
        </nav>
        <aside className="booking-side-note">
          <b>Reserva segura ✦</b>
          <small>Escolha o cuidado, o horário e a forma de pagamento.</small>
        </aside>
      </header>
      <section className="flow-wrap">
        <div className="flow-progress">
          <div>
            <i style={{ width: `${(step + 1) * (100 / 6)}%` }} />
          </div>
          <span>Etapa {step + 1} de 6</span>
          <b>{labels[step]}</b>
        </div>
        <div className="flow-card">
          {step === 0 && (
            <>
              <p className="kicker">COMECE POR AQUI</p>
              <h1>Como você deseja agendar?</h1>
              <p className="flow-lead">
                Escolha entre um atendimento pontual ou um programa mensal com
                benefícios.
              </p>
              <div className="booking-type">
                <button
                  className={
                    categoryChosen && category === "avulso" ? "selected" : ""
                  }
                  onClick={() => chooseCategory("avulso")}
                >
                  <b>Agendamento avulso</b>
                  <small>Banho, tosa e cuidados pontuais</small>
                </button>
                <button
                  className={
                    categoryChosen && category === "fidelidade"
                      ? "selected"
                      : ""
                  }
                  onClick={() => chooseCategory("fidelidade")}
                >
                  <b>Clube fidelidade</b>
                  <small>Pacotes mensais com várias datas</small>
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="kicker">
                {category === "avulso"
                  ? "AGENDAMENTO AVULSO"
                  : "CLUBE FIDELIDADE"}
              </p>
              <h1>
                {category === "avulso"
                  ? "Qual cuidado você deseja?"
                  : "Qual pacote combina com você?"}
              </h1>
              <p className="flow-lead">
                Escolha o cuidado ideal para o seu pet.
              </p>
              {groups.map((group) => (
                <section key={group} className="service-group">
                  <p className="payment-label">{group.toUpperCase()}</p>
                  <div className="choice-list">
                    {categoryServices
                      .filter((item) => item.group === group)
                      .map((item, index) => (
                        <button
                          key={item.name}
                          className={
                            item.name === service.name ? "selected" : ""
                          }
                          onClick={() => chooseService(item.name)}
                        >
                          <i>
                            {index % 3 === 0
                              ? "✦"
                              : index % 3 === 1
                                ? "◒"
                                : "⌁"}
                          </i>
                          <span>
                            <b>{item.name}</b>
                            <small>
                              {item.detail}
                              {item.category === "avulso"
                                ? ` · ${item.duration}`
                                : ""}
                              {item.sessions > 1
                                ? ` · ${item.sessions} visitas`
                                : ""}
                            </small>
                          </span>
                          <strong>R$ {item.price}</strong>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <p className="kicker">
                ESCOLHA {requiredDates === 1 ? "A DATA" : "AS DATAS"}
              </p>
              <h1>
                {requiredDates === 1
                  ? "Quando você deseja vir?"
                  : `Selecione ${requiredDates} datas para o pacote`}
              </h1>
              <p className="flow-lead">
                {category === "fidelidade"
                  ? "Cada data corresponde a uma visita do pacote, inclusive as visitas com serviços combinados."
                  : "Escolha uma data disponível no calendário."}{" "}
                A agenda do próximo mês abre todo dia 25.
              </p>
              <div className="calendar">
                <header>
                  <button
                    onClick={() => moveMonth(-1)}
                    aria-label="Mês anterior"
                  >
                    ‹
                  </button>
                  <b>
                    {monthNames[visibleMonth]} de {visibleYear}
                  </b>
                  <button onClick={() => moveMonth(1)} aria-label="Próximo mês">
                    ›
                  </button>
                </header>
                <div className="calendar-week">
                  {weekNames.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {cells.map((day, index) =>
                    day === null ? (
                      <i key={`empty-${index}`} />
                    ) : (
                      (() => {
                        const key = keyFor(visibleYear, visibleMonth, day);
                        const date = new Date(visibleYear, visibleMonth, day);
                        const disabled =
                          date < today ||
                          date >
                            new Date(
                              lastOpenMonth.getFullYear(),
                              lastOpenMonth.getMonth() + 1,
                              0,
                            ) ||
                          !dayFor(availability, date)?.enabled ||
                          !timesForDate(key).length;
                        return (
                          <button
                            key={key}
                            disabled={disabled}
                            className={
                              selectedDates.includes(key) ? "selected" : ""
                            }
                            onClick={() => toggleDate(day)}
                          >
                            <b>{day}</b>
                            {!disabled && (
                              <small>
                                {selectedDates.includes(key)
                                  ? "selecionado"
                                  : "livre"}
                              </small>
                            )}
                          </button>
                        );
                      })()
                    ),
                  )}
                </div>
              </div>
              <div className="selected-dates">
                <b>
                  {selectedDates.length} de {requiredDates}{" "}
                  {requiredDates === 1
                    ? "data selecionada"
                    : "datas selecionadas"}
                </b>
                <span>
                  {selectedDates.length
                    ? selectedDates
                        .map(
                          (date, index) =>
                            `${shortDate(date)} — ${visits[index]?.label ?? service.name}`,
                        )
                        .join(" · ")
                    : "Selecione no calendário"}
                </span>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="kicker">HORÁRIOS DO AGENDAMENTO</p>
              <h1>
                {selectedDates.length === 1
                  ? "Escolha seu horário"
                  : "Escolha um horário para cada visita"}
              </h1>
              <p className="flow-lead">
                Os horários apresentados respeitam a jornada de atendimento de
                cada dia.
              </p>
              <div className="multi-times">
                {selectedDates.map((date, index) => (
                  <article key={date}>
                    <div>
                      <b>{shortDate(date)}</b>
                      <small>
                        {visits[index]?.label ?? service.name} ·{" "}
                        {visits[index]?.duration ?? service.duration}
                      </small>
                    </div>
                    <div>
                      {timesForDate(
                        date,
                        visits[index]?.duration ?? service.duration,
                      ).map((time) => (
                        <button
                          key={time}
                          className={
                            timesByDate[date] === time ? "selected" : ""
                          }
                          onClick={() =>
                            setTimesByDate((current) => ({
                              ...current,
                              [date]: time,
                            }))
                          }
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <p className="availability-note">
                <i /> O último horário possível considera a duração do serviço,
                o intervalo e a pausa configurados pela equipe.
              </p>
            </>
          )}

          {step === 4 && (
            <>
              <p className="kicker">TUTOR E PET</p>
              <h1>Conte para quem é o cuidado</h1>
              <p className="flow-lead">
                Usaremos os dados somente para organizar e confirmar a reserva.
              </p>
              <div className="flow-fields">
                <label>
                  Nome do tutor
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Sobrenome
                  <input
                    value={surname}
                    onChange={(event) => setSurname(event.target.value)}
                    required
                  />
                </label>
                <label>
                  WhatsApp
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                  />
                </label>
                <label>
                  Nome do pet
                  <input
                    value={petName}
                    onChange={(event) => setPetName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Raça
                  <input
                    value={petBreed}
                    onChange={(event) => setPetBreed(event.target.value)}
                  />
                </label>
                <label>
                  Porte
                  <select
                    value={petSize}
                    onChange={(event) => setPetSize(event.target.value)}
                  >
                    <option>Pequeno</option>
                    <option>Médio</option>
                    <option>Grande</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="test-banner">
                PAGAMENTO ONLINE OU NO ATENDIMENTO
              </div>
              <p className="kicker">FORMA DE PAGAMENTO</p>
              <h1>Como você deseja pagar?</h1>
              {category === "fidelidade" && (
                <p className="package-total">
                  Clube com <b>{requiredDates} atendimentos</b> · valor total do
                  pacote
                </p>
              )}
              <div className="payment-choices">
                <button
                  className={method === "pix" ? "selected" : ""}
                  onClick={() => setMethod("pix")}
                >
                  <b>◈ Pix</b>
                  <small>Pagamento online pela InfinitePay</small>
                </button>
                <button
                  className={method === "card" ? "selected" : ""}
                  onClick={() => setMethod("card")}
                >
                  <b>▣ Cartão</b>
                  <small>Pagamento online pela InfinitePay</small>
                </button>
                <button
                  className={method === "cash" ? "selected" : ""}
                  onClick={() => setMethod("cash")}
                >
                  <b>● Dinheiro</b>
                  <small>Pagamento realizado no atendimento</small>
                </button>
              </div>
              {method !== "cash" ? (
                <>
                  <p className="payment-label">VALOR DO PAGAMENTO</p>
                  <div className="amount-choices">
                    {depositEnabled && <button
                      className={paymentOption === "deposit" ? "selected" : ""}
                      onClick={() => setPaymentOption("deposit")}
                    >
                      <span>
                        <b>Sinal de 50%</b>
                        <small>O restante é pago nos atendimentos</small>
                      </span>
                      <strong>R$ {deposit.toFixed(2).replace(".", ",")}</strong>
                    </button>}
                    <button
                      className={paymentOption === "full" ? "selected" : ""}
                      onClick={() => setPaymentOption("full")}
                    >
                      <span>
                        <b>Pagamento integral</b>
                        <small>Quite todo o serviço ou pacote agora</small>
                      </span>
                      <strong>
                        R$ {totalPrice.toFixed(2).replace(".", ",")}
                      </strong>
                    </button>
                  </div>
                </>
              ) : (
                <p className="package-total">
                  O valor integral de{" "}
                  <b>R$ {totalPrice.toFixed(2).replace(".", ",")}</b> será pago
                  em dinheiro no atendimento.
                </p>
              )}
              <div className="booking-recap">
                <span>
                  <b>{service.name}</b>
                  <small>{scheduleText}</small>
                  <em>
                    {method === "cash"
                      ? "Pagamento pendente no atendimento"
                      : balance > 0
                        ? `Restante: R$ ${balance.toFixed(2).replace(".", ",")}`
                        : "Nenhum valor restante"}
                  </em>
                </span>
                <strong>
                  <small>
                    {method === "cash"
                      ? "A pagar depois"
                      : paymentOption === "full"
                        ? "Total agora"
                        : "Sinal agora"}
                  </small>
                  R${" "}
                  {(method === "cash" ? totalPrice : amount)
                    .toFixed(2)
                    .replace(".", ",")}
                </strong>
              </div>
              <div className="payment-preview card-generated">
                <div className="card-test-fields">
                  <div className="card-test-heading">
                    <span>✓</span>
                    <p>
                      <b>
                        {method === "cash"
                          ? "Pagamento presencial"
                          : "Você será direcionada à InfinitePay"}
                      </b>
                      <small>
                        {method === "cash"
                          ? "O horário será registrado e o recebimento ficará pendente na gestão."
                          : "O QR Code Pix ou os campos seguros do cartão serão exibidos no checkout oficial."}
                      </small>
                    </p>
                  </div>
                  {method !== "cash" && (
                    <p className="card-charge">
                      Valor da cobrança:{" "}
                      <b>R$ {amount.toFixed(2).replace(".", ",")}</b>
                    </p>
                  )}
                </div>
              </div>
              <section className="booking-rules">
                <b>Regras de agendamento e atendimento</b>
                <ul>
                  <li>
                    O agendamento online é confirmado após a aprovação do
                    pagamento escolhido.
                  </li>
                  <li>
                    A tolerância para atrasos é de 15 minutos; após esse
                    período, o serviço poderá ser adaptado.
                  </li>
                  <li>
                    Se precisar alterar o horário, entre em contato diretamente
                    com a equipe do Tá no Banho.
                  </li>
                </ul>
                <label>
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(event) => setAcceptedRules(event.target.checked)}
                  />
                  <span>Li e estou de acordo com as regras acima.</span>
                </label>
              </section>
              {paymentError && (
                <p className="availability-note">{paymentError}</p>
              )}
            </>
          )}

          <div className="flow-actions">
            {step > 0 && (
              <button className="flow-back" onClick={() => setStep(step - 1)}>
                ← Voltar
              </button>
            )}
            {step < 5 ? (
              <button
                className="flow-primary"
                disabled={
                  (step === 0 && !categoryChosen) ||
                  (step === 2 && !allDatesSelected) ||
                  (step === 3 && !allTimesSelected) ||
                  (step === 4 &&
                    (!name.trim() ||
                      !surname.trim() ||
                      !phone.trim() ||
                      !petName.trim()))
                }
                onClick={() => setStep(step + 1)}
              >
                Continuar →
              </button>
            ) : (
              <button
                className="flow-primary"
                disabled={processing || !acceptedRules}
                onClick={approve}
              >
                {processing
                  ? "Confirmando..."
                  : method === "cash"
                    ? "Confirmar reserva"
                    : "Ir para pagamento seguro"}
              </button>
            )}
          </div>
        </div>
        <aside className="flow-help">
          🔒{" "}
          <span>
            <b>Agendamento seguro e simples</b>
            <small>Você pode voltar e alterar qualquer escolha.</small>
          </span>
        </aside>
      </section>
    </main>
  );
}
