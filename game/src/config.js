// Tunables for Port Solara: one place for the city grid, the light, and the palette.
export const CITY = {
  blocks: 3,          // blocks from the centre to each edge (7 x 7 blocks)
  block: 60,          // block side, metres
  step: 74,           // block + road
  roadHalf: 7,        // half the asphalt width
  walk: 5,            // sidewalk depth
  lane: 3.6,          // lane offset from the centre line
  edge: 259,          // outermost road centre line
  water: 340,
};

export const TIME = {
  start: 17 * 60 + 40, // in-game minutes, golden hour
  scale: 4,            // game minutes per real minute
};

export const PALETTE = {
  skyTop: 0x2a6fb0,
  skyMid: 0x8fc6e8,
  skyWarm: 0xffc98a,
  sun: 0xfff1cf,
  asphalt: 0x2b2f38,
  asphaltEdge: 0x3a3f4a,
  walk: 0xb9b3a6,
  curb: 0xd8d2c4,
  park: 0x5f9e57,
  sand: 0xe8d3a3,
  water: 0x2f7f9e,
  building: [0xd9c3a5, 0xe7d9c2, 0xbfae95, 0xc9d3d8, 0xe3c8b0, 0xb7c4c8],
  trim: 0x8d8577,
  glass: 0x87b6c9,
  palm: 0x3f7f42,
  palmTrunk: 0x8a6a4d,
  car: [0xd94a4a, 0x3f7fbf, 0xf2c14e, 0xe8e8e8, 0x2f3a44, 0x7bc4a4, 0xc85a9b, 0xf08a3c],
  police: 0x1c2740,
  gold: 0xffcc66,
};

export const PLAYER = {
  walk: 4.2,
  sprint: 7.6,
  height: 1.8,
  radius: 0.45,
  health: 100,
};

export const CAR = {
  maxSpeed: 30,
  accel: 13,
  brake: 22,
  reverse: 7,
  steer: 1.9,
  drag: 0.7,
  radius: 1.5,
};
