import { vi } from 'vitest';

export function createScene() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
  };
}

export function expectPointClose(actual, expected) {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
}