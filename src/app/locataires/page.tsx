"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, History, MoreVertical, Pencil, Phone, Plus, Receipt, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader, PageLoading } from "@/components/common";
import { TenantDialog } from "@/components/tenant-dialog";
import { deleteTenant, useAppData } from "@/lib/store";
import { formatAmount } from "@/lib/format";
import { tenantMonthly } from "@/lib/format";
import type { Tenant } from "@/lib/types";

export default function TenantsPage() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Tenant | null>(null);

  const tenants = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...(data?.tenants ?? [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!q) return list;
    return list.filter((t) => [t.name, t.phone, t.property].some((v) => v.toLowerCase().includes(q)));
  }, [data, query]);

  if (!data) return <PageLoading />;

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Locataires"
        description={`${data.tenants.length} locataire${data.tenants.length > 1 ? "s" : ""} enregistré${data.tenants.length > 1 ? "s" : ""}`}
        actions={
          <Button onClick={openNew} size="lg">
            <Plus /> Ajouter un locataire
          </Button>
        }
      />

      {data.tenants.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Aucun locataire pour l'instant"
          description="Ajoutez vos locataires avec leur numéro WhatsApp et leur loyer : vous n'aurez plus à les ressaisir sur chaque facture."
          action={
            <Button onClick={openNew} size="lg">
              <Plus /> Ajouter mon premier locataire
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom, un logement…"
              className="h-10 pl-9"
            />
          </div>
          {tenants.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Aucun locataire ne correspond à « {query} ».</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map((t) => {
                const docs = data.documents.filter((d) => d.tenantId === t.id);
                const unpaid = docs.filter((d) => d.type === "facture" && !d.paid).length;
                return (
                  <Card key={t.id} className="gap-0 py-0">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                            {t.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{t.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{t.property || "Logement non précisé"}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}
                          >
                            <MoreVertical />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem render={<Link href={`/historique/${t.id}`} />}>
                              <History /> Historique
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(t);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setToDelete(t)}>
                              <Trash2 /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-muted/60 p-2">
                          <p className="text-xs text-muted-foreground">
                            Loyer + charges{t.meteredElectricity ? " + élec." : ""}
                          </p>
                          <p className="font-medium tabular-nums">{formatAmount(tenantMonthly(t), data.settings.currency)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 p-2">
                          <p className="text-xs text-muted-foreground">Impayés</p>
                          <p className={unpaid ? "font-medium text-amber-700" : "font-medium"}>
                            {unpaid ? `${unpaid} facture${unpaid > 1 ? "s" : ""}` : "Aucun"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          {t.phone && (
                            <>
                              <Phone className="size-3.5" /> {t.phone}
                            </>
                          )}
                        </span>
                        <Link href={`/historique/${t.id}`} className="flex items-center gap-1 text-primary hover:underline">
                          <History className="size-3.5" /> Historique
                        </Link>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          href={`/documents/nouveau?type=facture&locataire=${t.id}`}
                          className={buttonVariants({ variant: "outline", size: "lg" })}
                        >
                          <FileText /> Facture
                        </Link>
                        <Link
                          href={`/documents/nouveau?type=recu&locataire=${t.id}`}
                          className={buttonVariants({ size: "lg" })}
                        >
                          <Receipt /> Reçu
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <TenantDialog open={dialogOpen} onOpenChange={setDialogOpen} tenant={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {toDelete?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le locataire sera retiré de votre liste. Ses factures et reçus déjà créés sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (toDelete) deleteTenant(toDelete.id);
                toast.success("Locataire supprimé");
                setToDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
