"use client";

import { useEffect } from "react";
import { Mail, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";
import { type Channel, type SendPayload, openChannel } from "@/lib/send";
import { downloadFile } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export interface PreparedSend {
  payload: SendPayload;
  file: () => Promise<File>;
}

export function SendButtons({
  prepare,
  autoDownload,
  variant = "panel",
  onSent,
}: {
  /** Runs synchronously on click; return null to cancel (e.g. invalid form). */
  prepare: () => PreparedSend | null;
  autoDownload: boolean;
  variant?: "panel" | "bar" | "icon";
  onSent?: (channel: Channel) => void;
}) {
  useEffect(() => {
    void import("jspdf");
  }, []);

  function send(channel: Channel) {
    const prepared = prepare();
    if (!prepared) return;
    const { payload } = prepared;
    if (autoDownload && channel !== "sms") {
      prepared
        .file()
        .then((f) => {
          downloadFile(f);
          toast.success(
            channel === "whatsapp"
              ? "PDF téléchargé : joignez-le dans WhatsApp avec le trombone"
              : "PDF téléchargé : joignez-le à l'e-mail",
          );
        })
        .catch(() => toast.error("Impossible de générer le PDF"));
    }
    if (channel === "email" && !payload.email.trim()) {
      toast.info("Aucune adresse e-mail enregistrée : choisissez le destinataire dans votre messagerie.");
    }
    if (channel !== "email" && !payload.phone.trim()) {
      toast.info("Aucun numéro enregistré : choisissez le contact.");
    }
    openChannel(channel, payload);
    onSent?.(channel);
  }

  if (variant === "icon") {
    return (
      <Button
        size="icon"
        className="size-10 shrink-0 rounded-full bg-[#25D366] text-white hover:bg-[#1ebe5b]"
        onClick={() => send("whatsapp")}
        aria-label="Envoyer sur WhatsApp"
        title="Envoyer sur WhatsApp"
      >
        <WhatsAppIcon className="size-5" />
      </Button>
    );
  }

  if (variant === "bar") {
    return (
      <div className="flex min-w-0 flex-1 gap-1.5 sm:gap-2">
        <Button
          size="lg"
          className="h-11 min-w-0 flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5b]"
          onClick={() => send("whatsapp")}
        >
          <WhatsAppIcon className="size-4" /> <span className="hidden min-[360px]:inline">WhatsApp</span>
        </Button>
        <Button size="lg" variant="outline" className="h-11 w-10 px-0 md:w-auto md:px-3" onClick={() => send("sms")} aria-label="Envoyer par SMS">
          <MessageSquareText /> <span className="hidden md:inline">SMS</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11 w-10 px-0 md:w-auto md:px-3"
          onClick={() => send("email")}
          aria-label="Envoyer par e-mail"
        >
          <Mail /> <span className="hidden md:inline">E-mail</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="h-12 w-full bg-[#25D366] text-base text-white hover:bg-[#1ebe5b]"
        onClick={() => send("whatsapp")}
      >
        <WhatsAppIcon className="size-5" /> Envoyer sur WhatsApp
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <ChannelButton icon={<MessageSquareText />} label="Par SMS" onClick={() => send("sms")} />
        <ChannelButton icon={<Mail />} label="Par e-mail" onClick={() => send("email")} />
      </div>
    </div>
  );
}

function ChannelButton({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button size="lg" variant="outline" className={cn("h-11 w-full", className)} onClick={onClick}>
      {icon} {label}
    </Button>
  );
}
