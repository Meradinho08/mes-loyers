"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, uid } from "@/lib/format";
import type { ChargePreset } from "@/lib/types";

export function ChargeList({
  items,
  onChange,
  presets = [],
  emptyText = "Aucune charge.",
}: {
  items: ChargePreset[];
  onChange: (items: ChargePreset[]) => void;
  presets?: ChargePreset[];
  emptyText?: string;
}) {
  const unused = presets.filter((p) => !items.some((i) => i.label.trim().toLowerCase() === p.label.trim().toLowerCase()));
  const update = (id: string, patch: Partial<ChargePreset>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={(e) => update(item.id, { label: e.target.value })}
            placeholder="Ex. Eau, gardiennage…"
            className="h-10 flex-1"
            aria-label="Nom de la charge"
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={item.amount || ""}
            onChange={(e) => update(item.id, { amount: Number(e.target.value) || 0 })}
            placeholder="Prix"
            className="h-10 w-28 text-right tabular-nums sm:w-32"
            aria-label="Prix"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground"
            onClick={() => onChange(items.filter((i) => i.id !== item.id))}
            aria-label="Retirer"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        {unused.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange([...items, { id: uid(), label: p.label, amount: p.amount }])}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
          >
            <Plus className="size-3" /> {p.label}
            {p.amount ? <span className="opacity-70">· {formatNumber(p.amount)}</span> : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { id: uid(), label: "", amount: 0 }])}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-muted"
        >
          <Plus className="size-3" /> Autre charge
        </button>
      </div>
    </div>
  );
}
