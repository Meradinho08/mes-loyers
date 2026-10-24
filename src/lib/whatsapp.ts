import type { RentDocument, Settings } from "./types";
import { formatAmount, formatDate, formatPeriod, receiptFields, total } from "./format";
import type { SendPayload } from "./send";
import type { LineItem, Tenant } from "./types";
import type { TenantRecap } from "./recap";
import { buildPdf, buildRecapPdf, docTitle, pdfFileName, recapFileName } from "./pdf";

function receiptMessage(doc: RentDocument, settings: Settings): string {
  const f = receiptFields(doc);
  const lines = [
    `*REÇU DE PAIEMENT* n° ${doc.number}`,
    "",
    `Nom : ${f.lastName.toUpperCase() || "-"}`,
    `Prénoms : ${f.firstNames || "-"}`,
    `Montant payé : *${formatAmount(f.amount, settings.currency || "FCFA")}*`,
    `Pour : ${f.purpose}`,
  ];
  if (f.month) lines.push(`Mois : ${f.month}`);
  lines.push("", `Payé le ${formatDate(doc.issueDate)}. Merci !`);
  if (settings.ownerName) lines.push(settings.ownerName);
  return lines.join("\n");
}

export function whatsappMessage(doc: RentDocument, settings: Settings): string {
  if (doc.type === "recu") return receiptMessage(doc, settings);
  const cur = settings.currency || "FCFA";
  const amount = formatAmount(total(doc.items), cur);
  const firstName = doc.tenantName.split(" ")[0] || doc.tenantName;
  const lines: string[] = [`Bonjour ${firstName},`, ""];
  lines.push(
    `Voici votre facture de loyer *${doc.number}*${doc.period ? ` pour ${formatPeriod(doc.period)}` : ""}.`,
    "",
    `Montant à payer : *${amount}*`,
  );
  if (doc.dueDate) lines.push(`À régler avant le : ${formatDate(doc.dueDate)}`);
  if (doc.items.length > 1) {
    lines.push("", "Détail :");
    for (const item of doc.items) lines.push(`- ${itemSummary(item)} : ${formatAmount(item.amount, cur)}`);
  }
  if (doc.property) lines.push("", `Logement : ${doc.property}`);
  lines.push("", "Merci et bonne journée.");
  if (settings.ownerName) lines.push(settings.ownerName);
  return lines.join("\n");
}

function itemSummary(item: LineItem): string {
  if (item.kind === "electricite") return `${item.label} (${item.quantity || 0} kWh)`;
  return item.label;
}

export function docPayload(doc: RentDocument, settings: Settings): SendPayload {
  return {
    message: whatsappMessage(doc, settings),
    subject: `${docTitle(doc)} ${doc.number}${doc.period ? ` - ${formatPeriod(doc.period)}` : ""}`,
    phone: doc.tenantPhone,
    email: doc.tenantEmail,
    countryCode: settings.defaultCountryCode,
  };
}

export async function pdfFile(doc: RentDocument, settings: Settings): Promise<File> {
  const blob = await buildPdf(doc, settings);
  return new File([blob], pdfFileName(doc), { type: "application/pdf" });
}

export function canSharePdf(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File(["x"], "test.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Opens the native share sheet (phone) so the PDF can be sent straight to WhatsApp. */
export async function sharePdf(doc: RentDocument, settings: Settings): Promise<"shared" | "cancelled"> {
  const file = await pdfFile(doc, settings);
  try {
    await navigator.share({
      files: [file],
      title: `${docTitle(doc)} ${doc.number}`,
      text: whatsappMessage(doc, settings),
    });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    throw e;
  }
}

export async function downloadPdf(doc: RentDocument, settings: Settings) {
  const file = await pdfFile(doc, settings);
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function recapMessage(tenant: Tenant, recap: TenantRecap, settings: Settings): string {
  const cur = settings.currency || "FCFA";
  const firstName = tenant.name.split(" ")[0] || tenant.name;
  const lines = [
    `Bonjour ${firstName},`,
    "",
    `Voici le récapitulatif de vos loyers pour l'année ${recap.year} :`,
    `- Total facturé : ${formatAmount(recap.invoiced, cur)}`,
    `- Total payé : ${formatAmount(recap.paid, cur)}`,
    `- Reste à payer : *${formatAmount(recap.unpaid, cur)}*`,
  ];
  if (recap.kwh) lines.push(`- Électricité consommée : ${recap.kwh} kWh`);
  const unpaidMonths = recap.months.filter((m) => m.state === "impaye" || m.state === "partiel");
  if (unpaidMonths.length) {
    lines.push("", `Mois non soldés : ${unpaidMonths.map((m) => formatPeriod(m.period)).join(", ")}`);
  }
  lines.push("", "Merci.");
  if (settings.ownerName) lines.push(settings.ownerName);
  return lines.join("\n");
}

export function recapPayload(tenant: Tenant, recap: TenantRecap, settings: Settings): SendPayload {
  return {
    message: recapMessage(tenant, recap, settings),
    subject: `Récapitulatif des loyers ${recap.year} - ${tenant.name}`,
    phone: tenant.phone,
    email: tenant.email,
    countryCode: settings.defaultCountryCode,
  };
}

export async function recapFile(tenant: Tenant, recap: TenantRecap, settings: Settings): Promise<File> {
  const blob = await buildRecapPdf(tenant, recap, settings);
  return new File([blob], recapFileName(tenant, recap.year), { type: "application/pdf" });
}

export async function shareFile(file: File, title: string, text: string): Promise<"shared" | "cancelled"> {
  try {
    await navigator.share({ files: [file], title, text });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    throw e;
  }
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
