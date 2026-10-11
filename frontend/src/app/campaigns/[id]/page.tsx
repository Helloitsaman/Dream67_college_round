import { CampaignDetail } from "@/components/campaign-detail";

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  return <CampaignDetail campaignId={id} />;
}
