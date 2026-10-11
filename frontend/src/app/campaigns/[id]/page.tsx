import { Suspense } from "react";
import { CampaignDetail } from "@/components/campaign-detail";

function CampaignDetailLoading() {
  return <div className="app-loading">Loading campaign details…</div>;
}

async function ResolvedCampaignPage({ params }: Pick<PageProps<"/campaigns/[id]">, "params">) {
  const { id } = await params;
  return <CampaignDetail campaignId={id} />;
}

export default function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  return (
    <Suspense fallback={<CampaignDetailLoading />}>
      <ResolvedCampaignPage params={params} />
    </Suspense>
  );
}
