"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RentDocument, Settings } from "@/lib/types";
import { normalizePhone } from "@/lib/format";
import { canSharePdf, downloadPdf, sharePdf, whatsappMessage, whatsappUrl } from "@/lib/whatsapp";

const noop = () => () => {};

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.48-8.41" />
    </svg>
  );
}

export function WhatsAppDialog({
  doc,
  settings,
  open,
  onOpenChange,
}: {
  doc: RentDocument;
  settings: Settings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState<"share" | "chat" | null>(null);
  const shareSupported = useSyncExternalStore(noop, canSharePdf, () => false);
  const phone = normalizePhone(doc.tenantPhone, settings.defaultCountryCode);

  async function onShare() {
    setBusy("share");
    try {
      const result = await sharePdf(doc, settings);
      if (result === "shared") {
        toast.success("Document partagé");
        onOpenChange(false);
      }
    } catch {
      toast.error("Le partage a échoué. Essayez l'autre option ci-dessous.");
    } finally {
      setBusy(null);
    }
  }

  async function onChat() {
    setBusy("chat");
    // Must open synchronously within the click, otherwise pop-up blockers stop it.
    window.open(whatsappUrl(doc, settings), "_blank", "noopener");
    try {
      await downloadPdf(doc, settings);
      toast.success("PDF téléchargé — joignez-le dans la discussion WhatsApp");
    } catch {
      toast.error("Impossible de préparer le PDF");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WhatsAppIcon className="size-5 text-[#25D366]" /> Envoyer sur WhatsApp
          </DialogTitle>
          <DialogDescription>
            À {doc.tenantName}
            {phone ? ` · +${phone}` : " · aucun numéro enregistré"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {shareSupported && (
            <button
              type="button"
              onClick={onShare}
              disabled={busy !== null}
              className="flex w-full items-start gap-3 rounded-xl border-2 border-[#25D366] bg-[#25D366]/10 p-4 text-left transition hover:bg-[#25D366]/15 disabled:opacity-60"
            >
              {busy === "share" ? (
                <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" />
              ) : (
                <Send className="mt-0.5 size-5 shrink-0 text-[#128C7E]" />
              )}
              <span>
                <span className="block font-semibold">Envoyer le PDF directement</span>
                <span className="block text-sm text-muted-foreground">
                  Choisissez WhatsApp dans la liste, puis votre locataire. Le PDF et le message partent ensemble.
                </span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onChat}
            disabled={busy !== null}
            className="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition hover:bg-muted disabled:opacity-60"
          >
            {busy === "chat" ? (
              <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" />
            ) : (
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-[#128C7E]" />
            )}
            <span>
              <span className="block font-semibold">Ouvrir la discussion avec le message</span>
              <span className="block text-sm text-muted-foreground">
                Le PDF est téléchargé et WhatsApp s&apos;ouvre avec le message prêt
                {phone ? " pour ce numéro" : ""}. Ajoutez le PDF avec le trombone.
              </span>
            </span>
          </button>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Message envoyé</p>
            <p className="max-h-40 overflow-y-auto text-sm whitespace-pre-line">{whatsappMessage(doc, settings)}</p>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await downloadPdf(doc, settings);
            }}
          >
            <Download /> Télécharger seulement le PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
