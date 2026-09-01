"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";

type View = "inicio" | "agenda" | "clientes" | "servicos" | "pacotes" | "financeiro";

type Payment = {
  method: "PIX" | "Dinheiro" | "Cartão de débito" | "Cartão de crédito";
  amount: number;
  paidAt: string;
};

type Client = {
  id: number;
  name: string;
  phone: string;
  pet: string;
  breed: string;
  size: string;
  note: string;
  color: string;
};

type Appointment = {
  id: number;
  day: number;
  time: string;
  pet: string;
  breed: string;
  client: string;
  service: string;
  duration: string;
  status: "confirmado" | "aguardando" | "concluido";
  color: string;
  price: number | null;
  payment?: Payment;
};

type Service = { id: number; name: string; category: string; duration: string; price: number | null; description: string; active: boolean; color: string };
type PackagePlan = { id: number; name: string; sessions: number; periodicity: string; validityDays: number; price: number | null; serviceId: number; courtesy: string; active: boolean };
type PackageUsage = { id: number; planId: number; clientId?: number; pet: string; client: string; used: number; total: number; startDate?: string; price?: number | null; payment?: Payment };

const initialClients: Client[] = [
  { id: 1, name: "Cliente Exemplo 1", phone: "Não informado", pet: "Pet Exemplo 1", breed: "Spitz Alemão", size: "Pequeno", note: "Pele sensível", color: "#ff8d78" },
  { id: 2, name: "Cliente Exemplo 2", phone: "Não informado", pet: "Pet Exemplo 2", breed: "SRD", size: "Médio", note: "Gosta de petiscos", color: "#47b8a5" },
  { id: 3, name: "Cliente Exemplo 3", phone: "Não informado", pet: "Pet Exemplo 3", breed: "Golden Retriever", size: "Grande", note: "Usa táxi dog", color: "#e8a93e" },
  { id: 4, name: "Cliente Exemplo 4", phone: "Não informado", pet: "Pet Exemplo 4", breed: "Pug", size: "Pequeno", note: "Primeiro atendimento", color: "#7b8de5" },
  { id: 5, name: "Cliente Exemplo 5", phone: "Não informado", pet: "Pet Exemplo 5", breed: "Lhasa Apso", size: "Pequeno", note: "Reativa ao secador", color: "#c984d7" },
];

const initialAppointments: Appointment[] = [
  { id: 1, day: 0, time: "09:00", pet: "Pet Exemplo 1", breed: "Spitz Alemão", client: "Cliente Exemplo 1", service: "Banho + hidratação", duration: "1h", status: "confirmado", color: "#ff8d78", price: 80, payment: { method: "PIX", amount: 80, paidAt: "Hoje, 09:54" } },
  { id: 2, day: 0, time: "10:30", pet: "Pet Exemplo 4", breed: "Pug", client: "Cliente Exemplo 4", service: "Primeiro banho", duration: "1h", status: "aguardando", color: "#7b8de5", price: 70 },
  { id: 3, day: 0, time: "13:00", pet: "Pet Exemplo 3", breed: "Golden Retriever", client: "Cliente Exemplo 3", service: "Banho + escovação", duration: "1h20", status: "confirmado", color: "#e8a93e", price: 120 },
  { id: 4, day: 0, time: "15:00", pet: "Pet Exemplo 2", breed: "SRD · Médio", client: "Cliente Exemplo 2", service: "Banho completo", duration: "1h20", status: "confirmado", color: "#47b8a5", price: 90, payment: { method: "Dinheiro", amount: 90, paidAt: "Hoje, 16:18" } },
  { id: 5, day: 1, time: "09:30", pet: "Pet Exemplo 5", breed: "Lhasa Apso", client: "Cliente Exemplo 5", service: "Banho + desembolo", duration: "2h", status: "aguardando", color: "#c984d7", price: 110 },
  { id: 6, day: 1, time: "13:30", pet: "Pet Exemplo 1", breed: "Spitz Alemão", client: "Cliente Exemplo 1", service: "Banho quinzenal", duration: "1h", status: "confirmado", color: "#ff8d78", price: 70 },
];

const initialServices: Service[] = [
  { id: 1, name: "Banho completo", category: "Banho", duration: "1h", price: null, description: "Higienização, secagem e finalização.", active: true, color: "#20a390" },
  { id: 2, name: "Tosa higiênica", category: "Tosa", duration: "40min", price: null, description: "Acabamento cuidadoso das áreas higiênicas.", active: true, color: "#ff7b63" },
  { id: 3, name: "Hidratação", category: "Adicional", duration: "30min", price: null, description: "Tratamento para pelagem e pele.", active: true, color: "#7b8de5" },
  { id: 4, name: "Retirada de nós", category: "Adicional", duration: "40min", price: null, description: "Desembolo avaliado conforme a pelagem.", active: true, color: "#d69b2a" },
  { id: 5, name: "Corte de unhas", category: "Cuidados", duration: "15min", price: null, description: "Corte seguro e acabamento das unhas.", active: true, color: "#c984d7" },
  { id: 6, name: "Táxi dog", category: "Transporte", duration: "A combinar", price: null, description: "Busca e entrega conforme a região.", active: true, color: "#438bbd" },
];

const initialPackages: PackagePlan[] = [
  { id: 1, name: "Banhos semanais", sessions: 4, periodicity: "Semanal", validityDays: 35, price: null, serviceId: 1, courtesy: "1 corte de unhas", active: true },
  { id: 2, name: "Banhos quinzenais", sessions: 4, periodicity: "Quinzenal", validityDays: 70, price: null, serviceId: 1, courtesy: "Hidratação na última sessão", active: true },
  { id: 3, name: "Pacote personalizado", sessions: 3, periodicity: "Personalizada", validityDays: 60, price: null, serviceId: 1, courtesy: "Benefícios a combinar", active: false },
];
const initialPackageUsage: PackageUsage[] = [
  { id: 1, planId: 1, clientId: 1, pet: "Pet Exemplo 1", client: "Cliente Exemplo 1", used: 2, total: 4, startDate: "2026-08-02", price: 240, payment: { method: "PIX", amount: 240, paidAt: "02/08, 10:12" } },
  { id: 2, planId: 2, clientId: 2, pet: "Pet Exemplo 2", client: "Cliente Exemplo 2", used: 3, total: 4, startDate: "2026-06-20", price: 260 },
];

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "inicio", label: "Visão geral", icon: "⌂" },
  { id: "agenda", label: "Agenda", icon: "□" },
  { id: "clientes", label: "Clientes & pets", icon: "♧" },
  { id: "servicos", label: "Serviços", icon: "✂" },
  { id: "pacotes", label: "Pacotes", icon: "▦" },
  { id: "financeiro", label: "Financeiro", icon: "$" },
];

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const displayPrice = (value: number | null) => value === null ? "Valor a definir" : formatCurrency(value);

function suggestedPrice(service: string) {
  if (service.includes("desembolo") || service.includes("tesoura")) return 110;
  if (service.includes("hidratação")) return 80;
  return 70;
}

function formatToday() {
  const localNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const value = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(localNow);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDays() {
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    date.setDate(date.getDate() + index);
    return {
      index,
      weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
      day: String(date.getDate()).padStart(2, "0"),
      month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""),
    };
  });
}

function StatusPill({ status }: { status: Appointment["status"] }) {
  const labels = { confirmado: "Confirmado", aguardando: "Aguardando", concluido: "Concluído" };
  return <span className={`status status-${status}`}><i />{labels[status]}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("inicio");
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [packages, setPackages] = useState<PackagePlan[]>(initialPackages);
  const [packageUsage, setPackageUsage] = useState<PackageUsage[]>(initialPackageUsage);
  const [selectedDay, setSelectedDay] = useState(0);
  const [modal, setModal] = useState<"client" | "appointment" | "payment" | "service" | "package" | "packageContract" | "packagePayment" | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [paymentAppointmentId, setPaymentAppointmentId] = useState<number | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedUsageId, setSelectedUsageId] = useState<number | null>(null);
  const [selectedContractClientId, setSelectedContractClientId] = useState<number | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [todayLabel, setTodayLabel] = useState("Hoje");
  const [days, setDays] = useState(() => Array.from({ length: 5 }, (_, index) => ({ index, weekday: index === 0 ? "Hoje" : "—", day: "--", month: "" })));

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setTodayLabel(formatToday());
      setDays(getDays());
      const storedClients = localStorage.getItem("tanobanho-clients");
      const storedAppointments = localStorage.getItem("tanobanho-appointments");
      const storedServices = localStorage.getItem("tanobanho-services");
      const storedPackages = localStorage.getItem("tanobanho-packages");
      const storedUsage = localStorage.getItem("tanobanho-package-usage");
      if (storedClients) setClients(JSON.parse(storedClients));
      if (storedAppointments) {
        const parsed = JSON.parse(storedAppointments) as Appointment[];
        setAppointments(parsed.map((item) => ({ ...item, price: item.price ?? suggestedPrice(item.service) })));
      }
      if (storedServices) setServices(JSON.parse(storedServices));
      if (storedPackages) setPackages(JSON.parse(storedPackages));
      if (storedUsage) setPackageUsage(JSON.parse(storedUsage));
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setModal(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [modal]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayAppointments = appointments.filter((item) => item.day === 0);
  const selectedAppointments = appointments.filter((item) => item.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  const filteredClients = clients.filter((client) => `${client.name} ${client.pet} ${client.breed}`.toLowerCase().includes(search.toLowerCase()));
  const selectedPaymentAppointment = appointments.find((item) => item.id === paymentAppointmentId);
  const selectedPackage = packages.find((item) => item.id === selectedPackageId);
  const selectedUsage = packageUsage.find((item) => item.id === selectedUsageId);
  const expectedToday = todayAppointments.reduce((total, item) => total + (item.price ?? 0), 0);
  const receivedToday = todayAppointments.reduce((total, item) => total + (item.payment?.amount ?? 0), 0);
  const pendingToday = expectedToday - receivedToday;
  const totalReceived = appointments.reduce((total, item) => total + (item.payment?.amount ?? 0), 0);
  const packageReceived = packageUsage.reduce((total, item) => total + (item.payment?.amount ?? 0), 0);
  const packagePending = packageUsage.reduce((total, item) => total + (item.payment ? 0 : (item.price ?? packages.find((plan) => plan.id === item.planId)?.price ?? 0)), 0);
  const editingService = services.find((item) => item.id === editingServiceId);
  const editingPackage = packages.find((item) => item.id === editingPackageId);

  const goTo = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const palette = ["#ef5aa5", "#0a9eaa", "#08747d", "#f177b4", "#18b8c2"];
    const newClient: Client = {
      id: Date.now(),
      name: String(data.get("name")),
      phone: String(data.get("phone")),
      pet: String(data.get("pet")),
      breed: String(data.get("breed")),
      size: String(data.get("size")),
      note: String(data.get("note") || "Sem observações"),
      color: palette[clients.length % palette.length],
    };
    const updated = [newClient, ...clients];
    setClients(updated);
    localStorage.setItem("tanobanho-clients", JSON.stringify(updated));
    setModal(null);
    setToast(`${newClient.pet} e ${newClient.name} foram cadastrados.`);
    goTo("clientes");
  };

  const addAppointment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = clients.find((client) => client.id === Number(data.get("client"))) ?? clients[0];
    const service = services.find((item) => item.id === Number(data.get("service"))) ?? services[0];
    const typedPrice = String(data.get("price") || "").trim();
    const newAppointment: Appointment = {
      id: Date.now(),
      day: Number(data.get("day")),
      time: String(data.get("time")),
      pet: selected.pet,
      breed: selected.breed,
      client: selected.name,
      service: service.name,
      duration: service.duration,
      status: "aguardando",
      color: selected.color,
      price: typedPrice ? Number(typedPrice) : service.price,
    };
    const updated = [...appointments, newAppointment];
    setAppointments(updated);
    localStorage.setItem("tanobanho-appointments", JSON.stringify(updated));
    setSelectedDay(newAppointment.day);
    setModal(null);
    setBookingServiceId(null);
    setToast(`Horário de ${newAppointment.pet} adicionado à agenda.`);
    goTo("agenda");
  };

  const openServiceBooking = (serviceId: number) => {
    setBookingServiceId(serviceId);
    setModal("appointment");
  };

  const openPackageContract = (packageId: number, clientId?: number) => {
    setSelectedPackageId(packageId);
    setSelectedContractClientId(clientId ?? null);
    setModal("packageContract");
  };

  const contractPackage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const plan = packages.find((item) => item.id === Number(data.get("planId"))) ?? selectedPackage;
    const client = clients.find((item) => item.id === Number(data.get("clientId")));
    if (!plan || !client) return;
    const rawPrice = String(data.get("price") || "").trim();
    const price = rawPrice ? Number(rawPrice) : plan.price;
    const paidNow = data.get("paymentStatus") === "Recebido";
    if (paidNow && price === null) { setToast("Informe o valor antes de confirmar o pagamento."); return; }
    const usage: PackageUsage = {
      id: Date.now(), planId: plan.id, clientId: client.id, pet: client.pet, client: client.name,
      used: 0, total: plan.sessions, startDate: String(data.get("startDate")), price,
      payment: paidNow ? { method: String(data.get("method")) as Payment["method"], amount: Number(rawPrice || price || 0), paidAt: "Agora" } : undefined,
    };
    const updated = [usage, ...packageUsage];
    setPackageUsage(updated);
    localStorage.setItem("tanobanho-package-usage", JSON.stringify(updated));
    setSelectedPackageId(null);
    setSelectedContractClientId(null);
    setModal(null);
    setToast(`${plan.name} contratado para ${client.pet}${paidNow ? " com pagamento confirmado" : " com pagamento pendente"}.`);
    goTo("pacotes");
  };

  const openPackagePayment = (usageId: number) => {
    setSelectedUsageId(usageId);
    setModal("packagePayment");
  };

  const registerPackagePayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUsage) return;
    const data = new FormData(event.currentTarget);
    const payment: Payment = { method: String(data.get("method")) as Payment["method"], amount: Number(data.get("amount")), paidAt: "Agora" };
    const updated = packageUsage.map((item) => item.id === selectedUsage.id ? { ...item, price: item.price ?? payment.amount, payment } : item);
    setPackageUsage(updated);
    localStorage.setItem("tanobanho-package-usage", JSON.stringify(updated));
    setModal(null);
    setSelectedUsageId(null);
    setToast(`Pagamento do pacote de ${selectedUsage.pet} confirmado via ${payment.method}.`);
  };

  const saveService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const rawPrice = String(data.get("price") || "").trim();
    const item: Service = { id: editingServiceId ?? Date.now(), name: String(data.get("name")), category: String(data.get("category")), duration: String(data.get("duration")), price: rawPrice ? Number(rawPrice) : null, description: String(data.get("description") || ""), active: data.get("active") === "on", color: editingService?.color ?? ["#20a390", "#ff7b63", "#7b8de5", "#d69b2a"][services.length % 4] };
    const updated = editingServiceId ? services.map((serviceItem) => serviceItem.id === editingServiceId ? item : serviceItem) : [item, ...services];
    setServices(updated); localStorage.setItem("tanobanho-services", JSON.stringify(updated)); setModal(null); setEditingServiceId(null); setToast(`${item.name} foi salvo no catálogo.`); goTo("servicos");
  };

  const savePackage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const rawPrice = String(data.get("price") || "").trim();
    const item: PackagePlan = { id: editingPackageId ?? Date.now(), name: String(data.get("name")), sessions: Number(data.get("sessions")), periodicity: String(data.get("periodicity")), validityDays: Number(data.get("validityDays")), price: rawPrice ? Number(rawPrice) : null, serviceId: Number(data.get("serviceId")), courtesy: String(data.get("courtesy") || "Sem cortesia"), active: data.get("active") === "on" };
    const updated = editingPackageId ? packages.map((plan) => plan.id === editingPackageId ? item : plan) : [item, ...packages];
    setPackages(updated); localStorage.setItem("tanobanho-packages", JSON.stringify(updated)); setModal(null); setEditingPackageId(null); setToast(`${item.name} foi salvo.`); goTo("pacotes");
  };

  const recordPackageSession = (id: number) => {
    const updated = packageUsage.map((item) => item.id === id && item.used < item.total ? { ...item, used: item.used + 1 } : item);
    setPackageUsage(updated); localStorage.setItem("tanobanho-package-usage", JSON.stringify(updated)); setToast("Sessão registrada no pacote.");
  };

  const confirmAppointment = (id: number) => {
    const updated = appointments.map((item) => item.id === id ? { ...item, status: "confirmado" as const } : item);
    setAppointments(updated);
    localStorage.setItem("tanobanho-appointments", JSON.stringify(updated));
    setToast("Atendimento confirmado com sucesso.");
  };

  const openPayment = (id: number) => {
    setPaymentAppointmentId(id);
    setModal("payment");
  };

  const registerPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPaymentAppointment) return;
    const data = new FormData(event.currentTarget);
    const payment: Payment = {
      method: String(data.get("method")) as Payment["method"],
      amount: Number(data.get("amount")),
      paidAt: "Agora",
    };
    const updated = appointments.map((item) => item.id === selectedPaymentAppointment.id ? { ...item, payment } : item);
    setAppointments(updated);
    localStorage.setItem("tanobanho-appointments", JSON.stringify(updated));
    setModal(null);
    setPaymentAppointmentId(null);
    setToast(`Pagamento de ${selectedPaymentAppointment.pet} confirmado via ${payment.method}.`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => goTo("inicio")} aria-label="Ir para visão geral">
          <Image className="brand-logo" src="/logo-ta-no-banho.jpeg" alt="Tá no Banho" width={240} height={240} priority />
        </button>
        <nav aria-label="Navegação principal">
          <p className="nav-label">MENU</p>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => goTo(item.id)}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
              {item.id === "agenda" && <em>{appointments.filter((a) => a.day === 0).length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="spark">✦</span><strong>Meta do fim de semana</strong><p>8 de 12 atendimentos</p>
          <div className="progress"><i /></div><small>Faltam 4 para bater a meta</small>
        </div>
        <div className="profile">
          <span>LP</span><div><strong>Lucas Pinheiro</strong><small>Administrador</small></div><button aria-label="Opções do perfil">•••</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Image src="/logo-ta-no-banho.jpeg" alt="" width={48} height={48} /><strong>Tá no Banho</strong></div>
          <div className="top-actions">
            <span className="demo-badge"><i /> Protótipo demonstrativo</span>
            <button className="icon-button" aria-label="Notificações">♢<b>2</b></button>
            <button className="primary-button" onClick={() => { setBookingServiceId(null); setModal("appointment"); }}><span>＋</span> Novo agendamento</button>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Navegação mobile">
          {navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => goTo(item.id)}>{item.icon}<small>{item.label}</small></button>)}
        </nav>

        {view === "inicio" && (
          <div className="content">
            <section className="page-heading">
              <div><p>{todayLabel}</p><h1>Bom dia, Lucas <span>👋</span></h1><h2>O dia está organizado. Vamos cuidar bem de cada pet.</h2></div>
              <button className="secondary-button" onClick={() => setModal("client")}><span>＋</span> Cadastrar cliente e pet</button>
            </section>
            <section className="stats-grid" aria-label="Indicadores">
              <article className="stat-card coral"><span className="stat-icon">▣</span><div><small>ATENDIMENTOS HOJE</small><strong>{todayAppointments.length}</strong><p><b>+1</b> em relação ao sábado anterior</p></div></article>
              <article className="stat-card teal"><span className="stat-icon">R$</span><div><small>PREVISÃO DO DIA</small><strong>{formatCurrency(expectedToday)}</strong><p>Já recebido: <b>{formatCurrency(receivedToday)}</b></p></div></article>
              <article className="stat-card violet"><span className="stat-icon">♡</span><div><small>CLIENTES ATIVOS</small><strong>{clients.length}</strong><p><b>2 novos</b> neste mês</p></div></article>
              <article className="stat-card yellow"><span className="stat-icon">◎</span><div><small>TAXA DE RETORNO</small><strong>78%</strong><p><b>+6%</b> nos últimos 30 dias</p></div></article>
            </section>
            <section className="dashboard-grid">
              <article className="panel schedule-panel">
                <div className="panel-head"><div><small>PRÓXIMOS ATENDIMENTOS</small><h3>Agenda de hoje</h3></div><button onClick={() => goTo("agenda")}>Ver agenda completa <span>→</span></button></div>
                <div className="mini-schedule">
                  {todayAppointments.slice(0, 4).map((item) => (
                    <div className="mini-row" key={item.id}>
                      <time>{item.time}</time><i style={{ background: item.color }} />
                      <div className="pet-avatar" style={{ background: `${item.color}20`, color: item.color }}>{item.pet.slice(0, 1)}</div>
                      <div className="mini-main"><strong>{item.pet}</strong><span>{item.service} · {item.client}</span></div><StatusPill status={item.status} />
                    </div>
                  ))}
                </div>
              </article>
              <article className="panel finance-panel">
                <div className="panel-head"><div><small>RESUMO DO MÊS</small><h3>Faturamento</h3></div><button onClick={() => goTo("financeiro")}>Ver financeiro <span>→</span></button></div>
                <div className="revenue"><strong>{formatCurrency(1430 + totalReceived)}</strong><span>↗ 12,4%</span></div><p>{formatCurrency(receivedToday)} recebidos hoje · {formatCurrency(pendingToday)} a receber</p>
                <div className="chart" aria-label="Gráfico ilustrativo de faturamento">
                  {[34, 46, 41, 62, 56, 80, 71, 92].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index === 7 ? "current" : ""} />)}
                </div>
                <div className="chart-labels"><span>Sem 1</span><span>Sem 2</span><span>Sem 3</span><span>Sem 4</span></div>
              </article>
            </section>
            <section className="insight-strip">
              <div className="insight-icon">💡</div><div><small>OPORTUNIDADE DA SEMANA</small><strong>5 pets estão há mais de 30 dias sem retornar.</strong><p>Um lembrete carinhoso pode ajudar a preencher os horários livres.</p></div>
              <button onClick={() => setToast("Lista de lembretes preparada para revisão.")}>Ver clientes <span>→</span></button>
            </section>
          </div>
        )}

        {view === "agenda" && (
          <div className="content">
            <section className="page-heading compact"><div><p>ORGANIZAÇÃO DO DIA</p><h1>Agenda</h1><h2>Visualize os horários e confirme cada atendimento.</h2></div><button className="primary-button" onClick={() => { setBookingServiceId(null); setModal("appointment"); }}><span>＋</span> Novo agendamento</button></section>
            <section className="date-selector">
              {days.map((day) => <button key={day.index} onClick={() => setSelectedDay(day.index)} className={selectedDay === day.index ? "selected" : ""}><small>{day.index === 0 ? "Hoje" : day.weekday}</small><strong>{day.day}</strong><span>{day.month}</span></button>)}
            </section>
            {selectedDay === 0 && <section className="payment-summary" aria-label="Resumo dos pagamentos do dia">
              <div><small>PREVISTO</small><strong>{formatCurrency(expectedToday)}</strong></div>
              <div className="received"><small>RECEBIDO</small><strong>{formatCurrency(receivedToday)}</strong></div>
              <div className="pending"><small>A RECEBER</small><strong>{formatCurrency(pendingToday)}</strong></div>
              <button onClick={() => goTo("financeiro")}>Abrir financeiro <span>→</span></button>
            </section>}
            <section className="panel agenda-panel">
              <div className="agenda-title"><div><small>{days[selectedDay].weekday}, {days[selectedDay].day} de {days[selectedDay].month}</small><h3>{selectedAppointments.length} atendimentos</h3></div><div className="legend"><span><i className="dot-confirmed" /> Confirmado</span><span><i className="dot-waiting" /> Aguardando</span><span><i className="dot-paid" /> Pago</span></div></div>
              {selectedAppointments.length ? (
                <div className="agenda-list">
                  {selectedAppointments.map((item) => (
                    <article className="agenda-item" key={item.id}>
                      <div className="agenda-time"><strong>{item.time}</strong><small>{item.duration}</small></div><div className="agenda-line"><i style={{ background: item.color }} /></div>
                      <div className="pet-avatar large" style={{ background: `${item.color}20`, color: item.color }}>{item.pet.slice(0, 1)}</div>
                      <div className="agenda-info"><strong>{item.pet}<small>{item.breed}</small></strong><p>{item.service}<span>•</span> {displayPrice(item.price)} <span>•</span> Tutor(a): {item.client}</p></div><StatusPill status={item.status} />
                      <div className="agenda-actions">
                        {item.payment ? <span className="payment-pill">✓ Pago · {item.payment.method}</span> : <button className="payment-button" onClick={() => openPayment(item.id)}>Confirmar pagamento</button>}
                        {item.status === "aguardando" && <button className="confirm-button" onClick={() => confirmAppointment(item.id)}>Confirmar</button>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="empty-state"><span>🐶</span><h3>Dia livre por aqui</h3><p>Adicione um atendimento para começar a organizar este dia.</p><button className="secondary-button" onClick={() => { setBookingServiceId(null); setModal("appointment"); }}>＋ Novo agendamento</button></div>}
            </section>
          </div>
        )}

        {view === "clientes" && (
          <div className="content">
            <section className="page-heading compact"><div><p>RELACIONAMENTO</p><h1>Clientes & pets</h1><h2>Informações essenciais para um atendimento mais cuidadoso.</h2></div><button className="primary-button" onClick={() => setModal("client")}><span>＋</span> Novo cadastro</button></section>
            <section className="client-toolbar"><label><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por tutor, pet ou raça" /></label><p><strong>{filteredClients.length}</strong> cadastros encontrados</p></section>
            <section className="client-grid">
              {filteredClients.map((client) => (
                <article className="client-card" key={client.id}>
                  <div className="client-top"><div className="pet-avatar xlarge" style={{ background: `${client.color}20`, color: client.color }}>{client.pet.slice(0, 1)}</div><StatusPill status="confirmado" /></div>
                  <h3>{client.pet}</h3><p className="breed">{client.breed} · {client.size}</p>
                  <div className="client-detail"><span>♧</span><div><small>TUTOR(A)</small><strong>{client.name}</strong></div></div>
                  <div className="client-detail"><span>⌕</span><div><small>WHATSAPP</small><strong>{client.phone}</strong></div></div>
                  <div className="client-note"><span>✦</span>{client.note}</div>
                  <div className="client-actions"><button onClick={() => openPackageContract(packages.find((plan) => plan.active)?.id ?? packages[0].id, client.id)}>Contratar pacote</button><button onClick={() => setToast(`Ficha de ${client.pet} aberta para consulta.`)}>Ver ficha <span>→</span></button></div>
                </article>
              ))}
              <button className="add-client-card" onClick={() => setModal("client")}><span>＋</span><strong>Cadastrar novo cliente</strong><small>Adicione tutor e pet em uma única etapa</small></button>
            </section>
          </div>
        )}

        {view === "servicos" && (
          <div className="content"><section className="page-heading compact"><div><p>CATÁLOGO</p><h1>Serviços</h1><h2>Cadastre o que o Tá no Banho oferece. Os valores podem ser definidos depois.</h2></div><button className="primary-button" onClick={() => { setEditingServiceId(null); setModal("service"); }}><span>＋</span> Novo serviço</button></section>
            <section className="catalog-grid">{services.map((service) => <article className="catalog-card" key={service.id}>
              <div className="catalog-top"><span className="catalog-icon" style={{ background: `${service.color}18`, color: service.color }}>✦</span><span className={service.active ? "catalog-status active" : "catalog-status"}>{service.active ? "Ativo" : "Inativo"}</span></div><small>{service.category}</small><h3>{service.name}</h3><p>{service.description}</p>
              <div className="catalog-meta"><span><small>DURAÇÃO</small><strong>{service.duration}</strong></span><span><small>VALOR</small><strong className={service.price === null ? "undefined-price" : ""}>{displayPrice(service.price)}</strong></span></div>
              <div className="card-actions"><button className="contract-button" disabled={!service.active} onClick={() => openServiceBooking(service.id)}>Agendar serviço</button><button onClick={() => { setEditingServiceId(service.id); setModal("service"); }}>Editar</button></div>
            </article>)}<button className="add-client-card catalog-add" onClick={() => { setEditingServiceId(null); setModal("service"); }}><span>＋</span><strong>Cadastrar serviço</strong><small>O preço é opcional</small></button></section>
          </div>
        )}

        {view === "pacotes" && (
          <div className="content"><section className="page-heading compact"><div><p>FIDELIZAÇÃO</p><h1>Pacotes</h1><h2>Organize sessões, validade e benefícios. Preços podem ficar para depois.</h2></div><button className="primary-button" onClick={() => { setEditingPackageId(null); setModal("package"); }}><span>＋</span> Novo pacote</button></section>
            <section className="package-grid">{packages.map((plan) => <article className="package-card" key={plan.id}>
              <div className="catalog-top"><span className="package-icon">▦</span><span className={plan.active ? "catalog-status active" : "catalog-status"}>{plan.active ? "Disponível" : "Rascunho"}</span></div><h3>{plan.name}</h3><strong className={plan.price === null ? "undefined-price package-price" : "package-price"}>{displayPrice(plan.price)}</strong>
              <div className="package-details"><span><b>{plan.sessions}</b> sessões</span><span><b>{plan.periodicity}</b> periodicidade</span><span><b>{plan.validityDays} dias</b> de validade</span><span><b>{services.find((s) => s.id === plan.serviceId)?.name ?? "Serviço"}</b> incluído</span></div><p>✦ {plan.courtesy}</p>
              <div className="card-actions"><button className="contract-button" disabled={!plan.active} onClick={() => openPackageContract(plan.id)}>Contratar pacote</button><button onClick={() => { setEditingPackageId(plan.id); setModal("package"); }}>Editar</button></div>
            </article>)}</section>
            <section className="panel active-packages"><div className="panel-head"><div><small>EM ANDAMENTO</small><h3>Pacotes contratados</h3></div><span className="payment-help">Acompanhe pagamento e sessões</span></div>{packageUsage.map((usage) => { const remaining = usage.total - usage.used; const plan = packages.find((item) => item.id === usage.planId); const price = usage.price ?? plan?.price ?? null; return <article className="usage-row" key={usage.id}>
              <div className="pet-avatar large">{usage.pet.slice(0,1)}</div><div className="usage-main"><strong>{usage.pet}<small>{usage.client}</small></strong><p>{plan?.name} · início {usage.startDate ? new Date(`${usage.startDate}T12:00:00`).toLocaleDateString("pt-BR") : "não informado"}</p><div className="usage-progress"><i style={{ width: `${Math.min(100, usage.used / usage.total * 100)}%` }} /></div></div>
              <div className={usage.payment ? "package-payment paid" : "package-payment pending"}><strong>{displayPrice(price)}</strong><small>{usage.payment ? `Pago · ${usage.payment.method}` : "Pagamento pendente"}</small></div><div className={remaining <= 1 ? "remaining alert" : "remaining"}><strong>{remaining}</strong><small>sessões restantes</small></div>
              <div className="usage-actions">{!usage.payment && <button className="payment-button" onClick={() => openPackagePayment(usage.id)}>Confirmar pagamento</button>}<button className="confirm-button" disabled={remaining === 0} onClick={() => recordPackageSession(usage.id)}>{remaining === 0 ? "Concluído" : "Usar sessão"}</button></div>
            </article>; })}</section>
          </div>
        )}

        {view === "financeiro" && (
          <div className="content">
            <section className="page-heading compact">
              <div><p>CONTROLE DE RECEBIMENTOS</p><h1>Financeiro</h1><h2>Registre pagamentos e acompanhe o que entrou e o que ainda falta receber.</h2></div>
              <button className="secondary-button" onClick={() => goTo("agenda")}>Ir para agenda <span>→</span></button>
            </section>
            <section className="finance-stats" aria-label="Resumo financeiro">
              <article><span className="finance-icon green">✓</span><div><small>RECEBIDO HOJE</small><strong>{formatCurrency(receivedToday)}</strong><p>{todayAppointments.filter((item) => item.payment).length} pagamentos registrados</p></div></article>
              <article><span className="finance-icon amber">↗</span><div><small>A RECEBER HOJE</small><strong>{formatCurrency(pendingToday)}</strong><p>{todayAppointments.filter((item) => !item.payment).length} atendimentos pendentes</p></div></article>
              <article><span className="finance-icon blue">R$</span><div><small>RECEBIDO NO PROTÓTIPO</small><strong>{formatCurrency(totalReceived + packageReceived)}</strong><p>Serviços e pacotes confirmados</p></div></article>
            </section>
            <section className="panel payments-panel">
              <div className="panel-head"><div><small>ATENDIMENTOS</small><h3>Pagamentos e pendências</h3></div><span className="payment-help">Registre o recebimento na linha do pet</span></div>
              <div className="payment-list">
                {appointments.slice().sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)).map((item) => (
                  <article className="payment-row" key={item.id}>
                    <div className="pet-avatar large" style={{ background: `${item.color}20`, color: item.color }}>{item.pet.slice(0, 1)}</div>
                    <div className="payment-main"><strong>{item.pet}<small>{item.client}</small></strong><p>{item.day === 0 ? "Hoje" : days[item.day]?.weekday || "Próximo dia"}, {item.time} · {item.service}</p></div>
                    <strong className="payment-value">{displayPrice(item.price)}</strong>
                    {item.payment ? <div className="paid-detail"><strong>Recebido</strong><small>{item.payment.method} · {item.payment.paidAt}</small></div> : <div className="pending-detail"><strong>Pendente</strong><small>Aguardando recebimento</small></div>}
                    {item.payment ? <span className="payment-check">✓</span> : <button className="payment-button" onClick={() => openPayment(item.id)}>Confirmar pagamento</button>}
                  </article>
                ))}
              </div>
            </section>
            <section className="panel payments-panel package-finance-panel">
              <div className="panel-head"><div><small>PACOTES</small><h3>Contratações e recebimentos</h3></div><span className="payment-help">Pendente: {formatCurrency(packagePending)}</span></div>
              <div className="payment-list">
                {packageUsage.map((usage) => { const plan = packages.find((item) => item.id === usage.planId); const price = usage.price ?? plan?.price ?? null; return <article className="payment-row" key={usage.id}>
                  <div className="pet-avatar large">{usage.pet.slice(0, 1)}</div><div className="payment-main"><strong>{usage.pet}<small>{usage.client}</small></strong><p>{plan?.name ?? "Pacote"} · {usage.used} de {usage.total} sessões utilizadas</p></div>
                  <strong className="payment-value">{displayPrice(price)}</strong>{usage.payment ? <div className="paid-detail"><strong>Recebido</strong><small>{usage.payment.method} · {usage.payment.paidAt}</small></div> : <div className="pending-detail"><strong>Pendente</strong><small>Aguardando recebimento</small></div>}
                  {usage.payment ? <span className="payment-check">✓</span> : <button className="payment-button" onClick={() => openPackagePayment(usage.id)}>Confirmar pagamento</button>}
                </article>; })}
              </div>
            </section>
          </div>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button>
            {modal === "client" ? (
              <form onSubmit={addClient}>
                <div className="modal-icon">🐾</div><small>NOVO CADASTRO</small><h2 id="modal-title">Cliente e pet</h2><p>Registre os dados essenciais para personalizar o atendimento.</p>
                <div className="form-grid">
                  <label className="full">Nome do tutor<input name="name" required placeholder="Ex.: Ana Souza" /></label>
                  <label className="full">WhatsApp<input name="phone" required placeholder="(11) 99999-9999" /></label>
                  <label>Nome do pet<input name="pet" required placeholder="Ex.: Mel" /></label><label>Raça<input name="breed" required placeholder="Ex.: Shih-tzu" /></label>
                  <label>Porte<select name="size" defaultValue="Pequeno"><option>Pequeno</option><option>Médio</option><option>Grande</option></select></label><label>Observação<input name="note" placeholder="Alergias, comportamento..." /></label>
                </div>
                <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Salvar cadastro</button></div>
              </form>
            ) : modal === "appointment" ? (
              <form onSubmit={addAppointment}>
                <div className="modal-icon calendar">□</div><small>NOVO HORÁRIO</small><h2 id="modal-title">Agendar atendimento</h2><p>Escolha o pet, o serviço e o melhor horário.</p>
                <div className="form-grid">
                  <label className="full">Cliente e pet<select name="client" required>{clients.map((client) => <option key={client.id} value={client.id}>{client.pet} · {client.name}</option>)}</select></label>
                  <label>Dia<select name="day" defaultValue={selectedDay}>{days.map((day) => <option key={day.index} value={day.index}>{day.index === 0 ? "Hoje" : day.weekday}, {day.day}/{day.month}</option>)}</select></label><label>Horário<input type="time" name="time" required defaultValue="09:00" /></label>
                  <label className="full">Serviço<select name="service" defaultValue={bookingServiceId ?? services.find((service) => service.active)?.id}>{services.filter((service) => service.active).map((service) => <option key={service.id} value={service.id}>{service.name} · {displayPrice(service.price)}</option>)}</select></label>
                  <label className="full">Valor do atendimento (opcional)<input name="price" type="number" min="0" step="0.01" placeholder="Deixe em branco para definir depois" /></label>
                </div>
                <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Adicionar à agenda</button></div>
              </form>
            ) : modal === "service" ? (
              <form onSubmit={saveService}>
                <div className="modal-icon calendar">✦</div><small>CATÁLOGO</small><h2 id="modal-title">{editingService ? "Editar serviço" : "Novo serviço"}</h2><p>O valor é opcional e poderá ser preenchido ou alterado depois.</p>
                <div className="form-grid">
                  <label className="full">Nome do serviço<input name="name" required defaultValue={editingService?.name} placeholder="Ex.: Escovação" /></label>
                  <label>Categoria<select name="category" defaultValue={editingService?.category ?? "Banho"}><option>Banho</option><option>Tosa</option><option>Adicional</option><option>Cuidados</option><option>Transporte</option></select></label>
                  <label>Duração<input name="duration" required defaultValue={editingService?.duration ?? "1h"} placeholder="Ex.: 1h" /></label>
                  <label className="full">Valor (opcional)<input name="price" type="number" min="0" step="0.01" defaultValue={editingService?.price ?? ""} placeholder="Deixe em branco para definir depois" /></label>
                  <label className="full">Descrição<input name="description" defaultValue={editingService?.description} placeholder="O que está incluído?" /></label>
                  <label className="check-label"><input name="active" type="checkbox" defaultChecked={editingService?.active ?? true} /> Serviço ativo</label>
                </div><div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Salvar serviço</button></div>
              </form>
            ) : modal === "package" ? (
              <form onSubmit={savePackage}>
                <div className="modal-icon calendar">▦</div><small>FIDELIZAÇÃO</small><h2 id="modal-title">{editingPackage ? "Editar pacote" : "Novo pacote"}</h2><p>Configure as regras agora e preencha o preço quando quiser.</p>
                <div className="form-grid">
                  <label className="full">Nome do pacote<input name="name" required defaultValue={editingPackage?.name} placeholder="Ex.: Banhos mensais" /></label>
                  <label>Sessões<input name="sessions" type="number" min="1" required defaultValue={editingPackage?.sessions ?? 4} /></label>
                  <label>Periodicidade<select name="periodicity" defaultValue={editingPackage?.periodicity ?? "Semanal"}><option>Semanal</option><option>Quinzenal</option><option>Mensal</option><option>Personalizada</option></select></label>
                  <label>Validade em dias<input name="validityDays" type="number" min="1" required defaultValue={editingPackage?.validityDays ?? 60} /></label>
                  <label>Valor (opcional)<input name="price" type="number" min="0" step="0.01" defaultValue={editingPackage?.price ?? ""} placeholder="A definir" /></label>
                  <label className="full">Serviço principal<select name="serviceId" defaultValue={editingPackage?.serviceId ?? services[0]?.id}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
                  <label className="full">Cortesia ou benefício<input name="courtesy" defaultValue={editingPackage?.courtesy} placeholder="Ex.: 1 corte de unhas" /></label>
                  <label className="check-label"><input name="active" type="checkbox" defaultChecked={editingPackage?.active ?? true} /> Pacote disponível</label>
                </div><div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Salvar pacote</button></div>
              </form>
            ) : modal === "packageContract" && selectedPackage ? (
              <form onSubmit={contractPackage}>
                <div className="modal-icon calendar">▦</div><small>CONTRATAÇÃO</small><h2 id="modal-title">Contratar pacote</h2><p>Vincule o pacote ao tutor e ao pet. O pagamento pode ser confirmado agora ou depois.</p>
                <div className="form-grid">
                  <label className="full">Pacote<select name="planId" required defaultValue={selectedPackage.id}>{packages.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.sessions} sessões · {displayPrice(plan.price)}</option>)}</select></label>
                  <label className="full">Cliente e pet<select name="clientId" required defaultValue={selectedContractClientId ?? clients[0]?.id}>{clients.map((client) => <option key={client.id} value={client.id}>{client.pet} · {client.name}</option>)}</select></label>
                  <label>Data de início<input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                  <label>Valor contratado<input name="price" type="number" min="0" step="0.01" defaultValue={selectedPackage.price ?? ""} placeholder="A definir" /></label>
                  <label>Situação do pagamento<select name="paymentStatus" defaultValue="Pendente"><option>Pendente</option><option>Recebido</option></select></label>
                  <label>Forma de pagamento<select name="method" defaultValue="PIX"><option>PIX</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label>
                </div><div className="payment-note"><span>✓</span> Ao salvar, o pacote aparecerá no controle de sessões e no Financeiro.</div>
                <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Confirmar contratação</button></div>
              </form>
            ) : modal === "packagePayment" && selectedUsage ? (
              <form onSubmit={registerPackagePayment}>
                <div className="modal-icon payment">R$</div><small>PAGAMENTO DO PACOTE</small><h2 id="modal-title">Confirmar pagamento</h2><p>Registre o recebimento da contratação vinculada ao pet.</p>
                <div className="payment-context"><div className="pet-avatar large">{selectedUsage.pet.slice(0, 1)}</div><div><strong>{selectedUsage.pet}</strong><span>{packages.find((item) => item.id === selectedUsage.planId)?.name} · {selectedUsage.client}</span></div></div>
                <div className="form-grid">
                  <label>Valor recebido<input name="amount" type="number" min="0" step="0.01" required defaultValue={selectedUsage.price ?? packages.find((item) => item.id === selectedUsage.planId)?.price ?? ""} placeholder="Informe o valor" /></label>
                  <label>Forma de pagamento<select name="method" defaultValue="PIX"><option>PIX</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label>
                </div><div className="payment-note"><span>✓</span> O recebimento será incluído imediatamente no resumo financeiro.</div>
                <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Confirmar recebimento</button></div>
              </form>
            ) : selectedPaymentAppointment ? (
              <form onSubmit={registerPayment}>
                <div className="modal-icon payment">R$</div><small>RECEBIMENTO</small><h2 id="modal-title">Confirmar pagamento</h2><p>Confirme o valor e a forma de pagamento do atendimento.</p>
                <div className="payment-context">
                  <div className="pet-avatar large" style={{ background: `${selectedPaymentAppointment.color}20`, color: selectedPaymentAppointment.color }}>{selectedPaymentAppointment.pet.slice(0, 1)}</div>
                  <div><strong>{selectedPaymentAppointment.pet}</strong><span>{selectedPaymentAppointment.service} · {selectedPaymentAppointment.client}</span></div>
                </div>
                <div className="form-grid">
                  <label>Valor recebido<input name="amount" type="number" min="0" step="0.01" required defaultValue={selectedPaymentAppointment.price ?? ""} placeholder="Informe o valor" /></label>
                  <label>Forma de pagamento<select name="method" defaultValue="PIX"><option>PIX</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label>
                </div>
                <div className="payment-note"><span>✓</span> O pagamento será lançado no resumo financeiro do dia.</div>
                <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Confirmar recebimento</button></div>
              </form>
            ) : null}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
