import type { AppData, RentDocument } from "./types";
import { total } from "./format";

export type MonthState = "paye" | "partiel" | "impaye" | "aucun";

export interface MonthRecap {
  period: string;
  invoiced: number;
  paid: number;
  kwh: number;
  state: MonthState;
  docs: RentDocument[];
}

export interface TenantRecap {
  year: number;
  months: MonthRecap[];
  docs: RentDocument[];
  invoiced: number;
  paid: number;
  unpaid: number;
  kwh: number;
  electricityAmount: number;
  lastPayment?: RentDocument;
}

function docYear(d: RentDocument): number {
  return Number((d.period || d.issueDate).slice(0, 4));
}

function docPeriod(d: RentDocument): string {
  return d.period || d.issueDate.slice(0, 7);
}

/** Invoices marked paid without a receipt still count as collected. */
function paidAmount(docs: RentDocument[], all: RentDocument[]): number {
  const receipts = docs.filter((d) => d.type === "recu").reduce((s, d) => s + total(d.items), 0);
  const paidWithoutReceipt = docs
    .filter((d) => d.type === "facture" && d.paid && !all.some((r) => r.invoiceId === d.id))
    .reduce((s, d) => s + total(d.items), 0);
  return receipts + paidWithoutReceipt;
}

function electricity(docs: RentDocument[]) {
  let kwh = 0;
  let amount = 0;
  for (const d of docs) {
    if (d.type !== "facture") continue;
    for (const i of d.items) {
      if (i.kind === "electricite") {
        kwh += i.quantity || 0;
        amount += i.amount;
      }
    }
  }
  return { kwh: Math.round(kwh * 100) / 100, amount };
}

export function tenantDocs(data: AppData, tenantId: string): RentDocument[] {
  return data.documents
    .filter((d) => d.tenantId === tenantId)
    .sort((a, b) => (b.issueDate + b.createdAt).localeCompare(a.issueDate + a.createdAt));
}

export function availableYears(data: AppData): number[] {
  const years = new Set<number>([new Date().getFullYear()]);
  data.documents.forEach((d) => years.add(docYear(d)));
  return [...years].filter(Boolean).sort((a, b) => b - a);
}

export function tenantRecap(data: AppData, tenantId: string, year: number): TenantRecap {
  const all = tenantDocs(data, tenantId);
  const docs = all.filter((d) => docYear(d) === year);
  const months: MonthRecap[] = Array.from({ length: 12 }, (_, m) => {
    const period = `${year}-${String(m + 1).padStart(2, "0")}`;
    const monthDocs = docs.filter((d) => docPeriod(d) === period);
    const invoices = monthDocs.filter((d) => d.type === "facture");
    const invoiced = invoices.reduce((s, d) => s + total(d.items), 0);
    const paid = paidAmount(monthDocs, all);
    let state: MonthState = "aucun";
    if (invoiced > 0) {
      if (paid >= invoiced || invoices.every((d) => d.paid)) state = "paye";
      else if (paid > 0) state = "partiel";
      else state = "impaye";
    } else if (paid > 0) {
      state = "paye";
    }
    return { period, invoiced, paid, kwh: electricity(monthDocs).kwh, state, docs: monthDocs };
  });
  const elec = electricity(docs);
  return {
    year,
    months,
    docs,
    invoiced: docs.filter((d) => d.type === "facture").reduce((s, d) => s + total(d.items), 0),
    paid: paidAmount(docs, all),
    unpaid: docs.filter((d) => d.type === "facture" && !d.paid).reduce((s, d) => s + total(d.items), 0),
    kwh: elec.kwh,
    electricityAmount: elec.amount,
    lastPayment: all.find((d) => d.type === "recu"),
  };
}

export const MONTH_STATE_LABEL: Record<MonthState, string> = {
  paye: "Payé",
  partiel: "Partiel",
  impaye: "Impayé",
  aucun: "—",
};
