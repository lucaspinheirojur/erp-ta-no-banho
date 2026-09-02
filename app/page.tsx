"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";

type View = "inicio" | "agenda" | "clientes" | "servicos" | "pacotes" | "financeiro" | "analises";

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
  createdAt?: string;
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
  phone?: string;
};

type Service = { id: number; name: string; category: string; duration: string; price: number | null; description: string; active: boolean; color: string };
type PackagePlan = { id: number; name: string; sessions: number; periodicity: string; validityDays: number; price: number | null; serviceId: number; courtesy: string; active: boolean };
type PackageUsage = { id: number; planId: number; clientId?: number; pet: string; client: string; used: number; total: number; startDate?: string; price?: number | null; payment?: Payment };
type Expense = { id:number; description:string; category:string; amountCents:number; expenseDate:string; paymentMethod:string };

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "inicio", label: "Visão geral", icon: "⌂" },
  { id: "agenda", label: "Agenda", icon: "□" },
  { id: "clientes", label: "Clientes & pets", icon: "♧" },
  { id: "servicos", label: "Serviços", icon: "✂" },
  { id: "pacotes", label: "Pacotes", icon: "▦" },
  { id: "financeiro", label: "Financeiro", icon: "$" },
  { id: "analises", label: "Análises", icon: "⌁" },
];

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const displayPrice = (value: number | null) => value === null ? "Valor a definir" : formatCurrency(value);

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
      iso: date.toISOString().slice(0, 10),
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
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [packageUsage, setPackageUsage] = useState<PackageUsage[]>([]);
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [modal, setModal] = useState<"client" | "appointment" | "payment" | "service" | "package" | "packageContract" | "packagePayment" | "expense" | null>(null);
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
  const [reportMode,setReportMode]=useState<"month"|"custom">("month");
  const [reportMonth,setReportMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [reportFrom,setReportFrom]=useState(()=>`${new Date().toISOString().slice(0,7)}-01`);
  const [reportTo,setReportTo]=useState(()=>new Date().toISOString().slice(0,10));
  const [days, setDays] = useState(() => Array.from({ length: 5 }, (_, index) => ({ index, iso: "", weekday: index === 0 ? "Hoje" : "—", day: "--", month: "" })));

  const loadManagementData = async () => {
    const palette = ["#ef5aa5", "#0a9eaa", "#08747d", "#f177b4", "#18b8c2"];
    const [clientsResponse, appointmentsResponse, servicesResponse, packagesResponse,financeResponse] = await Promise.all([
      fetch("/api/clients"), fetch("/api/appointments"), fetch("/api/services?management=1"), fetch("/api/packages"),fetch("/api/finance"),
    ]);
    if ([clientsResponse, appointmentsResponse, servicesResponse, packagesResponse,financeResponse].some((response) => response.status === 403)) {
      setToast("Entre com a conta administrativa para carregar os dados reais.");
      return;
    }
    const [clientData, appointmentData, serviceData, packageData,financeData] = await Promise.all([
      clientsResponse.json(), appointmentsResponse.json(), servicesResponse.json(), packagesResponse.json(),financeResponse.json(),
    ]);
    setClients((clientData.clients ?? []).map((item: { id:number; name:string; phone:string; notes?:string; createdAt?:string; pets?:Array<{name:string;breed?:string;size:string;notes?:string}> }) => { const pet=item.pets?.[0]; return { id:item.id, name:item.name, phone:item.phone, pet:pet?.name || "Pet não informado", breed:pet?.breed || "Não informada", size:pet?.size || "Não informado", note:pet?.notes || item.notes || "Sem observações", color:palette[item.id % palette.length],createdAt:item.createdAt }; }));
    const today = new Date().toISOString().slice(0, 10);
    setAppointments((appointmentData.appointments ?? []).map((item: { id:number; appointmentDate:string; appointmentTime:string; petName:string; clientName:string; service:string; status:string; priceCents:number; paidCents:number; paymentMethod:string }) => {
      const offset = Math.round((new Date(`${item.appointmentDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
      return { id:item.id, day:offset, time:item.appointmentTime, pet:item.petName || "Pet não informado", breed:"", client:item.clientName, phone:(item as {phone?:string}).phone, service:item.service, duration:"1h", status:item.status === "completed" ? "concluido" : item.status === "confirmed" ? "confirmado" : "aguardando", color:palette[item.id % palette.length], price:item.priceCents / 100, payment:item.paidCents > 0 ? { method:(item.paymentMethod || "PIX") as Payment["method"], amount:item.paidCents / 100, paidAt:"Registrado" } : undefined };
    }));
    const mappedServices: Service[] = (serviceData.services ?? []).map((item: { id:number; name:string; group:string; duration:string; price:number; detail:string; active:boolean }) => ({ id:item.id, name:item.name, category:item.group, duration:item.duration, price:item.price, description:item.detail, active:item.active, color:palette[item.id % palette.length] }));
    setServices(mappedServices);
    setPackages((packageData.plans ?? []).map((p: {id:number;name:string;sessions:number;periodicity:string;validityDays:number;price:number|null;serviceId:number;courtesy:string;active:boolean})=>p));
    setPackageUsage((packageData.contracts ?? []).map((c:{id:number;planId:number;clientId:number;petName:string;client:string;usedSessions:number;totalSessions:number;startDate:string;price:number|null;paid:number;paymentMethod?:string})=>({id:c.id,planId:c.planId,clientId:c.clientId,pet:c.petName,client:c.client,used:c.usedSessions,total:c.totalSessions,startDate:c.startDate,price:c.price,payment:c.paid>0?{method:(c.paymentMethod||"PIX") as Payment["method"],amount:c.paid,paidAt:"Registrado"}:undefined})));
    setExpenses(financeData.expenses??[]);
  };

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setTodayLabel(formatToday());
      setDays(getDays());
      void loadManagementData().catch(() => setToast("Não foi possível carregar o painel agora."));
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
  const totalExpenses=expenses.reduce((total,item)=>total+item.amountCents/100,0);
  const yesterdayAppointments=appointments.filter(item=>item.day===-1).length;
  const newClientsThisMonth=clients.filter(item=>item.createdAt?.startsWith(new Date().toISOString().slice(0,7))).length;
  const appointmentCounts=new Map<string,number>();appointments.forEach(item=>{const key=item.phone||item.client;appointmentCounts.set(key,(appointmentCounts.get(key)||0)+1);});
  const returnRate=appointmentCounts.size?Math.round([...appointmentCounts.values()].filter(count=>count>1).length/appointmentCounts.size*100):0;
  const reportQuery=new URLSearchParams(reportMode==="month"?{mode:"month",month:reportMonth}:{mode:"custom",from:reportFrom,to:reportTo}).toString();
  const editingService = services.find((item) => item.id === editingServiceId);
  const editingPackage = packages.find((item) => item.id === editingPackageId);

  const goTo = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name")),
      phone: String(data.get("phone")),
      pet: String(data.get("pet")),
      breed: String(data.get("breed")),
      size: String(data.get("size")),
      notes: String(data.get("note") || ""),
    };
    const response = await fetch("/api/clients", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
    const result = await response.json(); if (!response.ok) { setToast(result.error || "Não foi possível cadastrar."); return; }
    await loadManagementData();
    setModal(null);
    setToast(`${payload.pet} e ${payload.name} foram cadastrados.`);
    goTo("clientes");
  };

  const addAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = clients.find((client) => client.id === Number(data.get("client"))) ?? clients[0];
    const service = services.find((item) => item.id === Number(data.get("service"))) ?? services[0];
    const typedPrice = String(data.get("price") || "").trim();
    const day = Number(data.get("day"));
    const response = await fetch("/api/appointments", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ type:"appointment", name:selected.name, phone:selected.phone, service:service.name, date:days[day]?.iso, time:String(data.get("time")), priceCents:Math.round(Number(typedPrice || service.price || 0) * 100) }) });
    const result=await response.json(); if(!response.ok){setToast(result.error || "Não foi possível agendar.");return;}
    await loadManagementData(); setSelectedDay(day);
    setModal(null);
    setBookingServiceId(null);
    setToast(`Horário de ${selected.pet} adicionado à agenda.`);
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

  const contractPackage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const plan = packages.find((item) => item.id === Number(data.get("planId"))) ?? selectedPackage;
    const client = clients.find((item) => item.id === Number(data.get("clientId")));
    if (!plan || !client) return;
    const rawPrice = String(data.get("price") || "").trim();
    const price = rawPrice ? Number(rawPrice) : plan.price;
    const paidNow = data.get("paymentStatus") === "Recebido";
    if (paidNow && price === null) { setToast("Informe o valor antes de confirmar o pagamento."); return; }
    const response=await fetch("/api/packages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"contract",planId:plan.id,clientId:client.id,petName:client.pet,startDate:String(data.get("startDate")),price,paid:paidNow,method:String(data.get("method")||"PIX")})});
    if(!response.ok){setToast("Não foi possível contratar o pacote.");return;} await loadManagementData();
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

  const registerPackagePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUsage) return;
    const data = new FormData(event.currentTarget);
    const payment: Payment = { method: String(data.get("method")) as Payment["method"], amount: Number(data.get("amount")), paidAt: "Agora" };
    const response=await fetch("/api/packages",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({type:"payment",id:selectedUsage.id,amount:payment.amount,method:payment.method})});if(!response.ok){setToast("Não foi possível registrar o pagamento.");return;}await loadManagementData();
    setModal(null);
    setSelectedUsageId(null);
    setToast(`Pagamento do pacote de ${selectedUsage.pet} confirmado via ${payment.method}.`);
  };

  const saveService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const rawPrice = String(data.get("price") || "").trim();
    const item: Service = { id: editingServiceId ?? Date.now(), name: String(data.get("name")), category: String(data.get("category")), duration: String(data.get("duration")), price: rawPrice ? Number(rawPrice) : null, description: String(data.get("description") || ""), active: data.get("active") === "on", color: editingService?.color ?? ["#20a390", "#ff7b63", "#7b8de5", "#d69b2a"][services.length % 4] };
    const method=editingServiceId?"PATCH":"POST";const payload=editingServiceId?{id:editingServiceId,name:item.name,group:item.category,detail:item.description,duration:item.duration,price:item.price,active:item.active}:{name:item.name,group:item.category,category:"avulso",detail:item.description,duration:item.duration,price:item.price,sessions:1};
    const response=await fetch("/api/services",{method,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok){setToast(result.error||"Não foi possível salvar o serviço.");return;}await loadManagementData();setModal(null);setEditingServiceId(null);setToast(`${item.name} foi salvo no catálogo.`);goTo("servicos");
  };

  const savePackage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const rawPrice = String(data.get("price") || "").trim();
    const item: PackagePlan = { id: editingPackageId ?? Date.now(), name: String(data.get("name")), sessions: Number(data.get("sessions")), periodicity: String(data.get("periodicity")), validityDays: Number(data.get("validityDays")), price: rawPrice ? Number(rawPrice) : null, serviceId: Number(data.get("serviceId")), courtesy: String(data.get("courtesy") || "Sem cortesia"), active: data.get("active") === "on" };
    const response=await fetch("/api/packages",{method:editingPackageId?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(editingPackageId?{...item,type:"plan"}:item)});if(!response.ok){setToast("Não foi possível salvar o pacote.");return;}await loadManagementData();setModal(null);setEditingPackageId(null);setToast(`${item.name} foi salvo.`);goTo("pacotes");
  };

  const recordPackageSession = async (id: number) => {
    const response=await fetch("/api/packages",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({type:"session",id})});if(!response.ok){setToast("Não foi possível registrar a sessão.");return;}await loadManagementData();setToast("Sessão registrada no pacote.");
  };

  const confirmAppointment = async (id: number) => {
    const response=await fetch("/api/appointments",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status:"confirmed"})});
    if(!response.ok){setToast("Não foi possível confirmar o atendimento.");return;} await loadManagementData();
    setToast("Atendimento confirmado com sucesso.");
  };

  const openPayment = (id: number) => {
    setPaymentAppointmentId(id);
    setModal("payment");
  };

  const registerPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPaymentAppointment) return;
    const data = new FormData(event.currentTarget);
    const payment: Payment = {
      method: String(data.get("method")) as Payment["method"],
      amount: Number(data.get("amount")),
      paidAt: "Agora",
    };
    const response=await fetch("/api/appointments",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:selectedPaymentAppointment.id,paidCents:Math.round(payment.amount*100),paymentMethod:payment.method})});
    if(!response.ok){setToast("Não foi possível registrar o pagamento.");return;} await loadManagementData();
    setModal(null);
    setPaymentAppointmentId(null);
    setToast(`Pagamento de ${selectedPaymentAppointment.pet} confirmado via ${payment.method}.`);
  };

  const addExpense=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);const response=await fetch("/api/finance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({description:String(data.get("description")),category:String(data.get("category")),amount:Number(data.get("amount")),date:String(data.get("date")),method:String(data.get("method"))})});if(!response.ok){setToast("Não foi possível registrar a despesa.");return;}await loadManagementData();setModal(null);setToast("Despesa registrada no financeiro.");};

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
              <article className="stat-card coral"><span className="stat-icon">▣</span><div><small>ATENDIMENTOS HOJE</small><strong>{todayAppointments.length}</strong><p><b>{todayAppointments.length-yesterdayAppointments>=0?"+":""}{todayAppointments.length-yesterdayAppointments}</b> em relação a ontem</p></div></article>
              <article className="stat-card teal"><span className="stat-icon">R$</span><div><small>PREVISÃO DO DIA</small><strong>{formatCurrency(expectedToday)}</strong><p>Já recebido: <b>{formatCurrency(receivedToday)}</b></p></div></article>
              <article className="stat-card violet"><span className="stat-icon">♡</span><div><small>CLIENTES ATIVOS</small><strong>{clients.length}</strong><p><b>{newClientsThisMonth} novos</b> neste mês</p></div></article>
              <article className="stat-card yellow"><span className="stat-icon">◎</span><div><small>TAXA DE RETORNO</small><strong>{returnRate}%</strong><p>Clientes com mais de um atendimento</p></div></article>
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
              <button className="secondary-button" onClick={() => setModal("expense")}>＋ Registrar despesa</button>
            </section>
            <section className="finance-stats" aria-label="Resumo financeiro">
              <article><span className="finance-icon green">✓</span><div><small>RECEBIDO HOJE</small><strong>{formatCurrency(receivedToday)}</strong><p>{todayAppointments.filter((item) => item.payment).length} pagamentos registrados</p></div></article>
              <article><span className="finance-icon amber">↗</span><div><small>A RECEBER HOJE</small><strong>{formatCurrency(pendingToday)}</strong><p>{todayAppointments.filter((item) => !item.payment).length} atendimentos pendentes</p></div></article>
              <article><span className="finance-icon blue">R$</span><div><small>SALDO OPERACIONAL</small><strong>{formatCurrency(totalReceived + packageReceived-totalExpenses)}</strong><p>{formatCurrency(totalExpenses)} em despesas registradas</p></div></article>
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

        {view === "analises" && (
          <div className="content analytics-page">
            <section className="page-heading compact"><div><p>INTELIGÊNCIA DO NEGÓCIO</p><h1>Análises</h1><h2>Acompanhe os resultados do Tá no Banho e exporte os relatórios financeiros.</h2></div><button className="secondary-button" onClick={()=>goTo("financeiro")}>Abrir financeiro <span>→</span></button></section>
            <section className="finance-stats" aria-label="Indicadores analíticos"><article><span className="finance-icon green">R$</span><div><small>RECEITA REGISTRADA</small><strong>{formatCurrency(totalReceived+packageReceived)}</strong><p>Atendimentos e pacotes</p></div></article><article><span className="finance-icon amber">−</span><div><small>DESPESAS</small><strong>{formatCurrency(totalExpenses)}</strong><p>Saídas registradas</p></div></article><article><span className="finance-icon blue">◎</span><div><small>SALDO OPERACIONAL</small><strong>{formatCurrency(totalReceived+packageReceived-totalExpenses)}</strong><p>Receitas menos despesas</p></div></article></section>
            <section className="panel report-panel"><div className="panel-head"><div><small>CENTRAL DE RELATÓRIOS</small><h3>Exportar dados financeiros</h3></div><span className="payment-help">PDF para conferência · Excel para análise</span></div><div className="report-controls"><div className="report-mode"><button className={reportMode==="month"?"active":""} onClick={()=>setReportMode("month")}>Mês completo</button><button className={reportMode==="custom"?"active":""} onClick={()=>setReportMode("custom")}>Período personalizado</button></div>{reportMode==="month"?<label>Mês<input type="month" value={reportMonth} onChange={event=>setReportMonth(event.target.value)}/></label>:<><label>De<input type="date" value={reportFrom} onChange={event=>setReportFrom(event.target.value)}/></label><label>Até<input type="date" value={reportTo} min={reportFrom} onChange={event=>setReportTo(event.target.value)}/></label></>}<div className="report-downloads"><a href={`/api/finance/report?${reportQuery}&format=pdf`} download>↓ Baixar PDF</a><a href={`/api/finance/report?${reportQuery}&format=xls`} download>↓ Baixar Excel</a></div></div></section>
          </div>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button>
            {modal === "expense" ? (
              <form onSubmit={addExpense}><div className="modal-icon payment">−</div><small>NOVA SAÍDA</small><h2 id="modal-title">Registrar despesa</h2><p>Inclua uma saída para manter o saldo operacional correto.</p><div className="form-grid"><label className="full">Descrição<input name="description" required placeholder="Ex.: Produtos de higiene"/></label><label>Categoria<input name="category" required placeholder="Ex.: Insumos"/></label><label>Valor<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Data<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Forma de pagamento<select name="method"><option>PIX</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label></div><div className="modal-actions"><button type="button" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="primary-button">Salvar despesa</button></div></form>
            ) : modal === "client" ? (
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
