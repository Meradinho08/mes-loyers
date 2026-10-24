"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, PageLoading } from "@/components/common";
import { DocumentEditor, initialDraft } from "@/components/document-editor";
import { useAppData } from "@/lib/store";
import type { AppData } from "@/lib/types";

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewDocument />
    </Suspense>
  );
}

function NewDocument() {
  const data = useAppData();
  const params = useSearchParams();
  if (!data) return <PageLoading />;
  const key = params.toString();
  return <Editor key={key} data={data} params={params} />;
}

function Editor({ data, params }: { data: AppData; params: URLSearchParams }) {
  const [initial] = useState(() =>
    initialDraft(data, {
      type: params.get("type"),
      tenantId: params.get("locataire"),
      invoiceId: params.get("facture"),
    }),
  );
  return (
    <>
      <PageHeader
        title="Nouveau document"
        description="Remplissez les informations, l'aperçu se met à jour en direct."
      />
      <DocumentEditor data={data} initial={initial} />
    </>
  );
}
