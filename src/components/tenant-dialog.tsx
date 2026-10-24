"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertTenant } from "@/lib/store";
import type { Tenant } from "@/lib/types";

type FormState = {
  name: string;
  phone: string;
  property: string;
  rent: string;
  charges: string;
  notes: string;
};

function toForm(t?: Tenant | null): FormState {
  return {
    name: t?.name ?? "",
    phone: t?.phone ?? "",
    property: t?.property ?? "",
    rent: t?.rent ? String(t.rent) : "",
    charges: t?.charges ? String(t.charges) : "",
    notes: t?.notes ?? "",
  };
}

export function TenantDialog({
  open,
  onOpenChange,
  tenant,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  onSaved?: (t: Tenant) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && (
          <TenantForm
            key={tenant?.id ?? "new"}
            tenant={tenant}
            onDone={(t) => {
              onSaved?.(t);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TenantForm({
  tenant,
  onDone,
  onCancel,
}: {
  tenant?: Tenant | null;
  onDone: (t: Tenant) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(tenant));
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Le nom du locataire est obligatoire.");
      return;
    }
    const saved = upsertTenant({
      id: tenant?.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      property: form.property.trim(),
      rent: Number(form.rent) || 0,
      charges: Number(form.charges) || 0,
      notes: form.notes.trim(),
    });
    toast.success(tenant ? "Locataire mis à jour" : "Locataire ajouté");
    onDone(saved);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{tenant ? "Modifier le locataire" : "Nouveau locataire"}</DialogTitle>
        <DialogDescription>Ces informations seront reprises automatiquement sur ses factures et reçus.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="t-name">Nom complet *</Label>
          <Input id="t-name" value={form.name} onChange={set("name")} placeholder="Ex. Kossi Mensah" autoFocus />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-phone">Numéro WhatsApp</Label>
          <Input
            id="t-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="90 12 34 56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-property">Logement</Label>
          <Input id="t-property" value={form.property} onChange={set("property")} placeholder="Appartement A2, Bè" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-rent">Loyer mensuel (FCFA)</Label>
          <Input id="t-rent" type="number" inputMode="numeric" min={0} value={form.rent} onChange={set("rent")} placeholder="75000" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-charges">Charges mensuelles (FCFA)</Label>
          <Input
            id="t-charges"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.charges}
            onChange={set("charges")}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="t-notes">Notes</Label>
          <Textarea id="t-notes" value={form.notes} onChange={set("notes")} placeholder="Caution versée, date d'entrée…" rows={2} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Sans indicatif, le numéro est considéré comme togolais (+228). Vous pouvez changer cela dans les paramètres.
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">{tenant ? "Enregistrer" : "Ajouter le locataire"}</Button>
      </DialogFooter>
    </form>
  );
}
