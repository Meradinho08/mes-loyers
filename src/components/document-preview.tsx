import type { RentDocument, Settings } from "@/lib/types";
import { paymentPhrase } from "@/lib/types";
import { amountInWords, formatAmount, formatDate, formatPeriod, lineDetail, total } from "@/lib/format";
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
        <div className="grid grid-cols-[1fr_auto] gap-3 rounded-t-md bg-neutral-100 px-3 py-2 text-xs font-semibold sm:grid-cols-[1fr_9rem_auto]">
          <span>Désignation</span>
          <span className="hidden sm:block">Détail</span>
          <span>Montant ({cur})</span>
        </div>
        {doc.items.map((item) => {
          const detail = lineDetail(item);
          return (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-b px-3 py-2 sm:grid-cols-[1fr_9rem_auto]">
              <span>
                {item.label || "—"}
                {detail.length > 0 && (
                  <span className="block text-xs text-neutral-500 sm:hidden">{detail.join(" · ")}</span>
                )}
              </span>
              <span className="hidden text-xs text-neutral-500 sm:block">
                {detail.map((d) => (
                  <span key={d} className="block">
                    {d}
                  </span>
                ))}
              </span>
              <span className="text-right tabular-nums">{formatAmount(item.amount, "").trim()}</span>
            </div>
          );
        })}
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
            {paymentPhrase(doc.paymentMethod)}. Dont quittance.
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
          <div className="flex h-16 w-40 items-end justify-end">
            {settings.signature && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.signature} alt="Signature" className="max-h-16 max-w-40 object-contain" />
            )}
          </div>
          <div className="h-px w-40 bg-neutral-300" />
        </div>
      </div>
      {settings.footerNote && (
        <p className="border-t px-5 py-2 text-center text-[11px] text-neutral-500">{settings.footerNote}</p>
      )}
    </div>
  );
}
