import Link from "next/link";
import type { MonthRecap, MonthState } from "@/lib/recap";
import { MONTH_STATE_LABEL } from "@/lib/recap";
import { formatAmount, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

const SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export const STATE_STYLES: Record<MonthState, string> = {
  paye: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partiel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  impaye: "bg-amber-100 text-amber-900 border-amber-300",
  aucun: "bg-muted/60 text-muted-foreground border-transparent",
};

export function MonthGrid({
  months,
  currency,
  size = "sm",
}: {
  months: MonthRecap[];
  currency: string;
  size?: "sm" | "lg";
}) {
  return (
    <div className={cn("grid grid-cols-6 gap-1.5", size === "lg" ? "sm:grid-cols-12 sm:gap-2" : "sm:grid-cols-12")}>
      {months.map((m, i) => {
        const title = `${formatPeriod(m.period)} : ${MONTH_STATE_LABEL[m.state]}${
          m.invoiced ? ` · facturé ${formatAmount(m.invoiced, currency)}` : ""
        }${m.paid ? ` · payé ${formatAmount(m.paid, currency)}` : ""}`;
        const cell = (
          <div
            title={title}
            className={cn(
              "flex flex-col items-center justify-center rounded-md border text-center",
              size === "lg" ? "h-16 gap-0.5 px-1" : "h-9",
              STATE_STYLES[m.state],
            )}
          >
            <span className={cn("font-medium", size === "lg" ? "text-xs" : "text-[10px]")}>{SHORT[i]}</span>
            {size === "lg" && (
              <span className="text-[10px] leading-tight">{m.state === "aucun" ? "—" : MONTH_STATE_LABEL[m.state]}</span>
            )}
          </div>
        );
        const target = m.docs[0];
        return target && size === "lg" ? (
          <Link key={m.period} href={`/documents/${target.id}`} className="transition hover:opacity-80">
            {cell}
          </Link>
        ) : (
          <div key={m.period}>{cell}</div>
        );
      })}
    </div>
  );
}

export function MonthLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {(["paye", "partiel", "impaye", "aucun"] as MonthState[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm border", STATE_STYLES[s])} />
          {s === "aucun" ? "Rien enregistré" : MONTH_STATE_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
