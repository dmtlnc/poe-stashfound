import { getFarmWikiIndex } from "../src/lib/farm/wiki";
import { getUniqueIconMap } from "../src/lib/icons/uniques";
import { getNinjaCache } from "../src/lib/ninja/cache";

async function main() {
  console.log("refresh: poe.ninja clusters…");
  const ninja = await getNinjaCache(true);
  if (ninja.source !== "ninja" || ninja.clusters.length < 20) {
    throw new Error(
      `ninja refresh produced ${ninja.source} with ${ninja.clusters.length} clusters`,
    );
  }
  console.log(`refresh: ${ninja.clusters.length} ${ninja.gggLeague} clusters`);

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
