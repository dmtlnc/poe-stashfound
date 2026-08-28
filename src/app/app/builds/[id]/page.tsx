import { BuildDetail } from "@/components/BuildDetail";
import { loadClusterIds } from "@/lib/static/clusters";

export function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== "1") return [];
  return loadClusterIds().map((id) => ({ id }));
}

export const dynamicParams = true;

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuildDetail id={id} />;
}
