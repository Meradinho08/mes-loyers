"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, ImageUp, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const WIDTH = 600;
const HEIGHT = 220;

/** Crops transparent margins so the signature sits tightly on documents. */
function exportTrimmed(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width,
    minY = canvas.height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(canvas.width - 1, maxX + pad);
  maxY = Math.min(canvas.height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

/** Turns a photo of a signature on white paper into dark ink on a transparent background. */
function inkFromImage(img: HTMLImageElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const alpha = d[i + 3] === 0 ? 0 : Math.max(0, Math.min(255, (200 - lum) * 2.2));
    d[i] = 20;
    d[i + 1] = 30;
    d[i + 2] = 70;
    d[i + 3] = alpha;
  }
  ctx.putImageData(image, 0, 0);
}

export function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(!value);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#141e46";
    ctx.lineWidth = 3.2;
  }, [editing]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WIDTH, y: ((e.clientY - rect.top) / rect.height) * HEIGHT };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = "#141e46";
    ctx.fill();
    setDirty(true);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function up() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, WIDTH, HEIGHT);
    setDirty(false);
  }

  function save() {
    const url = canvasRef.current && exportTrimmed(canvasRef.current);
    if (!url) {
      toast.error("Dessinez votre signature avant de l'enregistrer");
      return;
    }
    onChange(url);
    setEditing(false);
    setDirty(false);
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          inkFromImage(img, canvasRef.current);
          setDirty(true);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  if (!editing && value) {
    return (
      <div className="space-y-3">
        <div className="flex h-36 items-center justify-center rounded-lg border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Votre signature" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            <PenLine /> Refaire la signature
          </Button>
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => onChange("")}>
            <Trash2 /> Supprimer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border-2 border-dashed bg-white">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block aspect-[600/220] w-full cursor-crosshair touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          aria-label="Zone de signature"
        />
        {!dirty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Signez ici avec le doigt ou la souris
          </p>
        )}
        <div className="pointer-events-none absolute inset-x-8 bottom-8 h-px bg-neutral-200" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={!dirty}>
          Utiliser cette signature
        </Button>
        <Button type="button" variant="outline" onClick={clear} disabled={!dirty}>
          <Eraser /> Effacer
        </Button>
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
          <ImageUp /> Importer une photo
        </Button>
        {value && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Photo : signez sur une feuille blanche puis prenez-la en photo, le fond blanc est retiré automatiquement.
      </p>
    </div>
  );
}
