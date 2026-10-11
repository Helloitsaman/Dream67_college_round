import { Suspense } from "react";
import { RunDetail } from "@/components/run-detail";

function RunDetailLoading() {
  return <div className="app-loading">Loading run details…</div>;
}

async function ResolvedRunPage({ params }: Pick<PageProps<"/runs/[id]">, "params">) {
  const { id } = await params;
  return <RunDetail runId={id} />;
}

export default function RunPage({ params }: PageProps<"/runs/[id]">) {
  return (
    <Suspense fallback={<RunDetailLoading />}>
      <ResolvedRunPage params={params} />
    </Suspense>
  );
}

