export type BookingCategory = "avulso" | "fidelidade";
export type PackageVisit = { label: string; duration: string };
export type ServiceItem = { id?: number; name: string; group: string; category: BookingCategory; detail: string; duration: string; price: number; sessions: number; visits?: PackageVisit[]; active?: boolean };
export function visitsFor(service: ServiceItem): PackageVisit[] { return service.visits ?? Array.from({ length: service.sessions }, () => ({ label: service.name, duration: service.duration })); }
export const serviceCatalog: ServiceItem[] = [
  { category: "avulso", group: "Banho", name: "Banho completo · porte pequeno", detail: "Higienização, secagem e finalização", duration: "1h", price: 70, sessions: 1 },
  { category: "avulso", group: "Banho", name: "Banho completo · porte médio", detail: "Higienização, secagem e finalização", duration: "1h 20min", price: 90, sessions: 1 },
  { category: "avulso", group: "Banho", name: "Banho completo · porte grande", detail: "Higienização, secagem e finalização", duration: "1h 40min", price: 120, sessions: 1 },
  { category: "avulso", group: "Tosa", name: "Tosa higiênica", detail: "Acabamento cuidadoso das áreas higiênicas", duration: "40min", price: 55, sessions: 1 },
  { category: "avulso", group: "Adicionais", name: "Hidratação", detail: "Tratamento para pele e pelagem", duration: "30min", price: 35, sessions: 1 },
  { category: "avulso", group: "Adicionais", name: "Retirada de nós", detail: "Desembolo avaliado conforme a pelagem", duration: "40min", price: 45, sessions: 1 },
  { category: "avulso", group: "Cuidados", name: "Corte de unhas", detail: "Corte seguro e acabamento", duration: "15min", price: 20, sessions: 1 },
  { category: "avulso", group: "Transporte", name: "Táxi Dog", detail: "Busca e entrega em região atendida", duration: "1h", price: 30, sessions: 1 },
  { category: "fidelidade", group: "Pacotes", name: "Banhos semanais · pequeno", detail: "Quatro banhos com validade de 35 dias", duration: "1h", price: 240, sessions: 4 },
  { category: "fidelidade", group: "Pacotes", name: "Banhos quinzenais · pequeno", detail: "Quatro banhos com validade de 70 dias", duration: "1h", price: 260, sessions: 4 },
];
