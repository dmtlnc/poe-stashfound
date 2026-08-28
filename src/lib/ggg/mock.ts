import type { GggCharacter, GggItem, GggStashTab } from "../types";

const icon =
  "https://web.poecdn.com/image/Art/2DItems/Armours/Helmets/Goldrim.png";

function u(
  name: string,
  baseType: string,
  extra?: Partial<GggItem>,
): GggItem {
  return {
    name,
    typeLine: baseType,
    baseType,
    rarity: "Unique",
    frameType: 3,
    identified: true,
    icon,
    ...extra,
  };
}

export const MOCK_LEAGUE = "SSF Allflame";
export const MOCK_NINJA_OVERVIEW = "allflame";
export const MOCK_ACCOUNT = "SSFExile";

export const MOCK_CHARACTERS: GggCharacter[] = [
  {
    name: "FoundDeadeye",
    class: "Deadeye",
    league: MOCK_LEAGUE,
    level: 94,
    equipment: [
      u("Windripper", "Imperial Bow"),
      u("Asenath's Gentle Touch", "Silk Gloves"),
      u("Thunderfist", "Murder Mitts"),
      u("Goldwyrm", "Nubuck Boots"),
      u("Dying Sun", "Ruby Flask"),
      u("Inspired Learning", "Crimson Jewel"),
    ],
    inventory: [u("Goldrim", "Leather Cap")],
    jewels: [u("Lioneye's Fall", "Viridian Jewel")],
  },
  {
    name: "FoundChieftain",
    class: "Chieftain",
    league: MOCK_LEAGUE,
    level: 91,
    equipment: [
      u("Immortal Flesh", "Leather Belt"),
      u("Cloak of Flame", "Scholar's Robe"),
      u("Rise of the Phoenix", "Majestic Plate"),
      u("Dawnbreaker", "Colossal Tower Shield"),
      u("Nebulis", "Void Sceptre"),
      u("Kikazaru", "Topaz Ring"),
      u("Cinderswallow Urn", "Silver Flask"),
    ],
  },
];

export const MOCK_STASH_TABS: GggStashTab[] = [
  { id: "aaaaaaaaaa", name: "Uniques", children: [] },
  { id: "bbbbbbbbbb", name: "Dump", children: [] },
];

export const MOCK_STASH_ITEMS: Record<string, GggItem[]> = {
  aaaaaaaaaa: [
    u("The Iron Fortress", "Crusader Plate"),
    u("The Bringer of Rain", "Nightmare Bascinet"),
    u("Lion's Roar", "Granite Flask"),
    u("Bloodgrip", "Marble Amulet"),
    u("Tabula Rasa", "Simple Robe"),
    u("Wanderlust", "Wool Shoes"),
    u("Praxis", "Paua Ring"),
    u("Karui Ward", "Jade Amulet"),
    u("Shavronne's Wrappings", "Occultist's Vestment"),
    u("Presence of Chayula", "Onyx Amulet"),
    u("Headhunter", "Leather Belt"),
    u("Mageblood", "Heavy Belt"),
    u("Mystic Refractor", "Prismatic Jewel"),
    u("The Taming", "Prismatic Ring"),
    u("The Light of Meaning", "Prismatic Jewel"),
    u("Eye of Malice", "Callous Mask"),
    u("Foulborn Tulborn", "Opal Sceptre"),
    u("Malachai's Loop", "Moonstone Ring"),
    u("Rumi's Concoction", "Granite Flask"),
    u("Bottled Faith", "Sulphur Flask"),
    u("Progenesis", "Diamond Flask"),
    u("Aegis Aurora", "Champion Kite Shield"),
    u("The Covenant", "Spidersilk Robe"),
    u("Heartbound Loop", "Moonstone Ring"),
    u("Quill Rain", "Short Bow"),
    u("Starforge", "Infernal Sword"),
    u("Atziri's Disfavour", "Vaal Axe"),
    u("Defiance of Destiny", "Paua Amulet"),
    u("Ralakesh's Impatience", "Riveted Boots"),
    u("The Ivory Tower", "Antique Gauntlets"),
    u("Original Sin", "Amethyst Ring"),
    u("Svalinn", "Girded Tower Shield"),
    u("Mahuxotl's Machination", "Steel Kite Shield"),
  ],
  bbbbbbbbbb: [
    u("Lifesprig", "Driftwood Wand"),
    u("Lochtonial Caress", "Iron Gauntlets"),
    u("Dream Fragments", "Sapphire Ring"),
    u("The Baron", "Close Helmet"),
    u("Chin Sol", "Maraketh Bow"),
    u("Voltaxic Rift", "Spine Bow"),
    u("Callinellus Malleus", "Auric Mace"),
    u("Capricious", "Opal Sceptre"),
  ],
};
