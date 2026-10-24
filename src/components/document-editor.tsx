"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, Plus, Receipt, Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentPreview } from "@/components/document-preview";
import { TenantDialog } from "@/components/tenant-dialog";
import { WhatsAppIcon } from "@/components/whatsapp-dialog";
import { nextNumber, upsertDocument } from "@/lib/store";
import { addDays, currentPeriod, formatAmount, formatPeriod, todayISO, total, uid } from "@/lib/format";
import type { AppData, DocType, LineItem, PaymentMethod, RentDocument, Tenant } from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = Omit<RentDocument, "id" | "createdAt"> & { id?: string };

function itemsForTenant(t: Tenant | undefined, period: string): LineItem[] {
  const items: LineItem[] = [
    { id: uid(), label: `Loyer${period ? ` ${formatPeriod(period)}` : ""}`, amount: t?.rent ?? 0 },
  ];
  if (t?.charges) items.push({ id: uid(), label: "Charges (eau, électricité, entretien)", amount: t.charges });
  return items;
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
    items: invoice ? invoice.items.map((i) => ({ ...i, id: uid() })) : itemsForTenant(tenant, period),
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
      items: itemsForTenant(t, d.period),
    }));
    setErrors((e) => ({ ...e, tenant: "" }));
  }

  function changePeriod(period: string) {
    setDraft((d) => ({
      ...d,
      period,
      items: d.items.map((i) =>
        i.label.startsWith("Loyer") ? { ...i, label: `Loyer${period ? ` ${formatPeriod(period)}` : ""}` } : i,
      ),
    }));
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    set(
      "items",
      draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }

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
      items: draft.items.filter((i) => i.label.trim() || i.amount),
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
            <CardTitle>Montants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  placeholder="Désignation (loyer, eau, réparation…)"
                  className="h-10 flex-1"
                  aria-label="Désignation"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={item.amount || ""}
                  onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-10 w-28 text-right tabular-nums sm:w-36"
                  aria-label="Montant"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground"
                  onClick={() => set("items", draft.items.filter((i) => i.id !== item.id))}
                  aria-label="Supprimer la ligne"
                  disabled={draft.items.length === 1}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <Button
                variant="outline"
                onClick={() => set("items", [...draft.items, { id: uid(), label: "", amount: 0 }])}
              >
                <Plus /> Ajouter une ligne
              </Button>
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
