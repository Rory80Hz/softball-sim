// Player attributes are all expressed on a friendly 1-100 scale in the UI.
// src/sim/physics.js converts them into real-world units (ft/s, feet, etc).
export const DEFAULT_ATTRIBUTES = {
  speed: 55,
  throwSpeed: 55,
  throwAccuracy: 55,
  armStrength: 55,
  catchAccuracy: 55,
  battingContact: 55,
  battingPower: 55,
};

let idCounter = 1;
export function nextId(prefix = 'p') {
  return `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;
}

export function createPlayer({ name = 'New Player', position = 'CF', battingOrder = 1, number = battingOrder, attributes = {} } = {}) {
  return {
    id: nextId('player'),
    name,
    position,
    battingOrder,
    number,
    attributes: { ...DEFAULT_ATTRIBUTES, ...attributes },
  };
}

export function clampAttribute(v) {
  return Math.max(1, Math.min(100, Math.round(Number(v) || 0)));
}
