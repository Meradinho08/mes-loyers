"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageLoading } from "@/components/common";
import { exportData, importData, saveSettings, useAppData } from "@/lib/store";
import { todayISO } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const data = useAppData();
  if (!data) return <PageLoading />;
  return <SettingsForm initial={data.settings} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>(initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveSettings({ ...form, currency: form.currency.trim() || "FCFA" });
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
        <form onSubmit={submit}>
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
              <div className="sm:col-span-2">
                <Button type="submit" size="lg" className="h-10 w-full sm:w-auto">
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
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
