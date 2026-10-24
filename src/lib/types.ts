export type DocType = "facture" | "recu";

export type PaymentMethod =
  | "especes"
  | "tmoney"
  | "flooz"
  | "virement"
  | "cheque"
  | "autre";

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  especes: "Espèces",
  tmoney: "T-Money",
  flooz: "Flooz (Moov Money)",
  virement: "Virement bancaire",
  cheque: "Chèque",
  autre: "Autre",
};

export interface Settings {
  ownerName: string;
  phone: string;
  address: string;
  email: string;
  currency: string;
  defaultCountryCode: string;
  footerNote: string;
  /** PNG data URL, drawn or uploaded in the settings page. */
  signature: string;
  /** Price of one kWh, in the settings currency. */
  electricityPrice: number;
  chargeCatalog: ChargePreset[];
}

export interface ChargePreset {
  id: string;
  label: string;
  amount: number;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  property: string;
  rent: number;
  chargeItems: ChargePreset[];
  meteredElectricity: boolean;
  notes: string;
  createdAt: string;
}

export type LineKind = "loyer" | "electricite" | "charge";

export interface LineItem {
  id: string;
  kind: LineKind;
  label: string;
  amount: number;
  /** Electricity lines only: meter readings and consumed kWh. */
  indexStart?: number | null;
  indexEnd?: number | null;
  quantity?: number;
  unitPrice?: number;
}

export interface RentDocument {
  id: string;
  type: DocType;
  number: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  property: string;
  issueDate: string;
  period: string;
  dueDate: string;
  items: LineItem[];
  paymentMethod: PaymentMethod;
  paid: boolean;
  notes: string;
  invoiceId?: string;
  createdAt: string;
}

export interface AppData {
  settings: Settings;
  tenants: Tenant[];
  documents: RentDocument[];
}

export function paymentPhrase(method: PaymentMethod): string {
  const label = PAYMENT_METHODS[method];
  return method === "tmoney" || method === "flooz" ? label : label.toLowerCase();
}
