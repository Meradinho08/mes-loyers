import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RentDocument } from "@/lib/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-background px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DocStatusBadge({ doc }: { doc: RentDocument }) {
  if (doc.type === "recu") {
    return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Reçu</Badge>;
  }
  return doc.paid ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Facture payée</Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Facture impayée</Badge>
  );
}
