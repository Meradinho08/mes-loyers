import type { RentDocument, Settings } from "./types";
import { PAYMENT_METHODS } from "./types";
import { formatAmount, formatDate, formatPeriod, normalizePhone, total } from "./format";
import { buildPdf, docTitle, pdfFileName } from "./pdf";

export function whatsappMessage(doc: RentDocument, settings: Settings): string {
  const cur = settings.currency || "FCFA";
  const amount = formatAmount(total(doc.items), cur);
  const firstName = doc.tenantName.split(" ")[0] || doc.tenantName;
  const lines: string[] = [`Bonjour ${firstName},`, ""];
  if (doc.type === "facture") {
    lines.push(
      `Voici votre facture de loyer *${doc.number}*${doc.period ? ` pour ${formatPeriod(doc.period)}` : ""}.`,
      "",
      `Montant à payer : *${amount}*`,
    );
    if (doc.dueDate) lines.push(`À régler avant le : ${formatDate(doc.dueDate)}`);
  } else {
    lines.push(
      `Je vous confirme la bonne réception de votre paiement de *${amount}*${doc.period ? ` pour le loyer de ${formatPeriod(doc.period)}` : ""}.`,
      "",
      `Reçu n° *${doc.number}* du ${formatDate(doc.issueDate)}`,
      `Mode de paiement : ${PAYMENT_METHODS[doc.paymentMethod]}`,
    );
  }
  if (doc.property) lines.push(`Logement : ${doc.property}`);
  lines.push("", "Merci et bonne journée.");
  if (settings.ownerName) lines.push(settings.ownerName);
  return lines.join("\n");
}

export function whatsappUrl(doc: RentDocument, settings: Settings): string {
  const phone = normalizePhone(doc.tenantPhone, settings.defaultCountryCode);
  const text = encodeURIComponent(whatsappMessage(doc, settings));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
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
