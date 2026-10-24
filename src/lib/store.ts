"use client";

import { useSyncExternalStore } from "react";
import type { AppData, ChargePreset, DocType, LineItem, LineKind, RentDocument, Settings, Tenant } from "./types";
import { uid } from "./format";

const STORAGE_KEY = "mes-loyers:v1";

export const DEFAULT_SETTINGS: Settings = {
  ownerName: "",
  phone: "",
  address: "",
  email: "",
  currency: "FCFA",
  defaultCountryCode: "228",
  footerNote: "Merci pour votre confiance.",
  signature: "",
  electricityPrice: 0,
  chargeCatalog: [
    { id: "eau", label: "Eau", amount: 3000 },
    { id: "gardiennage", label: "Gardiennage", amount: 2000 },
    { id: "ordures", label: "Ordures ménagères", amount: 1000 },
  ],
};

type LegacyTenant = Partial<Tenant> & { charges?: number };
type LegacyItem = Partial<LineItem> & { id: string; label: string; amount: number };

function migrateTenant(t: LegacyTenant): Tenant {
  const chargeItems: ChargePreset[] =
    t.chargeItems ?? (t.charges ? [{ id: uid(), label: "Charges", amount: t.charges }] : []);
  return {
    id: t.id ?? uid(),
    name: t.name ?? "",
    phone: t.phone ?? "",
    property: t.property ?? "",
    rent: t.rent ?? 0,
    chargeItems,
    meteredElectricity: t.meteredElectricity ?? false,
    notes: t.notes ?? "",
    createdAt: t.createdAt ?? new Date().toISOString(),
  };
}

function migrateItem(i: LegacyItem, index: number): LineItem {
  const kind: LineKind = i.kind ?? (index === 0 && /^loyer/i.test(i.label) ? "loyer" : "charge");
  return { ...i, kind };
}

function migrate(parsed: Partial<AppData>): AppData {
  return {
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    tenants: (parsed.tenants ?? []).map((t) => migrateTenant(t as LegacyTenant)),
    documents: (parsed.documents ?? []).map((d) => ({
      ...d,
      items: (d.items ?? []).map((i, idx) => migrateItem(i as LegacyItem, idx)),
    })),
  };
}

const EMPTY: AppData = { settings: DEFAULT_SETTINGS, tenants: [], documents: [] };

let cache: AppData | null = null;
const listeners = new Set<() => void>();

function read(): AppData {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = migrate(JSON.parse(raw) as Partial<AppData>);
      return cache;
    }
  } catch {
    // Corrupted storage: start fresh rather than crash the app.
  }
  cache = EMPTY;
  return cache;
}

function write(next: AppData) {
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => null;

/** Returns null during server render / before hydration. */
export function useAppData(): AppData | null {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function saveSettings(settings: Settings) {
  write({ ...read(), settings });
}

export function upsertTenant(tenant: Omit<Tenant, "id" | "createdAt"> & { id?: string }): Tenant {
  const data = read();
  const existing = tenant.id ? data.tenants.find((t) => t.id === tenant.id) : undefined;
  const saved: Tenant = existing
    ? { ...existing, ...tenant, id: existing.id }
    : { ...tenant, id: uid(), createdAt: new Date().toISOString() };
  write({
    ...data,
    tenants: existing
      ? data.tenants.map((t) => (t.id === saved.id ? saved : t))
      : [...data.tenants, saved],
  });
  return saved;
}

export function deleteTenant(id: string) {
  const data = read();
  write({ ...data, tenants: data.tenants.filter((t) => t.id !== id) });
}

export function nextNumber(type: DocType, year = new Date().getFullYear()): string {
  const prefix = type === "facture" ? "FAC" : "REC";
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = read().documents.reduce((m, d) => {
    const match = d.number.match(re);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function upsertDocument(
  doc: Omit<RentDocument, "id" | "createdAt"> & { id?: string },
): RentDocument {
  const data = read();
  const existing = doc.id ? data.documents.find((d) => d.id === doc.id) : undefined;
  const saved: RentDocument = existing
    ? { ...existing, ...doc, id: existing.id }
    : { ...doc, id: uid(), createdAt: new Date().toISOString() };
  let documents = existing
    ? data.documents.map((d) => (d.id === saved.id ? saved : d))
    : [saved, ...data.documents];
  if (saved.type === "recu" && saved.invoiceId) {
    documents = documents.map((d) => (d.id === saved.invoiceId ? { ...d, paid: true } : d));
  }
  write({ ...data, documents });
  return saved;
}

export function setInvoicePaid(id: string, paid: boolean) {
  const data = read();
  write({
    ...data,
    documents: data.documents.map((d) => (d.id === id ? { ...d, paid } : d)),
  });
}

export function deleteDocument(id: string) {
  const data = read();
  write({ ...data, documents: data.documents.filter((d) => d.id !== id) });
}

export function exportData(): string {
  return JSON.stringify(read(), null, 2);
}

export function importData(json: string) {
  const parsed = JSON.parse(json) as Partial<AppData>;
  if (!Array.isArray(parsed.tenants) || !Array.isArray(parsed.documents)) {
    throw new Error("Fichier de sauvegarde invalide");
  }
  write(migrate(parsed));
}

/** Last electricity meter reading recorded on an invoice for this tenant, to prefill the next one. */
export function lastMeterIndex(tenantId: string, excludeId?: string): number | null {
  const docs = read()
    .documents.filter((d) => d.tenantId === tenantId && d.type === "facture" && d.id !== excludeId)
    .sort((a, b) => (b.period + b.issueDate).localeCompare(a.period + a.issueDate));
  for (const d of docs) {
    const line = d.items.find((i) => i.kind === "electricite" && i.indexEnd != null);
    if (line?.indexEnd != null) return line.indexEnd;
  }
  return null;
}
