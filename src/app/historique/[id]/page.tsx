"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Download, FileText, Loader2, Phone, Receipt, UserX, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocStatusBadge, EmptyState, PageLoading } from "@/components/common";
import { MonthGrid, MonthLegend } from "@/components/month-grid";
import { WhatsAppIcon } from "@/components/whatsapp-dialog";
import { useAppData } from "@/lib/store";
import { availableYears, tenantRecap } from "@/lib/recap";
import { formatAmount, formatDate, formatPeriod, total } from "@/lib/format";
import { canSharePdf, downloadFile, recapFile, recapMessage, recapWhatsappUrl, shareFile } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { AppData, Tenant } from "@/lib/types";

const noop = () => () => {};

export default function TenantHistoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TenantHistoryView />
    </Suspense>
  );
}

function TenantHistoryView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const data = useAppData();
  if (!data) return <PageLoading />;
  const tenant = data.tenants.find((t) => t.id === id);
  if (!tenant) {
    return (
      <EmptyState
        icon={<UserX className="size-6" />}
        title="Locataire introuvable"
        description="Il a peut-être été supprimé."
        action={
          <Link href="/historique" className={buttonVariants()}>
            Retour à l&apos;historique
          </Link>
        }
      />
    );
  }
  const year = Number(params.get("annee")) || new Date().getFullYear();
  return <TenantHistory data={data} tenant={tenant} year={year} />;
}

function TenantHistory({ data, tenant, year }: { data: AppData; tenant: Tenant; year: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const shareSupported = useSyncExternalStore(noop, canSharePdf, () => false);
  const { settings } = data;
  const cur = settings.currency;
  const recap = tenantRecap(data, tenant.id, year);
  const years = availableYears(data);
  const elecLines = recap.docs
    .filter((d) => d.type === "facture")
    .flatMap((d) => d.items.filter((i) => i.kind === "electricite").map((i) => ({ doc: d, item: i })))
    .sort((a, b) => a.doc.period.localeCompare(b.doc.period));

  async function send() {
    setBusy("share");
    try {
      if (shareSupported) {
        const file = await recapFile(tenant, recap, settings);
        await shareFile(file, `Récapitulatif ${year}`, recapMessage(tenant, recap, settings));
      } else {
        window.open(recapWhatsappUrl(tenant, recap, settings), "_blank", "noopener");
        downloadFile(await recapFile(tenant, recap, settings));
        toast.success("PDF téléchargé — joignez-le dans la discussion WhatsApp");
      }
    } catch {
      toast.error("L'envoi a échoué");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("download");
    try {
      downloadFile(await recapFile(tenant, recap, settings));
    } catch {
      toast.error("Impossible de générer le PDF");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Link href="/historique" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Historique
      </Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {tenant.property && <span>{tenant.property}</span>}
            {tenant.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {tenant.phone}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={String(year)}
            onValueChange={(v) => v && router.replace(`/historique/${tenant.id}?annee=${v}`)}
            items={years.map((y) => ({ value: String(y), label: `Année ${y}` }))}
          >
            <SelectTrigger className="h-10 w-36 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Année {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="lg" variant="outline" className="h-10" onClick={download} disabled={busy !== null}>
            {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />} Récap PDF
          </Button>
          <Button
            size="lg"
            className="h-10 bg-[#25D366] text-white hover:bg-[#1ebe5b]"
            onClick={send}
            disabled={busy !== null}
          >
            {busy === "share" ? <Loader2 className="animate-spin" /> : <WhatsAppIcon className="size-4" />} Envoyer le récap
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total facturé" value={formatAmount(recap.invoiced, cur)} />
        <Stat label="Total payé" value={formatAmount(recap.paid, cur)} tone="good" />
        <Stat label="Reste à payer" value={formatAmount(recap.unpaid, cur)} tone={recap.unpaid ? "warn" : undefined} />
        <Stat
          label="Électricité"
          value={`${recap.kwh} kWh`}
          hint={recap.electricityAmount ? formatAmount(recap.electricityAmount, cur) : undefined}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mois par mois — {year}</CardTitle>
          <CardDescription>
            {recap.lastPayment
              ? `Dernier paiement : ${formatAmount(total(recap.lastPayment.items), cur)} le ${formatDate(recap.lastPayment.issueDate)}`
              : "Aucun paiement enregistré pour l'instant."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MonthGrid months={recap.months} currency={cur} size="lg" />
          <MonthLegend />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Documents {year}</CardTitle>
              <CardDescription>
                {recap.docs.length} document{recap.docs.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/documents/nouveau?type=facture&locataire=${tenant.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <FileText /> Facture
              </Link>
              <Link href={`/documents/nouveau?type=recu&locataire=${tenant.id}`} className={buttonVariants({ size: "sm" })}>
                <Receipt /> Reçu
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recap.docs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun document pour {year}.</p>
            ) : (
              <ul className="divide-y">
                {recap.docs.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/documents/${d.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{d.number}</span>
                          <DocStatusBadge doc={d} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(d.issueDate)}
                          {d.period ? ` · ${formatPeriod(d.period)}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatAmount(total(d.items), cur)}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" /> Consommation électrique
            </CardTitle>
            <CardDescription>Relevés enregistrés sur les factures</CardDescription>
          </CardHeader>
          <CardContent>
            {elecLines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun relevé pour {year}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Mois</th>
                      <th className="py-2 font-medium">Index</th>
                      <th className="py-2 text-right font-medium">kWh</th>
                      <th className="py-2 text-right font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elecLines.map(({ doc, item }) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 capitalize">{formatPeriod(doc.period)}</td>
                        <td className="py-2 text-muted-foreground tabular-nums">
                          {item.indexStart != null && item.indexEnd != null ? `${item.indexStart} → ${item.indexEnd}` : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">{item.quantity || 0}</td>
                        <td className="py-2 text-right tabular-nums">{formatAmount(item.amount, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-lg font-semibold tabular-nums sm:text-xl",
            tone === "good" && "text-emerald-700",
            tone === "warn" && "text-amber-700",
          )}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
