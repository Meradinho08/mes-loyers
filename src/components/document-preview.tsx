import type { RentDocument, Settings } from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";
import { amountInWords, formatAmount, formatDate, formatPeriod, total } from "@/lib/format";
import { docTitle } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export function DocumentPreview({
  doc,
  settings,
  className,
}: {
  doc: RentDocument;
  settings: Settings;
  className?: string;
}) {
  const cur = settings.currency || "FCFA";
  const sum = total(doc.items);
  const isInvoice = doc.type === "facture";
  const words = `${amountInWords(sum)} francs CFA`;

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white text-[13px] text-neutral-900 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 bg-emerald-700 px-5 py-4 text-white">
        <div>
          <p className="text-lg font-bold tracking-wide uppercase">{docTitle(doc)}</p>
          <p className="text-xs opacity-90">N° {doc.number}</p>
        </div>
        <div className="text-right text-xs opacity-90">
          <p>Date : {formatDate(doc.issueDate)}</p>
          {doc.period && <p>Période : {formatPeriod(doc.period)}</p>}
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-neutral-500">BAILLEUR</p>
          <p className="font-semibold">{settings.ownerName || <span className="text-neutral-400">Votre nom (Paramètres)</span>}</p>
          {settings.address && <p className="text-neutral-600">{settings.address}</p>}
          {settings.phone && <p className="text-neutral-600">Tél : {settings.phone}</p>}
          {settings.email && <p className="text-neutral-600">{settings.email}</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-wider text-neutral-500">LOCATAIRE</p>
          <p className="font-semibold">{doc.tenantName || <span className="text-neutral-400">Choisissez un locataire</span>}</p>
          {doc.property && <p className="text-neutral-600">Logement : {doc.property}</p>}
          {doc.tenantPhone && <p className="text-neutral-600">Tél : {doc.tenantPhone}</p>}
        </div>
      </div>

      <div className="px-5">
        <div className="flex justify-between rounded-t-md bg-neutral-100 px-3 py-2 text-xs font-semibold">
          <span>Désignation</span>
          <span>Montant ({cur})</span>
        </div>
        {doc.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 border-b px-3 py-2">
            <span>{item.label || "—"}</span>
            <span className="tabular-nums">{formatAmount(item.amount, "").trim()}</span>
          </div>
        ))}
        <div className="mt-3 ml-auto flex max-w-xs justify-between rounded-md bg-emerald-700 px-3 py-2 font-bold text-white">
          <span>{isInvoice ? "TOTAL À PAYER" : "TOTAL REÇU"}</span>
          <span className="tabular-nums">{formatAmount(sum, cur)}</span>
        </div>
      </div>

      <div className="space-y-2 px-5 py-4 text-neutral-700">
        {isInvoice ? (
          <p>
            Arrêtée la présente facture à la somme de <strong>{words}</strong> ({formatAmount(sum, cur)}).
            {doc.dueDate && <> Paiement attendu au plus tard le {formatDate(doc.dueDate)}.</>}
          </p>
        ) : (
          <p>
            Je soussigné(e) {settings.ownerName || "le bailleur"}, reconnais avoir reçu de{" "}
            {doc.tenantName || "…"} la somme de <strong>{words}</strong> ({formatAmount(sum, cur)})
            {doc.period && <> au titre du loyer de {formatPeriod(doc.period)}</>}
            {doc.property && <> pour le logement « {doc.property} »</>}, payée par{" "}
            {PAYMENT_METHODS[doc.paymentMethod].toLowerCase()}. Dont quittance.
          </p>
        )}
        {doc.notes && <p className="text-neutral-500">Note : {doc.notes}</p>}
      </div>

      <div className="flex items-end justify-between px-5 pb-6">
        {!isInvoice || doc.paid ? (
          <span className="rounded-md border-2 border-emerald-700 px-3 py-1 text-base font-bold text-emerald-700">
            {isInvoice ? "PAYÉE" : "PAYÉ"}
          </span>
        ) : (
          <span />
        )}
        <div className="text-right text-neutral-700">
          <p>Fait le {formatDate(doc.issueDate)}</p>
          <p>Signature du bailleur</p>
          <div className="mt-8 h-px w-40 bg-neutral-300" />
        </div>
      </div>
      {settings.footerNote && (
        <p className="border-t px-5 py-2 text-center text-[11px] text-neutral-500">{settings.footerNote}</p>
      )}
    </div>
  );
}
