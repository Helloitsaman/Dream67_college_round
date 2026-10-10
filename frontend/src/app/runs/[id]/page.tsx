import { RunDetail } from "@/components/run-detail";

export default async function RunPage({ params }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  return <RunDetail runId={id} />;
}

