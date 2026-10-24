"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Copy, Download, Share2, FileQuestion, Pencil, Receipt, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { DocStatusBadge, EmptyState, PageLoading } from "@/components/common";
import { DocumentPreview } from "@/components/document-preview";
import { SendButtons } from "@/components/send-buttons";
import { deleteDocument, setInvoicePaid, useAppData } from "@/lib/store";
import { formatAmount, total } from "@/lib/format";
import { canSharePdf, docPayload, downloadPdf, pdfFile, sharePdf, whatsappMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { AppData, RentDocument } from "@/lib/types";

const noop = () => () => {};

export default function DocumentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DocumentView />
    </Suspense>
  );
}

function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const data = useAppData();
  if (!data) return <PageLoading />;
  const doc = data.documents.find((d) => d.id === id);
  if (!doc) {
    return (
      <EmptyState
        icon={<FileQuestion className="size-6" />}
        title="Document introuvable"
        description="Il a peut-être été supprimé ou créé sur un autre appareil."
        action={
          <Link href="/documents" className={buttonVariants()}>
            Retour aux documents
          </Link>
        }
      />
    );
  }
  return <DocumentDetail key={doc.id} doc={doc} data={data} />;
}

function DocumentDetail({ doc, data }: { doc: RentDocument; data: AppData }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { settings } = data;
  const receipt = doc.type === "facture" ? data.documents.find((d) => d.invoiceId === doc.id) : undefined;
  const invoice = doc.invoiceId ? data.documents.find((d) => d.id === doc.invoiceId) : undefined;

  const shareSupported = useSyncExternalStore(noop, canSharePdf, () => false);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/documents" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Documents
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {doc.number} <DocStatusBadge doc={doc} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {doc.tenantName} · {formatAmount(total(doc.items), settings.currency)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DocumentPreview doc={doc} settings={settings} className="order-2 lg:order-1" />

        <div className="order-1 space-y-3 lg:order-2">
          <Card>
            <CardContent className="space-y-2">
              <SendButtons
                autoDownload={settings.autoDownloadPdf}
                prepare={() => ({ payload: docPayload(doc, settings), file: () => pdfFile(doc, settings) })}
              />
              <div className="my-1 border-t" />
              {shareSupported && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-10 w-full"
                  onClick={async () => {
                    try {
                      await sharePdf(doc, settings);
                    } catch {
                      toast.error("Le partage a échoué");
                    }
                  }}
                >
                  <Share2 /> Partager le fichier PDF
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-10 w-full"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await downloadPdf(doc, settings);
                  } catch {
                    toast.error("Impossible de générer le PDF");
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                <Download /> Télécharger le PDF
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-10 w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(whatsappMessage(doc, settings));
                    toast.success("Message copié");
                  } catch {
                    toast.error("Copie impossible sur ce navigateur");
                  }
                }}
              >
                <Copy /> Copier le message
              </Button>
            </CardContent>
          </Card>

          {doc.type === "facture" && (
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">Paiement</p>
                {receipt ? (
                  <Link href={`/documents/${receipt.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 w-full")}>
                    <Receipt /> Voir le reçu {receipt.number}
                  </Link>
                ) : (
                  <Link
                    href={`/documents/nouveau?type=recu&facture=${doc.id}`}
                    className={cn(buttonVariants({ size: "lg" }), "h-10 w-full")}
                  >
                    <Receipt /> Le locataire a payé : faire le reçu
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-10 w-full"
                  onClick={() => {
                    setInvoicePaid(doc.id, !doc.paid);
                    toast.success(doc.paid ? "Facture marquée impayée" : "Facture marquée payée");
                  }}
                >
                  {doc.paid ? <RotateCcw /> : <CheckCircle2 />}
                  {doc.paid ? "Marquer comme impayée" : "Marquer payée sans reçu"}
                </Button>
              </CardContent>
            </Card>
          )}

          {invoice && (
            <Link href={`/documents/${invoice.id}`} className="block text-sm text-primary underline-offset-4 hover:underline">
              Facture liée : {invoice.number}
            </Link>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link href={`/documents/${doc.id}/modifier`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
              <Pencil /> Modifier
            </Link>
            <Button variant="destructive" size="lg" className="h-10" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Supprimer
            </Button>
          </div>
        </div>
      </div>


      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {doc.number} ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                router.push("/documents");
                deleteDocument(doc.id);
                toast.success("Document supprimé");
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
