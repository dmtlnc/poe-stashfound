import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const destDir = path.join(root, "public", "data");
mkdirSync(destDir, { recursive: true });

function writeJson(dest, value) {
  writeFileSync(dest, JSON.stringify(value));
}

const ninjaSrc = path.join(root, "data", "cache", "ninja-ssf.json");
const ninjaDest = path.join(destDir, "ninja.json");
if (existsSync(ninjaSrc)) {
  copyFileSync(ninjaSrc, ninjaDest);
  console.log("static: ninja.json from live cache");
} else {
  const fallback = JSON.parse(
    readFileSync(path.join(root, "src", "data", "ninja-fallback.json"), "utf8"),
  );
  writeJson(ninjaDest, {
    source: "fallback",
    gggLeague: "SSF Allflame",
    ninjaOverview: "allflame",
    fetchedAt: new Date().toISOString(),
    clusters: fallback.clusters ?? [],
  });
  console.log("static: ninja.json from bundled fallback");
}

const iconsSrc = path.join(root, "data", "cache", "unique-icons.json");
const iconsDest = path.join(destDir, "icons.json");
if (existsSync(iconsSrc)) {
  copyFileSync(iconsSrc, iconsDest);
  console.log("static: icons.json from live cache");
} else {
  writeJson(iconsDest, { icons: {} });
  console.log("static: icons.json empty");
}

const farmSrc = path.join(root, "data", "cache", "farm-wiki.json");
const farmDest = path.join(destDir, "farm-wiki.json");
if (existsSync(farmSrc)) {
  copyFileSync(farmSrc, farmDest);
  console.log("static: farm-wiki.json from live cache");
} else {
  writeJson(farmDest, {
    fetchedAt: new Date().toISOString(),
    uniques: {},
    cardsByUnique: {},
    restricted: {},
  });
  console.log("static: farm-wiki.json empty");
}
