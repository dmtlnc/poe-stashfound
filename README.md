# Stashfound

PoE1 SSF unique-to-build matcher. Import unique names from [PoE Ladder](https://poeladder.com/uniques) (or log in with Path of Exile), then rank **current Allflame** poe.ninja builds (trade league, larger sample) by unique-name overlap. Missing uniques get farm notes — cards, bosses, or Genesis Tree — not trade whispers.

Right now that ninja league is **Allflame**; your stash is still treated as SSF.

## Run it

Needs Node 20+.

```bash
cp .env.example .env.local
# set SESSION_SECRET to 32+ random characters
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a PoE Ladder account (`name-1234` or `name#1234`), paste a Uniques URL, or click **Try the demo stash**. Demo mode does not need GGG credentials.

## Import uniques (PoE Ladder)

GGG is not accepting new OAuth apps, so the practical path is:

1. Enter your PoE Ladder account tag (`dikfaec-0919` or `dikfaec#0919`), or paste your [Uniques page](https://poeladder.com/uniques) URL.
2. CSV export and a pasted name list still work.

## Farm notes

Missing uniques use [List of divination cards](https://www.poewiki.net/wiki/List_of_divination_cards) and [Analysis of unique item tiers](https://www.poewiki.net/wiki/Guide:Analysis_of_unique_item_tiers). If a card rewards that unique, collect the card. Otherwise, non-boss uniques go through the [Genesis Tree](https://www.poewiki.net/wiki/Genesis_Tree) (Ancient Wombgifts). Boss/restricted uniques stay as encounter farms.

## Path of Exile login

1. Register a **confidential web application** at [GGG developer docs](https://www.pathofexile.com/developer/docs) (currently they may not process new apps).
2. Redirect URI: `http://localhost:3000/api/auth/callback`
3. Scopes: `account:profile`, `account:leagues`, `account:characters`, `account:stashes`
4. Put `GGG_CLIENT_ID`, `GGG_CLIENT_SECRET`, and `GGG_CONTACT` in `.env.local`

## Matching

v1 matches **unique names only** (70% default, slider 60–100%). Unique maps are ignored. Items like Watcher's Eye, Forbidden Flesh/Flame, cluster jewels, and timeless jewels show a warning: owning the name is not the same as owning the right roll.

poe.ninja's current build search is protobuf, not the old JSON overview. This app detects the latest **trade** challenge league from ninja's index (Allflame, not SSF), fetches skill-filtered snapshots **once on the server**, caches them for 8 hours, and never calls ninja from the browser. If ninja is unreachable, a bundled fallback snapshot is used.
