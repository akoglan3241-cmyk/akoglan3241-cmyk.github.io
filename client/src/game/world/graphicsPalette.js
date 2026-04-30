export const GRAPHICS_PALETTE = {
  grass: [0x6cae72, 0x639f68, 0x79bb7d],
  road: [0xc9ae79, 0xbea06d, 0xd4b987],
  asphalt: [0x727a82, 0x69727a, 0x7c858d],
  sidewalk: [0xe3ddd1, 0xd8d2c6, 0xede7dc],
  sand: [0xe7d29f, 0xddc48d, 0xf0ddb2],
  ui: {
    ink: 0x173449,
    cream: 0xfff4db,
    gold: 0xffd99d,
    sky: 0x7fc6ff,
  },
  atmosphere: {
    cloudNear: 0xf8fbff,
    cloudFar: 0xe7f4ff,
    treeline: 0x385c47,
    birds: 0x274150,
  },
};

export function pickPaletteVariant(values, seed) {
  return values[Math.abs(Number(seed ?? 0)) % values.length];
}
