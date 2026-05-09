import { WrappedExperience } from "@/components/wrapped/wrapped-experience";

export default async function WrappedPage({
  params,
  searchParams
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ seed?: string }>;
}) {
  const { memberId } = await params;
  const { seed } = await searchParams;
  const seedNumber = seed ? Number.parseInt(seed, 10) : undefined;

  return <WrappedExperience memberId={memberId} seed={Number.isFinite(seedNumber) ? seedNumber : undefined} />;
}
