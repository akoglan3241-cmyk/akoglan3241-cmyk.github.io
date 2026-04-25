export const AVATAR_CATEGORIES = [
  {
    key: "hair",
    label: "Sac",
    options: [
      { id: "short", label: "Kisa" },
      { id: "spiky", label: "Dik" },
      { id: "bob", label: "Bob" },
      { id: "soft-wave", label: "Dalga" },
      { id: "short-bob", label: "Kisa Bob" },
    ],
  },
  {
    key: "top",
    label: "Ust",
    options: [
      { id: "blue", label: "Mavi" },
      { id: "green", label: "Yesil" },
      { id: "red", label: "Kirmizi" },
      { id: "striped-sweater", label: "Cizgili Kazak" },
      { id: "cafe-apron", label: "Kafe Onlugu" },
    ],
  },
  {
    key: "bottom",
    label: "Alt",
    options: [
      { id: "navy", label: "Lacivert" },
      { id: "brown", label: "Kahve" },
      { id: "black", label: "Siyah" },
      { id: "denim-shorts", label: "Denim Sort" },
      { id: "soft-skirt", label: "Yumusak Etek" },
    ],
  },
  {
    key: "accessory",
    label: "Aksesuar",
    options: [
      { id: "none", label: "Yok" },
      { id: "glasses", label: "Gozluk" },
      { id: "flower", label: "Cicek" },
      { id: "straw-hat", label: "Hasir Sapka" },
      { id: "mini-backpack", label: "Mini Canta" },
    ],
  },
];

export const AVATAR_OPTIONS = Object.fromEntries(
  AVATAR_CATEGORIES.map((category) => [category.key, category.options.map((option) => option.id)]),
);

export const DEFAULT_APPEARANCE = {
  hair: AVATAR_OPTIONS.hair[0],
  top: AVATAR_OPTIONS.top[0],
  bottom: AVATAR_OPTIONS.bottom[0],
  accessory: AVATAR_OPTIONS.accessory[0],
};

export function normalizeAppearance(rawAppearance = {}) {
  return {
    hair: AVATAR_OPTIONS.hair.includes(rawAppearance?.hair) ? rawAppearance.hair : DEFAULT_APPEARANCE.hair,
    top: AVATAR_OPTIONS.top.includes(rawAppearance?.top) ? rawAppearance.top : DEFAULT_APPEARANCE.top,
    bottom: AVATAR_OPTIONS.bottom.includes(rawAppearance?.bottom) ? rawAppearance.bottom : DEFAULT_APPEARANCE.bottom,
    accessory: AVATAR_OPTIONS.accessory.includes(rawAppearance?.accessory) ? rawAppearance.accessory : DEFAULT_APPEARANCE.accessory,
  };
}

export function cycleAppearanceOption(appearance, key, direction = 1) {
  const values = AVATAR_OPTIONS[key];
  const currentIndex = values.indexOf(appearance[key]);
  const nextIndex = (currentIndex + direction + values.length) % values.length;

  return {
    ...appearance,
    [key]: values[nextIndex],
  };
}

export function getAppearanceOptions(key) {
  return AVATAR_CATEGORIES.find((entry) => entry.key === key)?.options ?? [];
}

export function getRandomAppearance() {
  return normalizeAppearance(
    Object.fromEntries(
      AVATAR_CATEGORIES.map((category) => {
        const choice = category.options[Math.floor(Math.random() * category.options.length)];
        return [category.key, choice?.id];
      }),
    ),
  );
}

export function getAppearanceLabel(key, value) {
  const category = AVATAR_CATEGORIES.find((entry) => entry.key === key);
  const option = category?.options.find((entry) => entry.id === value);
  return option?.label ?? value;
}
