import { publicUrl } from "@/lib/client/base";
import { withNinjaItemFilters } from "@/lib/ninja/url";
import type { BuildCluster } from "@/lib/types";
import { youtubeBuildSearchUrl } from "@/lib/youtube";

function Favicon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={publicUrl(src)}
      alt={alt}
      width={16}
      height={16}
      className="size-4 rounded-sm"
    />
  );
}

export function BuildOutboundLinks({ cluster }: { cluster: BuildCluster }) {
  const ninja = withNinjaItemFilters(cluster.ninjaUrl, cluster.uniqueNames);
  const youtube = youtubeBuildSearchUrl({
    skill: cluster.mainSkill,
    className: cluster.ascendancy || cluster.className,
  });
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={ninja}
        target="_blank"
        rel="noreferrer"
        className="btn-outline h-9 gap-1.5 px-3 text-[0.7rem]"
      >
        <Favicon src="/icons/poe-ninja.png" alt="" />
        Ninja
      </a>
      <a
        href={youtube}
        target="_blank"
        rel="noreferrer"
        className="btn-outline h-9 gap-1.5 px-3 text-[0.7rem]"
      >
        <Favicon src="/icons/youtube.png" alt="" />
        YouTube
      </a>
    </div>
  );
}
