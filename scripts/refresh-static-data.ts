import { NINJA_MODES, type NinjaMode } from "../src/lib/leagues/modes";
import { getFarmWikiIndex } from "../src/lib/farm/wiki";
import { getUniqueIconMap } from "../src/lib/icons/uniques";
import { getNinjaCache } from "../src/lib/ninja/cache";

const REQUIRED_LIVE: NinjaMode[] = ["allflame"];

async function main() {
  const live: NinjaMode[] = [];
  for (const mode of NINJA_MODES) {
    console.log(`refresh: poe.ninja ${mode} clusters…`);
    const ninja = await getNinjaCache(mode, true);
    console.log(
      `refresh: ${mode} → ${ninja.source} ${ninja.clusters.length} ${ninja.gggLeague} clusters`,
    );
    if (REQUIRED_LIVE.includes(mode)) {
      if (ninja.source !== "ninja" || ninja.clusters.length < 20) {
        throw new Error(
          `ninja ${mode} refresh produced ${ninja.source} with ${ninja.clusters.length} clusters`,
        );
      }
    }
    if (ninja.source === "ninja") live.push(mode);
  }
  if (live.length === 0) {
    throw new Error("ninja refresh produced no live league caches");
  }

  console.log("refresh: unique icons…");
  const icons = await getUniqueIconMap();
  const iconCount = Object.keys(icons).length;
  if (iconCount < 100) {
    throw new Error(`icon refresh produced ${iconCount} URLs`);
  }
  console.log(`refresh: ${iconCount} unique icons`);

  console.log("refresh: farm wiki…");
  const farm = await getFarmWikiIndex();
  const farmCount = Object.keys(farm.uniques).length;
  console.log(`refresh: ${farmCount} farm unique rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
