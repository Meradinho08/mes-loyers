"use client";

import { useRef, useState } from "react";
import { Download, PenLine, Receipt, Send, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageLoading } from "@/components/common";
import { ChargeList } from "@/components/charge-list";
import { SignaturePad } from "@/components/signature-pad";
import { exportData, importData, saveSettings, useAppData } from "@/lib/store";
import { formatAmount, todayISO } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const data = useAppData();
  if (!data) return <PageLoading />;
  return <SettingsForm initial={data.settings} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>(initial);
  const stored = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: "ownerName" | "phone" | "address" | "email" | "currency" | "defaultCountryCode" | "footerNote") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveSettings({
      ...form,
      signature: stored?.settings.signature ?? form.signature,
      currency: form.currency.trim() || "FCFA",
      electricityPrice: Number(form.electricityPrice) || 0,
      chargeCatalog: form.chargeCatalog.filter((c) => c.label.trim()),
    });
    toast.success("Paramètres enregistrés");
  }

  function backup() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sauvegarde-mes-loyers-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restore(file: File) {
    try {
      importData(await file.text());
      toast.success("Données restaurées");
      window.location.reload();
    } catch {
      toast.error("Ce fichier n'est pas une sauvegarde valide");
    }
  }

  return (
    <>
      <PageHeader title="Paramètres" description="Ces informations apparaissent sur toutes vos factures et tous vos reçus." />
      <div className="grid max-w-3xl gap-6">
        <form onSubmit={submit} className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vos coordonnées de bailleur</CardTitle>
              <CardDescription>Le nom est repris dans la phrase « Je soussigné(e)… » des reçus.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-name">Nom ou raison sociale</Label>
                <Input id="s-name" value={form.ownerName} onChange={set("ownerName")} placeholder="Ex. Ama Akakpo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Téléphone</Label>
                <Input id="s-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+228 90 00 00 00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">E-mail (facultatif)</Label>
                <Input id="s-email" type="email" value={form.email} onChange={set("email")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-address">Adresse</Label>
                <Input id="s-address" value={form.address} onChange={set("address")} placeholder="Quartier, ville" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-currency">Monnaie</Label>
                <Input id="s-currency" value={form.currency} onChange={set("currency")} placeholder="FCFA" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-cc">Indicatif WhatsApp par défaut</Label>
                <Input
                  id="s-cc"
                  inputMode="numeric"
                  value={form.defaultCountryCode}
                  onChange={set("defaultCountryCode")}
                  placeholder="228"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-footer">Mention en bas des documents</Label>
                <Textarea id="s-footer" value={form.footerNote} onChange={set("footerNote")} rows={2} />
              </div>
            </CardContent>
          </Card>

          <SignatureCard />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="size-4 text-primary" /> Envoi
              </CardTitle>
              <CardDescription>
                Un clic sur WhatsApp, SMS ou E-mail ouvre directement l&apos;application avec le message prêt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-start gap-3">
                <Switch
                  checked={form.autoDownloadPdf}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, autoDownloadPdf: v }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Télécharger le PDF à chaque envoi</span>
                  <span className="block text-xs text-muted-foreground">
                    Pour le joindre dans WhatsApp (trombone) ou dans l&apos;e-mail. Les SMS contiennent seulement le message.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" /> Électricité
              </CardTitle>
              <CardDescription>
                Sur les factures, vous saisissez seulement les kWh consommés (ou les index du compteur) : le montant est
                calculé automatiquement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Label htmlFor="s-kwh">Prix du kWh ({form.currency || "FCFA"})</Label>
              <Input
                id="s-kwh"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.electricityPrice || ""}
                onChange={(e) => setForm((f) => ({ ...f, electricityPrice: Number(e.target.value) || 0 }))}
                placeholder="Ex. 300"
                className="max-w-48"
              />
              <p className="text-xs text-muted-foreground">
                {form.electricityPrice
                  ? `Exemple : 50 kWh = ${formatAmount(50 * form.electricityPrice, form.currency)}`
                  : "Ex. 1 kWh = 300 FCFA"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" /> Charges proposées
              </CardTitle>
              <CardDescription>
                Votre liste de charges habituelles avec leur prix. Elles s&apos;ajoutent en un clic aux locataires et aux
                factures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChargeList
                items={form.chargeCatalog}
                onChange={(chargeCatalog) => setForm((f) => ({ ...f, chargeCatalog }))}
                emptyText="Aucune charge dans votre liste."
              />
            </CardContent>
          </Card>

          <div className="sticky bottom-20 z-20 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
            <Button type="submit" size="lg" className="h-11 w-full">
              Enregistrer les paramètres
            </Button>
          </div>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Sauvegarde</CardTitle>
            <CardDescription>
              Vos données sont enregistrées uniquement dans ce navigateur. Faites une sauvegarde régulièrement, ou pour
              les transférer sur un autre téléphone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="lg" className="h-10" onClick={backup}>
              <Download /> Télécharger une sauvegarde
            </Button>
            <Button variant="outline" size="lg" className="h-10" onClick={() => fileRef.current?.click()}>
              <Upload /> Restaurer une sauvegarde
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) restore(f);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SignatureCard() {
  const data = useAppData();
  if (!data) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="size-4 text-primary" /> Ma signature
        </CardTitle>
        <CardDescription>Elle est ajoutée automatiquement en bas de toutes vos factures et de tous vos reçus.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignaturePad
          value={data.settings.signature}
          onChange={(signature) => {
            saveSettings({ ...data.settings, signature });
            toast.success(signature ? "Signature enregistrée" : "Signature supprimée");
          }}
        />
      </CardContent>
    </Card>
  );
}
