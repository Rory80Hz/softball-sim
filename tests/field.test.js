import { describe, expect, it } from 'vitest';
import { BASES, FIELD } from '../src/constants.js';
import { buildField, fieldPosFromWorld, toWorld } from '../src/field/Field.js';

 describe('field coordinates and geometry', () => {
  it('maps field coordinates to and from world coordinates', () => {
    const world = toWorld(12, 34, 5);

    expect(world).toMatchObject({ x: 12, y: 5, z: -34 });
    expect(fieldPosFromWorld(world)).toEqual({ x: 12, y: 34 });
  });

  it('defines a correctly scaled base diamond', () => {
    expect(Math.hypot(BASES.first.x, BASES.first.y)).toBeCloseTo(FIELD.baseDistance);
    expect(Math.hypot(BASES.third.x, BASES.third.y)).toBeCloseTo(FIELD.baseDistance);
    expect(BASES.home).toEqual({ x: 0, y: 0 });
    expect(BASES.second.x).toBe(0);
    expect(BASES.second.y).toBeCloseTo(FIELD.baseDistance * Math.SQRT2);
  });

  it('builds a non-empty field group within supplied bounds', () => {
    const field = buildField({ minX: -360, maxX: 360, minY: -60, maxY: 360 });

    expect(field.name).toBe('field');
    expect(field.children.length).toBeGreaterThan(10);
  });
});
