"use client";

import dynamic from "next/dynamic";

const DynamicResourceDocumentEditor = dynamic(
  () => import("./ResourceDocumentEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-background text-sm text-muted">
        Cargando editor…
      </div>
    ),
  },
);

export function ResourceDocumentField(props: {
  initialValue: string | null | undefined;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
  onChange: (serialized: string, error: string | null) => void;
}) {
  return <DynamicResourceDocumentEditor {...props} />;
}
