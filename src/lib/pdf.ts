import type { RentDocument, Settings } from "./types";
import { paymentPhrase } from "./types";
import { amountInWords, formatAmount, formatDate, formatPeriod, total } from "./format";

const BRAND: [number, number, number] = [4, 120, 87];
const MUTED: [number, number, number] = [110, 110, 110];
const DARK: [number, number, number] = [25, 25, 25];

export function docTitle(doc: RentDocument) {
  return doc.type === "facture" ? "Facture de loyer" : "Reçu de paiement";
}

export function pdfFileName(doc: RentDocument) {
  const who = doc.tenantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${doc.number}${who ? `-${who}` : ""}.pdf`;
}

export async function buildPdf(doc: RentDocument, settings: Settings): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const cur = settings.currency || "FCFA";
  const sum = total(doc.items);
  const isInvoice = doc.type === "facture";

  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, W, 34, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(docTitle(doc).toUpperCase(), M, 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`N° ${doc.number}`, M, 25);
  pdf.text(`Date : ${formatDate(doc.issueDate)}`, W - M, 17, { align: "right" });
  if (doc.period) {
    pdf.text(`Période : ${formatPeriod(doc.period)}`, W - M, 25, { align: "right" });
  }

  let y = 48;
  const col2 = W / 2 + 4;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "bold");
  pdf.text("BAILLEUR", M, y);
  pdf.text("LOCATAIRE", col2, y);
  y += 6;
  pdf.setTextColor(...DARK);
  pdf.setFontSize(11);
  pdf.text(settings.ownerName || "-", M, y);
  pdf.text(doc.tenantName || "-", col2, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  const left = [settings.address, settings.phone && `Tél : ${settings.phone}`, settings.email].filter(
    Boolean,
  ) as string[];
  const right = [doc.property && `Logement : ${doc.property}`, doc.tenantPhone && `Tél : ${doc.tenantPhone}`].filter(
    Boolean,
  ) as string[];
  const leftLines = left.flatMap((l) => pdf.splitTextToSize(l, W / 2 - M - 6) as string[]);
  const rightLines = right.flatMap((l) => pdf.splitTextToSize(l, W - M - col2) as string[]);
  leftLines.forEach((l, i) => pdf.text(l, M, y + 5.5 + i * 5));
  rightLines.forEach((l, i) => pdf.text(l, col2, y + 5.5 + i * 5));
  y += 8 + Math.max(leftLines.length, rightLines.length) * 5 + 6;

  pdf.setFillColor(243, 244, 246);
  pdf.rect(M, y, W - 2 * M, 9, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text("Désignation", M + 3, y + 6);
  pdf.text(`Montant (${cur})`, W - M - 3, y + 6, { align: "right" });
  y += 9;
  pdf.setFont("helvetica", "normal");
  doc.items.forEach((item) => {
    const lines = pdf.splitTextToSize(item.label || "-", W - 2 * M - 50) as string[];
    const h = Math.max(9, lines.length * 5 + 4);
    lines.forEach((l, i) => pdf.text(l, M + 3, y + 6 + i * 5));
    pdf.text(formatAmount(item.amount, "").trim(), W - M - 3, y + 6, { align: "right" });
    pdf.setDrawColor(229, 231, 235);
    pdf.line(M, y + h, W - M, y + h);
    y += h;
  });

  y += 4;
  pdf.setFillColor(...BRAND);
  pdf.rect(W / 2, y, W / 2 - M, 11, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(isInvoice ? "TOTAL À PAYER" : "TOTAL REÇU", W / 2 + 4, y + 7.3);
  pdf.text(formatAmount(sum, cur), W - M - 3, y + 7.3, { align: "right" });
  y += 20;

  pdf.setTextColor(...DARK);
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", "normal");
  const words = `${amountInWords(sum)} francs CFA`;
  let paragraph: string;
  if (isInvoice) {
    paragraph = `Arrêtée la présente facture à la somme de ${words} (${formatAmount(sum, cur)}).`;
    if (doc.dueDate) paragraph += ` Paiement attendu au plus tard le ${formatDate(doc.dueDate)}.`;
  } else {
    paragraph =
      `Je soussigné(e) ${settings.ownerName || "le bailleur"}, reconnais avoir reçu de ${doc.tenantName} ` +
      `la somme de ${words} (${formatAmount(sum, cur)})` +
      `${doc.period ? ` au titre du loyer de ${formatPeriod(doc.period)}` : ""}` +
      `${doc.property ? ` pour le logement « ${doc.property} »` : ""}, ` +
      `payée par ${paymentPhrase(doc.paymentMethod)}. Dont quittance.`;
  }
  const pLines = pdf.splitTextToSize(paragraph, W - 2 * M) as string[];
  pdf.text(pLines, M, y);
  y += pLines.length * 5 + 4;

  if (doc.notes) {
    pdf.setTextColor(...MUTED);
    const nLines = pdf.splitTextToSize(`Note : ${doc.notes}`, W - 2 * M) as string[];
    pdf.text(nLines, M, y);
    y += nLines.length * 5 + 4;
  }

  if (!isInvoice || doc.paid) {
    pdf.setDrawColor(...BRAND);
    pdf.setTextColor(...BRAND);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(M, y + 4, 38, 13, 2, 2, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(isInvoice ? "PAYÉE" : "PAYÉ", M + 19, y + 12.6, { align: "center" });
    pdf.setLineWidth(0.2);
  }

  pdf.setTextColor(...DARK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.text(`Fait le ${formatDate(doc.issueDate)}`, W - M, y + 6, { align: "right" });
  pdf.text("Signature du bailleur", W - M, y + 12, { align: "right" });
  pdf.setDrawColor(180, 180, 180);
  pdf.line(W - M - 55, y + 32, W - M, y + 32);

  if (settings.footerNote) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(...MUTED);
    pdf.text(settings.footerNote, W / 2, 284, { align: "center" });
  }

  return pdf.output("blob");
}
