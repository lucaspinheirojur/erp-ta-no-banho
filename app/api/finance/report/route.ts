import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointments, expenses } from "../../../../db/schema";
import { getManager } from "../../../../lib/auth";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function xml(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pdfText(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "-").replace(/([\\()])/g, "\\$1");
}

function pdfDocument(lines: string[]) {
  const content = ["BT", "/F1 11 Tf", "50 790 Td", ...lines.flatMap((line, index) => [index ? "0 -18 Td" : "", `(${pdfText(line)}) Tj`]).filter(Boolean), "ET"].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n",
    `5 0 obj << /Length ${Buffer.byteLength(content, "latin1")} >> stream\n${content}\nendstream endobj\n`,
  ];
  let body = "%PDF-1.4\n", offset = Buffer.byteLength(body, "latin1");
  const offsets = [0];
  for (const object of objects) { offsets.push(offset); body += object; offset += Buffer.byteLength(object, "latin1"); }
  const xref = offset;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(value => `${String(value).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, "latin1");
}

export async function GET(request: Request) {
  const manager = await getManager();
  if (!manager) return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  const url = new URL(request.url), format = url.searchParams.get("format") === "xls" ? "xls" : "pdf";
  const mode = url.searchParams.get("mode") === "custom" ? "custom" : "month";
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("month") ?? "") ? url.searchParams.get("month")! : new Date().toISOString().slice(0, 7);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("from") ?? "") ? url.searchParams.get("from")! : `${month}-01`;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("to") ?? "") ? url.searchParams.get("to")! : `${month}-31`;
  const inPeriod = (date: string) => mode === "month" ? date.startsWith(month) : date >= from && date <= to;
  const [allIncome, allExpenses] = await Promise.all([
    getDb().select().from(appointments).where(eq(appointments.organizationId, manager.organizationId)).orderBy(desc(appointments.appointmentDate)).limit(1000),
    getDb().select().from(expenses).where(eq(expenses.organizationId, manager.organizationId)).orderBy(desc(expenses.expenseDate)).limit(1000),
  ]);
  const income = allIncome.filter(item => inPeriod(item.appointmentDate) && !["awaiting_payment", "payment_failed", "blocked"].includes(item.status));
  const costs = allExpenses.filter(item => inPeriod(item.expenseDate));
  const received = income.reduce((sum, item) => sum + item.paidCents, 0);
  const pending = income.filter(item => !["cancelled", "courtesy"].includes(item.status)).reduce((sum, item) => sum + item.balanceCents, 0);
  const spent = costs.reduce((sum, item) => sum + item.amountCents, 0);
  const net = received - spent;
  const label = mode === "month" ? month.split("-").reverse().join("/") : `${from.split("-").reverse().join("/")} a ${to.split("-").reverse().join("/")}`;
  const methods = ["Pix", "Cartão", "Dinheiro"].map(name => ({ name, cents: income.filter(item => item.paymentMethod.toLowerCase().includes(name.toLowerCase())).reduce((sum, item) => sum + item.paidCents, 0) }));
  const transactions = [
    ...income.filter(item => item.paidCents > 0).map(item => ({ date: item.appointmentDate, type: "Entrada", description: `${item.clientName} - ${item.service}`, method: item.paymentMethod, cents: item.paidCents })),
    ...costs.map(item => ({ date: item.expenseDate, type: "Saída", description: item.description, method: item.paymentMethod, cents: -item.amountCents })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const filename = `relatorio-financeiro-${mode === "month" ? month : `${from}-a-${to}`}`;

  if (format === "xls") {
    const rows = transactions.map(item => `<Row><Cell><Data ss:Type="String">${xml(item.date.split("-").reverse().join("/"))}</Data></Cell><Cell><Data ss:Type="String">${xml(item.type)}</Data></Cell><Cell><Data ss:Type="String">${xml(item.description)}</Data></Cell><Cell><Data ss:Type="String">${xml(item.method)}</Data></Cell><Cell><Data ss:Type="Number">${item.cents / 100}</Data></Cell></Row>`).join("");
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Resumo"><Table><Row><Cell><Data ss:Type="String">Relatório financeiro</Data></Cell><Cell><Data ss:Type="String">${xml(label)}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Recebido</Data></Cell><Cell><Data ss:Type="Number">${received / 100}</Data></Cell></Row><Row><Cell><Data ss:Type="String">A receber</Data></Cell><Cell><Data ss:Type="Number">${pending / 100}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Despesas</Data></Cell><Cell><Data ss:Type="Number">${spent / 100}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Saldo</Data></Cell><Cell><Data ss:Type="Number">${net / 100}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Atendimentos</Data></Cell><Cell><Data ss:Type="Number">${income.length}</Data></Cell></Row></Table></Worksheet><Worksheet ss:Name="Movimentações"><Table><Row><Cell><Data ss:Type="String">Data</Data></Cell><Cell><Data ss:Type="String">Tipo</Data></Cell><Cell><Data ss:Type="String">Descrição</Data></Cell><Cell><Data ss:Type="String">Forma</Data></Cell><Cell><Data ss:Type="String">Valor</Data></Cell></Row>${rows}</Table></Worksheet></Workbook>`;
    return new Response(`\ufeff${workbook}`, { headers: { "content-type": "application/vnd.ms-excel; charset=utf-8", "content-disposition": `attachment; filename="${filename}.xls"` } });
  }

  const lines = ["TA NO BANHO", "RELATORIO FINANCEIRO MENSAL", `Periodo: ${label}`, "", `Recebido: ${money(received)}`, `A receber: ${money(pending)}`, `Despesas: ${money(spent)}`, `Saldo do periodo: ${money(net)}`, `Atendimentos registrados: ${income.length}`, `Ticket medio: ${money(income.length ? Math.round(income.reduce((sum, item) => sum + item.priceCents, 0) / income.length) : 0)}`, "", "RECEBIMENTOS POR FORMA", ...methods.map(item => `${item.name}: ${money(item.cents)}`), "", "MOVIMENTACOES", ...transactions.slice(0, 25).map(item => `${item.date.split("-").reverse().join("/")} | ${item.type} | ${item.description.slice(0, 46)} | ${money(item.cents)}`), ...(transactions.length > 25 ? [`... e mais ${transactions.length - 25} movimentacoes no arquivo Excel.`] : [])];
  return new Response(pdfDocument(lines), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}.pdf"` } });
}
