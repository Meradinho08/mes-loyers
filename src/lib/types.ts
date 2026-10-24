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
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  property: string;
  rent: number;
  charges: number;
  notes: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  label: string;
  amount: number;
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
