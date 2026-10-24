"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, FileText, Plus, Receipt, Settings, Users, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocStatusBadge, PageHeader, PageLoading } from "@/components/common";
import { useAppData } from "@/lib/store";
import { currentPeriod, formatAmount, formatDate, formatPeriod, total } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const data = useAppData();
  if (!data) return <PageLoading />;

  const { settings, tenants, documents } = data;
  const cur = settings.currency;
  const period = currentPeriod();
  const receiptsThisMonth = documents.filter((d) => d.type === "recu" && d.period === period);
  const collected = receiptsThisMonth.reduce((s, d) => s + total(d.items), 0);
  const unpaid = documents.filter((d) => d.type === "facture" && !d.paid);
  const unpaidTotal = unpaid.reduce((s, d) => s + total(d.items), 0);
  const expected = tenants.reduce((s, t) => s + t.rent + t.charges, 0);
  const recent = documents.slice(0, 6);
  const needsSetup = !settings.ownerName || tenants.length === 0;

  return (
    <>
      <PageHeader
        title={settings.ownerName ? `Bonjour, ${settings.ownerName.split(" ")[0]}` : "Bonjour"}
        description={`Suivi des loyers de ${formatPeriod(period)}`}
        actions={
          <>
            <Link href="/documents/nouveau?type=facture" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <FileText /> Nouvelle facture
            </Link>
            <Link href="/documents/nouveau?type=recu" className={buttonVariants({ size: "lg" })}>
              <Receipt /> Nouveau reçu
            </Link>
          </>
        }
      />

      {needsSetup && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Bien démarrer en 2 étapes</CardTitle>
            <CardDescription>Ensuite, chaque facture ou reçu se crée en quelques secondes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SetupStep
              done={!!settings.ownerName}
              href="/parametres"
              icon={<Settings className="size-4" />}
              title="Renseignez vos coordonnées"
              text="Votre nom et téléphone apparaîtront sur les documents."
            />
            <SetupStep
              done={tenants.length > 0}
              href="/locataires"
              icon={<Users className="size-4" />}
              title="Ajoutez vos locataires"
              text="Avec leur numéro WhatsApp et leur loyer mensuel."
            />
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Wallet className="size-4" />}
          label={`Encaissé en ${formatPeriod(period)}`}
          value={formatAmount(collected, cur)}
          hint={expected ? `sur ${formatAmount(expected, cur)} attendus` : `${receiptsThisMonth.length} reçu(s)`}
        />
        <Stat
          icon={<AlertCircle className="size-4" />}
          label="Factures impayées"
          value={formatAmount(unpaidTotal, cur)}
          hint={`${unpaid.length} facture${unpaid.length > 1 ? "s" : ""} en attente`}
          tone={unpaid.length ? "warn" : undefined}
        />
        <Stat
          icon={<Users className="size-4" />}
          label="Locataires"
          value={String(tenants.length)}
          hint={`${documents.length} document${documents.length > 1 ? "s" : ""} créé${documents.length > 1 ? "s" : ""}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Loyers de {formatPeriod(period)}</CardTitle>
            <CardDescription>Qui a payé ce mois-ci ?</CardDescription>
          </CardHeader>
          <CardContent>
            {tenants.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ajoutez vos locataires pour suivre leurs paiements ici.
              </p>
            ) : (
              <ul className="divide-y">
                {tenants.map((t) => {
                  const receipt = documents.find((d) => d.type === "recu" && d.tenantId === t.id && d.period === period);
                  const invoice = documents.find((d) => d.type === "facture" && d.tenantId === t.id && d.period === period);
                  return (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatAmount(t.rent + t.charges, cur)}
                          {t.property ? ` · ${t.property}` : ""}
                        </p>
                      </div>
                      {receipt ? (
                        <Link
                          href={`/documents/${receipt.id}`}
                          className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"
                        >
                          <CheckCircle2 className="size-4" /> Payé · voir le reçu
                        </Link>
                      ) : (
                        <div className="flex gap-2">
                          {invoice ? (
                            <Link href={`/documents/${invoice.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              Facture envoyée
                            </Link>
                          ) : (
                            <Link
                              href={`/documents/nouveau?type=facture&locataire=${t.id}`}
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              <FileText /> Facturer
                            </Link>
                          )}
                          <Link
                            href={
                              invoice
                                ? `/documents/nouveau?type=recu&facture=${invoice.id}`
                                : `/documents/nouveau?type=recu&locataire=${t.id}`
                            }
                            className={buttonVariants({ size: "sm" })}
                          >
                            <Receipt /> A payé
                          </Link>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Derniers documents</CardTitle>
              <CardDescription>Factures et reçus récents</CardDescription>
            </div>
            {documents.length > 0 && (
              <Link href="/documents" className="flex items-center gap-1 text-sm text-primary">
                Tout voir <ArrowRight className="size-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Vous n&apos;avez encore créé aucun document.</p>
                <Link href="/documents/nouveau" className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
                  <Plus /> Créer une facture ou un reçu
                </Link>
              </div>
            ) : (
              <ul className="divide-y">
                {recent.map((d) => (
                  <li key={d.id}>
                    <Link href={`/documents/${d.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-muted/60">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.tenantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.number} · {formatDate(d.issueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-medium tabular-nums">{formatAmount(total(d.items), cur)}</span>
                        <DocStatusBadge doc={d} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "warn";
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn("text-primary", tone === "warn" && "text-amber-600")}>{icon}</span>
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-amber-700")}>{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SetupStep({
  done,
  href,
  icon,
  title,
  text,
}: {
  done: boolean;
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background p-3 transition hover:border-primary/50",
        done && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted",
          done && "bg-emerald-100 text-emerald-700",
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
