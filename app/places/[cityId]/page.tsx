import { CityDetail } from "@/components/place/city-detail";

export default async function CityDetailPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;

  return <CityDetail cityId={cityId} />;
}
