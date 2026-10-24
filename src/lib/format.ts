import type { LineItem, Tenant } from "./types";

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// Uses plain spaces as thousands separators: the built-in PDF fonts cannot render
// the narrow no-break space that Intl emits for fr-FR.
export function formatAmount(n: number, currency = "FCFA"): string {
  const rounded = Math.round(n || 0);
  const s = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${rounded < 0 ? "-" : ""}${s} ${currency}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatPeriod(period: string): string {
  if (!period) return "";
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS[m - 1]} ${y}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentPeriod(): string {
  return todayISO().slice(0, 7);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function total(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
}

/** Fixed monthly amount (rent + flat charges); metered electricity comes on top. */
export function tenantMonthly(t: Tenant): number {
  return t.rent + t.chargeItems.reduce((s, c) => s + (Number(c.amount) || 0), 0);
}

export function formatNumber(n: number): string {
  return formatAmount(n, "").trim();
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  let u = n % 10;
  if (t === 7 || t === 9) u += 10;
  let word = TENS[t];
  if (u === 0) return t === 8 ? "quatre-vingts" : word;
  if ((u === 1 || u === 11) && t !== 8 && t !== 9) word += " et";
  return `${word}${word.endsWith(" et") ? " " : "-"}${UNITS[u]}`;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = "";
  if (h > 0) {
    s = h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 ? "s" : ""}`;
  }
  if (r > 0) s += (s ? " " : "") + below100(r);
  return s;
}

export function amountInWords(n: number): string {
  n = Math.floor(Math.abs(n || 0));
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (billions) parts.push(`${below1000(billions)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) parts.push(`${below1000(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands) {
    // "cents" and "quatre-vingts" lose their plural before "mille".
    parts.push(
      thousands === 1
        ? "mille"
        : `${below1000(thousands).replace(/cents$/, "cent").replace(/vingts$/, "vingt")} mille`,
    );
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

export function normalizePhone(phone: string, countryCode = "228"): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return "";
  if (digits.length <= 8) digits = countryCode.replace(/\D/g, "") + digits;
  return digits;
}

function num(n: number): string {
  return Number.isInteger(n) ? formatAmount(n, "").trim() : String(n).replace(".", ",");
}

/** Second-column detail shown on documents, e.g. "120 kWh x 300". */
export function lineDetail(item: LineItem): string[] {
  if (item.kind !== "electricite") return [];
  const lines = [`${num(item.quantity || 0)} kWh x ${num(item.unitPrice || 0)}`];
  if (item.indexStart != null && item.indexEnd != null) {
    lines.push(`Index ${num(item.indexStart)} à ${num(item.indexEnd)}`);
  }
  return lines;
}
