// All measurements are in FEET (real-world slow-pitch softball dimensions).
// World units in the three.js scene are 1:1 with feet, so everything drawn
// from these numbers is automatically to-scale relative to everything else,
// regardless of how the canvas/screen is sized (the camera fits the field).

export const FIELD = {
  // Distance between consecutive bases (a 65' square rotated 45deg).
  baseDistance: 65,
  // Distance from the back point of home plate to the pitching plate.
  pitchingDistance: 50,
  // Physical size of a base (15" square).
  baseSize: 15 / 12,
  // Home plate width (17" pentagon, approximated by its bounding size).
  homePlateWidth: 17 / 12,
  // Pitching plate size (24" x 6").
  pitchingPlateWidth: 24 / 12,
  pitchingPlateDepth: 6 / 12,
  // Outfield fence distance from home plate (symmetric arc).
  fenceDistance: 300,
  // Runner's lane (to first base): 3' wide, 30' long, starting 3' up the
  // baseline from home plate, offset into foul territory.
  laneWidth: 3,
  laneLength: 30,
  laneStart: 3,
  // Batter's boxes: 3' x 7'.
  batterBoxWidth: 3,
  batterBoxLength: 7,
  batterBoxGap: 0.5, // gap from plate centerline to inner edge of box
  // Catcher's box (approx).
  catcherBoxWidth: 7,
  catcherBoxDepth: 8,
  catcherBoxGap: 1,
  // Coaches boxes (approx).
  coachBoxWidth: 3,
  coachBoxLength: 10,
  coachBoxOffset: 6, // distance outside the baseline
  // Pitcher's circle radius around the pitching plate.
  pitchersCircleRadius: 8,
  // Infield dirt "skin" - a diamond centered on home plate, sized to
  // comfortably enclose all bases and the pitcher's circle.
  infieldSkinHalfDiagonal: 95,
};

// Convenience: sqrt(2)/2 used repeatedly for 45 degree diamond geometry.
const R2 = Math.SQRT1_2;

// Base positions, with home plate fixed at the origin (0,0) and second
// base straight out toward center field along +Y.
export const BASES = {
  home: { x: 0, y: 0 },
  first: { x: FIELD.baseDistance * R2, y: FIELD.baseDistance * R2 },
  second: { x: 0, y: FIELD.baseDistance * Math.SQRT2 },
  third: { x: -FIELD.baseDistance * R2, y: FIELD.baseDistance * R2 },
};

export const PITCHING_PLATE = { x: 0, y: FIELD.pitchingDistance };

// Order that a runner advances through bases.
export const BASE_ORDER = ['first', 'second', 'third', 'home'];

// Default fielding positions (feet from home plate, +Y toward center
// field). These are sensible defaults for a 10-player slow-pitch lineup
// and are all adjustable by the user before a play begins.
export const DEFAULT_POSITIONS = {
  P: { x: 0, y: FIELD.pitchingDistance },
  C: { x: 0, y: -3 },
  '1B': { x: 34, y: 40 },
  '2B': { x: 15, y: 70 },
  '3B': { x: -34, y: 40 },
  SS: { x: -15, y: 70 },
  LF: { x: -70, y: 175 },
  LC: { x: -35, y: 210 },
  RC: { x: 35, y: 210 },
  RF: { x: 70, y: 175 },
  CF: { x: 0, y: 220 },
  SF: { x: 0, y: 150 }, // short fielder (5th infielder, common in slow-pitch)
};

export const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'CF', 'RC', 'RF', 'SF'];

// Positions considered "outfield" for the purposes of the scenario editor's
// adjustable starting-position step (infielders are close enough to their
// bases that they are treated the same way, all fielders are adjustable).
export const OUTFIELD_POSITIONS = ['LF', 'LC', 'CF', 'RC', 'RF', 'SF'];
export const INFIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS'];
