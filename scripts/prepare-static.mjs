import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const destDir = path.join(root, "public", "data");
const ninjaDestDir = path.join(destDir, "ninja");
mkdirSync(destDir, { recursive: true });
mkdirSync(ninjaDestDir, { recursive: true });

const NINJA_MODES = ["standard", "allflame", "allflamehc"];

function writeJson(dest, value) {
  writeFileSync(dest, JSON.stringify(value));
}

function emptyNinja(mode) {
  const names = {
    standard: "Standard",
    allflame: "Allflame",
    allflamehc: "Hardcore Allflame",
  };
  return {
    source: mode === "allflame" ? "fallback" : "unavailable",
    ninjaMode: mode,
    gggLeague: names[mode],
    ninjaOverview: mode === "allflamehc" ? "hardcore-allflame" : mode,
    ninjaUrlSlug: mode,
    fetchedAt: new Date().toISOString(),
    clusters: [],
  };
}

const fallback = JSON.parse(
  readFileSync(path.join(root, "src", "data", "ninja-fallback.json"), "utf8"),
);

for (const mode of NINJA_MODES) {
  const dest = path.join(ninjaDestDir, `${mode}.json`);
  const src = path.join(root, "data", "cache", `ninja-${mode}.json`);
  const legacy = path.join(root, "data", "cache", "ninja-ssf.json");
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`static: ninja/${mode}.json from live cache`);
  } else if (mode === "allflame" && existsSync(legacy)) {
    copyFileSync(legacy, dest);
    console.log("static: ninja/allflame.json from legacy ninja-ssf.json");
  } else if (mode === "allflame") {
    writeJson(dest, {
      ...emptyNinja(mode),
      source: "fallback",
      clusters: fallback.clusters ?? [],
    });
    console.log("static: ninja/allflame.json from bundled fallback");
  } else {
    writeJson(dest, emptyNinja(mode));
    console.log(`static: ninja/${mode}.json empty`);
  }
}

copyFileSync(path.join(ninjaDestDir, "allflame.json"), path.join(destDir, "ninja.json"));
console.log("static: ninja.json copy of allflame");

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
