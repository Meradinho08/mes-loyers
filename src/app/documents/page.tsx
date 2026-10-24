"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocStatusBadge, EmptyState, PageHeader, PageLoading } from "@/components/common";
import { useAppData } from "@/lib/store";
import { formatAmount, formatDate, formatPeriod, total } from "@/lib/format";

type Filter = "tous" | "factures" | "recus" | "impayees";

export default function DocumentsPage() {
  const data = useAppData();
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.documents ?? [])
      .filter((d) => {
        if (filter === "factures") return d.type === "facture";
        if (filter === "recus") return d.type === "recu";
        if (filter === "impayees") return d.type === "facture" && !d.paid;
        return true;
      })
      .filter((d) => !q || [d.number, d.tenantName, d.property].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => (b.issueDate + b.createdAt).localeCompare(a.issueDate + a.createdAt));
  }, [data, filter, query]);

  if (!data) return <PageLoading />;
  const cur = data.settings.currency;
  const unpaidCount = data.documents.filter((d) => d.type === "facture" && !d.paid).length;

  return (
    <>
      <PageHeader
        title="Factures et reçus"
        description="Retrouvez, renvoyez ou téléchargez vos documents."
        actions={
          <Link href="/documents/nouveau" className={buttonVariants({ size: "lg" })}>
            <Plus /> Nouveau document
          </Link>
        }
      />

      {data.documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title="Aucun document"
          description="Créez votre première facture ou votre premier reçu de loyer, puis envoyez-le sur WhatsApp."
          action={
            <Link href="/documents/nouveau" className={buttonVariants({ size: "lg" })}>
              <Plus /> Créer un document
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="h-9">
                <TabsTrigger value="tous">Tous</TabsTrigger>
                <TabsTrigger value="factures">Factures</TabsTrigger>
                <TabsTrigger value="recus">Reçus</TabsTrigger>
                <TabsTrigger value="impayees">
                  Impayées{unpaidCount ? ` (${unpaidCount})` : ""}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, numéro, logement…"
                className="h-9 pl-9"
              />
            </div>
          </div>

          {docs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucun document dans cette catégorie.</p>
          ) : (
            <Card className="gap-0 divide-y py-0">
              {docs.map((d) => (
                <Link
                  key={d.id}
                  href={`/documents/${d.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{d.tenantName}</span>
                      <DocStatusBadge doc={d} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {d.number} · {formatDate(d.issueDate)}
                      {d.period ? ` · ${formatPeriod(d.period)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatAmount(total(d.items), cur)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}
