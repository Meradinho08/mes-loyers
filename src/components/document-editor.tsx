"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, Home, Receipt, Save, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChargeList } from "@/components/charge-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentPreview } from "@/components/document-preview";
import { TenantDialog } from "@/components/tenant-dialog";
import { WhatsAppIcon } from "@/components/whatsapp-dialog";
import { lastMeterIndex, nextNumber, upsertDocument } from "@/lib/store";
import { addDays, currentPeriod, formatAmount, formatPeriod, todayISO, total, uid } from "@/lib/format";
import type { AppData, ChargePreset, DocType, LineItem, PaymentMethod, RentDocument, Settings, Tenant } from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = Omit<RentDocument, "id" | "createdAt"> & { id?: string };

function rentLabel(period: string) {
  return `Loyer${period ? ` ${formatPeriod(period)}` : ""}`;
}

function electricityLine(settings: Settings, indexStart: number | null): LineItem {
  return {
    id: uid(),
    kind: "electricite",
    label: "Électricité",
    amount: 0,
    indexStart,
    indexEnd: null,
    quantity: 0,
    unitPrice: settings.electricityPrice,
  };
}

function itemsForTenant(t: Tenant | undefined, period: string, settings: Settings): LineItem[] {
  const items: LineItem[] = [{ id: uid(), kind: "loyer", label: rentLabel(period), amount: t?.rent ?? 0 }];
  if (t?.meteredElectricity) items.push(electricityLine(settings, lastMeterIndex(t.id)));
  for (const c of t?.chargeItems ?? []) items.push({ id: uid(), kind: "charge", label: c.label, amount: c.amount });
  return items;
}

function withElectricity(line: LineItem, patch: Partial<LineItem>): LineItem {
  const next = { ...line, ...patch };
  const touchedIndex = "indexStart" in patch || "indexEnd" in patch;
  if (touchedIndex && next.indexStart != null && next.indexEnd != null && next.indexEnd >= next.indexStart) {
    next.quantity = Math.round((next.indexEnd - next.indexStart) * 100) / 100;
  }
  next.amount = Math.round((next.quantity || 0) * (next.unitPrice || 0));
  return next;
}

export function initialDraft(
  data: AppData,
  opts: { type?: string | null; tenantId?: string | null; invoiceId?: string | null; existing?: RentDocument },
): Draft {
  if (opts.existing) return { ...opts.existing };
  const invoice = opts.invoiceId ? data.documents.find((d) => d.id === opts.invoiceId) : undefined;
  const type: DocType = invoice ? "recu" : opts.type === "recu" ? "recu" : "facture";
  const period = invoice?.period ?? currentPeriod();
  const tenant = data.tenants.find((t) => t.id === (invoice?.tenantId ?? opts.tenantId));
  const today = todayISO();
  return {
    type,
    number: nextNumber(type),
    tenantId: tenant?.id ?? invoice?.tenantId ?? "",
    tenantName: invoice?.tenantName ?? tenant?.name ?? "",
    tenantPhone: invoice?.tenantPhone ?? tenant?.phone ?? "",
    property: invoice?.property ?? tenant?.property ?? "",
    issueDate: today,
    period,
    dueDate: type === "facture" ? addDays(today, 5) : "",
    items: invoice ? invoice.items.map((i) => ({ ...i, id: uid() })) : itemsForTenant(tenant, period, data.settings),
    paymentMethod: "especes",
    paid: type === "recu",
    notes: invoice ? `Paiement de la facture ${invoice.number}` : "",
    invoiceId: invoice?.id,
  };
}

export function DocumentEditor({ data, initial }: { data: AppData; initial: Draft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [tenantDialog, setTenantDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!draft.id;
  const cur = data.settings.currency;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function changeType(type: DocType) {
    if (type === draft.type) return;
    setDraft((d) => ({
      ...d,
      type,
      number: isEdit ? d.number : nextNumber(type),
      paid: type === "recu" ? true : d.paid,
      dueDate: type === "facture" && !d.dueDate ? addDays(d.issueDate, 5) : d.dueDate,
    }));
  }

  function applyTenant(t: Tenant) {
    setDraft((d) => ({
      ...d,
      tenantId: t.id,
      tenantName: t.name,
      tenantPhone: t.phone,
      property: t.property,
      items: itemsForTenant(t, d.period, data.settings),
    }));
    setErrors((e) => ({ ...e, tenant: "" }));
  }

  function changePeriod(period: string) {
    setDraft((d) => ({
      ...d,
      period,
      items: d.items.map((i) =>
        i.kind === "loyer" && i.label.startsWith("Loyer") ? { ...i, label: rentLabel(period) } : i,
      ),
    }));
  }

  const rent = draft.items.find((i) => i.kind === "loyer");
  const electricity = draft.items.find((i) => i.kind === "electricite");
  const charges = draft.items.filter((i) => i.kind === "charge");
  const setLines = (r: LineItem | undefined, e: LineItem | undefined, c: LineItem[]) =>
    set("items", [r, e, ...c].filter(Boolean) as LineItem[]);
  const setCharges = (list: ChargePreset[]) =>
    setLines(
      rent,
      electricity,
      list.map((c) => ({ id: c.id, kind: "charge" as const, label: c.label, amount: c.amount })),
    );
  const updateElectricity = (patch: Partial<LineItem>) =>
    electricity && setLines(rent, withElectricity(electricity, patch), charges);
  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  function validate() {
    const e: Record<string, string> = {};
    if (!draft.tenantName.trim()) e.tenant = "Choisissez un locataire.";
    if (!draft.number.trim()) e.number = "Le numéro est obligatoire.";
    if (!draft.items.length || total(draft.items) <= 0) e.items = "Ajoutez au moins une ligne avec un montant.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save(thenSend: boolean) {
    if (!validate()) {
      toast.error("Il manque des informations");
      return;
    }
    const saved = upsertDocument({
      ...draft,
      items: draft.items.filter((i) => i.kind !== "charge" || i.label.trim() || i.amount),
    });
    toast.success(
      `${saved.type === "facture" ? "Facture" : "Reçu"} ${saved.number} ${isEdit ? "mis à jour" : "enregistré"}`,
    );
    router.push(`/documents/${saved.id}${thenSend ? "?envoyer=1" : ""}`);
  }

  const previewDoc: RentDocument = { ...draft, id: draft.id ?? "preview", createdAt: "" };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-background p-1.5">
          {(
            [
              ["facture", "Facture", "Demander un paiement", FileText],
              ["recu", "Reçu", "Confirmer un paiement", Receipt],
            ] as const
          ).map(([value, label, hint, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeType(value)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                draft.type === value ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className={cn("block text-xs", draft.type === value ? "opacity-85" : "text-muted-foreground")}>
                  {hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Locataire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tenants.length > 0 ? (
              <div className="flex gap-2">
                <Select
                  value={draft.tenantId || null}
                  onValueChange={(id) => {
                    const t = data.tenants.find((x) => x.id === id);
                    if (t) applyTenant(t);
                  }}
                  items={data.tenants.map((t) => ({ value: t.id, label: t.name }))}
                >
                  <SelectTrigger className="h-10 flex-1" aria-invalid={!!errors.tenant}>
                    <SelectValue placeholder="Choisir un locataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.property ? <span className="text-muted-foreground"> · {t.property}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="lg" className="h-10" onClick={() => setTenantDialog(true)}>
                  <UserPlus /> <span className="hidden sm:inline">Nouveau</span>
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="lg" className="h-10 w-full" onClick={() => setTenantDialog(true)}>
                <UserPlus /> Ajouter un locataire
              </Button>
            )}
            {errors.tenant && <p className="text-xs text-destructive">{errors.tenant}</p>}
            {draft.tenantName && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="d-phone">WhatsApp du locataire</Label>
                  <Input
                    id="d-phone"
                    type="tel"
                    value={draft.tenantPhone}
                    onChange={(e) => set("tenantPhone", e.target.value)}
                    placeholder="90 12 34 56"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-property">Logement</Label>
                  <Input id="d-property" value={draft.property} onChange={(e) => set("property", e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-number">Numéro</Label>
              <Input
                id="d-number"
                value={draft.number}
                onChange={(e) => set("number", e.target.value)}
                aria-invalid={!!errors.number}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-period">Mois concerné</Label>
              <Input id="d-period" type="month" value={draft.period} onChange={(e) => changePeriod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-date">{draft.type === "facture" ? "Date de la facture" : "Date du paiement"}</Label>
              <Input id="d-date" type="date" value={draft.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </div>
            {draft.type === "facture" ? (
              <div className="space-y-1.5">
                <Label htmlFor="d-due">À payer avant le</Label>
                <Input id="d-due" type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Mode de paiement</Label>
                <Select
                  value={draft.paymentMethod}
                  onValueChange={(v) => v && set("paymentMethod", v as PaymentMethod)}
                  items={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="size-4 text-primary" /> Loyer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rent ? (
              <div className="flex gap-2">
                <Input
                  value={rent.label}
                  onChange={(e) => setLines({ ...rent, label: e.target.value }, electricity, charges)}
                  className="h-10 flex-1"
                  aria-label="Libellé du loyer"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={rent.amount || ""}
                  onChange={(e) => setLines({ ...rent, amount: Number(e.target.value) || 0 }, electricity, charges)}
                  placeholder="0"
                  className="h-10 w-28 text-right tabular-nums sm:w-36"
                  aria-label="Montant du loyer"
                />
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  setLines({ id: uid(), kind: "loyer", label: rentLabel(draft.period), amount: 0 }, electricity, charges)
                }
              >
                Ajouter le loyer
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" /> Électricité
            </CardTitle>
            <Switch
              checked={!!electricity}
              onCheckedChange={(on) =>
                setLines(
                  rent,
                  on ? electricityLine(data.settings, draft.tenantId ? lastMeterIndex(draft.tenantId, draft.id) : null) : undefined,
                  charges,
                )
              }
              aria-label="Facturer l'électricité"
            />
          </CardHeader>
          {electricity ? (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="e-start">Ancien index</Label>
                  <Input
                    id="e-start"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={electricity.indexStart ?? ""}
                    onChange={(e) => updateElectricity({ indexStart: numOrNull(e.target.value) })}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-end">Nouvel index</Label>
                  <Input
                    id="e-end"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={electricity.indexEnd ?? ""}
                    onChange={(e) => updateElectricity({ indexEnd: numOrNull(e.target.value) })}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-kwh">kWh consommés</Label>
                  <Input
                    id="e-kwh"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={electricity.quantity || ""}
                    onChange={(e) => updateElectricity({ quantity: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-price">Prix du kWh</Label>
                  <Input
                    id="e-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={electricity.unitPrice || ""}
                    onChange={(e) => updateElectricity({ unitPrice: Number(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              {electricity.indexStart != null &&
                electricity.indexEnd != null &&
                electricity.indexEnd < electricity.indexStart && (
                  <p className="text-xs text-destructive">Le nouvel index doit être supérieur à l&apos;ancien.</p>
                )}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="text-amber-900">
                  {electricity.quantity || 0} kWh × {formatAmount(electricity.unitPrice || 0, cur)}
                </span>
                <span className="font-semibold tabular-nums text-amber-900">{formatAmount(electricity.amount, cur)}</span>
              </div>
              {!data.settings.electricityPrice && (
                <p className="text-xs text-muted-foreground">
                  Astuce : enregistrez votre prix du kWh dans{" "}
                  <Link href="/parametres" className="text-primary underline">
                    les paramètres
                  </Link>{" "}
                  pour qu&apos;il soit rempli automatiquement.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Remplissez les deux index pour calculer la consommation, ou saisissez directement les kWh.
              </p>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground">Activez pour facturer l&apos;électricité au kWh.</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" /> Charges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChargeList
              items={charges.map((c) => ({ id: c.id, label: c.label, amount: c.amount }))}
              onChange={setCharges}
              presets={data.settings.chargeCatalog}
              emptyText="Aucune charge sur ce document."
            />
            {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
            <div className="flex items-center justify-end border-t pt-3">
              <p className="text-right">
                <span className="mr-2 text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-semibold tabular-nums">{formatAmount(total(draft.items), cur)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1.5">
            <Label htmlFor="d-notes">Note (facultatif)</Label>
            <Textarea
              id="d-notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Ex. Reste à payer : 10 000 FCFA"
              rows={2}
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-20 z-20 flex flex-col gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row md:bottom-4">
          <Button
            size="lg"
            className="h-11 flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5b]"
            onClick={() => save(true)}
          >
            <WhatsAppIcon className="size-4" /> Enregistrer et envoyer
          </Button>
          <div className="flex gap-2">
            <Button size="lg" variant="outline" className="h-11 flex-1" onClick={() => save(false)}>
              <Save /> Enregistrer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 lg:hidden"
              onClick={() => {
                setShowPreview(true);
                requestAnimationFrame(() =>
                  document.getElementById("apercu")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }}
              aria-label="Aperçu"
            >
              <Eye /> Aperçu
            </Button>
          </div>
        </div>
        {isEdit && (
          <Link href={`/documents/${draft.id}`} className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
            Annuler les modifications
          </Link>
        )}
      </div>

      <div id="apercu" className={cn("scroll-mt-20 lg:block", showPreview ? "block" : "hidden")}>
        <div className="lg:sticky lg:top-8">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Aperçu</p>
          <DocumentPreview doc={previewDoc} settings={data.settings} />
          {!data.settings.ownerName && (
            <p className="mt-3 text-sm text-muted-foreground">
              Astuce : ajoutez votre nom et votre téléphone dans{" "}
              <Link href="/parametres" className="text-primary underline">
                les paramètres
              </Link>{" "}
              pour qu&apos;ils apparaissent sur le document.
            </p>
          )}
        </div>
      </div>

      <TenantDialog open={tenantDialog} onOpenChange={setTenantDialog} onSaved={applyTenant} />
    </div>
  );
}
