"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, PageLoading } from "@/components/common";
import { DocumentEditor, initialDraft } from "@/components/document-editor";
import { useAppData } from "@/lib/store";

export default function EditDocumentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditDocument />
    </Suspense>
  );
}

function EditDocument() {
  const { id } = useParams<{ id: string }>();
  const data = useAppData();
  if (!data) return <PageLoading />;
  const existing = data.documents.find((d) => d.id === id);
  if (!existing) {
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
  return (
    <>
      <PageHeader title={`Modifier ${existing.number}`} />
      <DocumentEditor key={existing.id} data={data} initial={initialDraft(data, { existing })} />
    </>
  );
}
