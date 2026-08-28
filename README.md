# Stashfound

PoE1 SSF unique-to-build matcher. Import unique names from [PoE Ladder](https://poeladder.com/uniques), then rank **current Allflame** poe.ninja builds by unique-name overlap. Missing uniques get farm notes — cards, bosses, or Genesis Tree — not trade whispers.

Your stash is treated as SSF.

## Run it

Needs Node 20+.

```bash
cp .env.example .env.local
npm install
npm run dev
```

In another terminal, for live PoE Ladder lookup:

```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000). Enter a PoE Ladder account (`name-1234` or `name#1234`), paste a Uniques URL, upload a CSV, or click **Try the demo stash**.

## Import uniques

1. Enter your PoE Ladder account tag (`name-1234` or `name#1234`), or paste your [Uniques page](https://poeladder.com/uniques) URL (needs the Worker).
2. CSV export and a pasted name list stay in the browser and work without the Worker.

## Farm notes

Missing uniques use [List of divination cards](https://www.poewiki.net/wiki/List_of_divination_cards) and [Analysis of unique item tiers](https://www.poewiki.net/wiki/Guide:Analysis_of_unique_item_tiers). If a card rewards that unique, collect the card. Otherwise, non-boss uniques go through the [Genesis Tree](https://www.poewiki.net/wiki/Genesis_Tree) (Ancient Wombgifts). Boss/restricted uniques stay as encounter farms.

## Matching

v1 matches **unique names only** (70% default, slider 60–100%). Unique maps are ignored. Items like Watcher's Eye, Forbidden Flesh/Flame, cluster jewels, and timeless jewels show a warning: owning the name is not the same as owning the right roll.

Allflame poe.ninja builds ship as static JSON and refresh when the site is rebuilt.

## Cloudflare

Workers & Pages project **poe-stashfound** (Git connected):

1. Set **Build command** to `npm run build:static` (or leave it empty — `wrangler.toml` runs that before deploy).
2. Leave **Deploy command** as `npx wrangler deploy`.
3. Do **not** set `NEXT_PUBLIC_BASE_PATH` on Cloudflare (the `*.workers.dev` URL is at the site root).
4. Live Ladder import is `POST /import` on the same host.

