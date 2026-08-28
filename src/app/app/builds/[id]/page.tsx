import { BuildDetail } from "@/components/BuildDetail";
import { loadClusterIds } from "@/lib/static/clusters";

export function generateStaticParams() {
  return loadClusterIds().map((id) => ({ id }));
}

export const dynamicParams = false;

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuildDetail id={id} />;
}
