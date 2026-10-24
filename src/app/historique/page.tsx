"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, History, Users, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, PageLoading } from "@/components/common";
import { MonthGrid, MonthLegend } from "@/components/month-grid";
import { useAppData } from "@/lib/store";
import { availableYears, tenantRecap } from "@/lib/recap";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const data = useAppData();
  const [selectedYear, setYear] = useState<number | null>(null);
  if (!data) return <PageLoading />;

  const year = selectedYear ?? new Date().getFullYear();
  const cur = data.settings.currency;
  const years = availableYears(data);
  const rows = [...data.tenants]
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((t) => ({ tenant: t, recap: tenantRecap(data, t.id, year) }));
  const totals = rows.reduce(
    (acc, { recap }) => ({
      invoiced: acc.invoiced + recap.invoiced,
      paid: acc.paid + recap.paid,
      unpaid: acc.unpaid + recap.unpaid,
      kwh: acc.kwh + recap.kwh,
    }),
    { invoiced: 0, paid: 0, unpaid: 0, kwh: 0 },
  );

  return (
    <>
      <PageHeader
        title="Historique"
        description="Le récapitulatif de chaque locataire, mois par mois."
        actions={
          <Select
            value={String(year)}
            onValueChange={(v) => v && setYear(Number(v))}
            items={years.map((y) => ({ value: String(y), label: `Année ${y}` }))}
          >
            <SelectTrigger className="h-10 w-40 bg-background">
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
        }
      />

      {data.tenants.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Aucun locataire"
          description="Ajoutez vos locataires et créez leurs factures et reçus : leur historique apparaîtra ici."
          action={
            <Link href="/locataires" className={buttonVariants({ size: "lg" })}>
              Ajouter un locataire
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Total label={`Facturé en ${year}`} value={formatAmount(totals.invoiced, cur)} />
            <Total label="Encaissé" value={formatAmount(totals.paid, cur)} tone="good" />
            <Total label="Reste à payer" value={formatAmount(totals.unpaid, cur)} tone={totals.unpaid ? "warn" : undefined} />
            <Total label="Électricité facturée" value={`${totals.kwh} kWh`} />
          </div>

          <div className="mb-3">
            <MonthLegend />
          </div>

          <div className="grid gap-3">
            {rows.map(({ tenant, recap }) => (
              <Link key={tenant.id} href={`/historique/${tenant.id}?annee=${year}`} className="group block">
                <Card className="gap-0 py-0 transition group-hover:ring-primary/40">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.property || "Logement non précisé"}</p>
                      </div>
                      <div className="flex items-center gap-4 text-right text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Payé</p>
                          <p className="font-medium tabular-nums">{formatAmount(recap.paid, cur)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reste</p>
                          <p className={cn("font-medium tabular-nums", recap.unpaid > 0 && "text-amber-700")}>
                            {formatAmount(recap.unpaid, cur)}
                          </p>
                        </div>
                        {recap.kwh > 0 && (
                          <div className="hidden sm:block">
                            <p className="text-xs text-muted-foreground">Électricité</p>
                            <p className="flex items-center justify-end gap-1 font-medium tabular-nums">
                              <Zap className="size-3 text-amber-500" />
                              {recap.kwh} kWh
                            </p>
                          </div>
                        )}
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                    <MonthGrid months={recap.months} currency={cur} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {data.documents.length === 0 && (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <History className="size-4" /> Aucun document pour l&apos;instant : créez une facture ou un reçu pour remplir
              l&apos;historique.
            </p>
          )}
        </>
      )}
    </>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
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
      </CardContent>
    </Card>
  );
}
