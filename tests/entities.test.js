import { describe, expect, it, vi } from 'vitest';
import { Fielder } from '../src/sim/Fielder.js';
import { Runner } from '../src/sim/Runner.js';
import { BASES } from '../src/constants.js';
import { createScene } from './helpers.js';

function player(attributes = {}) {
  return { number: 7, attributes: { speed: 100, ...attributes } };
}

describe('Runner', () => {
  it('derives movement speed from the player attribute', () => {
    const runner = new Runner(createScene(), player({ speed: 50 }));
    expect(runner.moveSpeed).toBe(15);
  });

  it('follows a path and emits a base-reached callback', () => {
    const runner = new Runner(createScene(), player());
    const onBaseReached = vi.fn();
    runner.onBaseReached = onBaseReached;
    runner.setPosition(BASES.home.x, BASES.home.y);
    runner.runPath([BASES.first]);

    runner.update(4);
    runner.update(0.1);

    expect(runner.pos).toEqual(BASES.first);
    expect(runner.currentBase).toBe('first');
    expect(runner.lastSafePosition).toEqual(BASES.first);
    expect(runner.passedBases.has('first')).toBe(true);
    expect(onBaseReached).toHaveBeenCalledWith(runner, 'first');
  });

  it('scores exactly once on reaching home', () => {
    const runner = new Runner(createScene(), player());
    const onScore = vi.fn();
    runner.onScore = onScore;
    runner.setPosition(BASES.third.x, BASES.third.y);
    runner.runPath([BASES.home]);

    runner.update(4);
    runner.update(1);

    expect(runner.hasScored).toBe(true);
    expect(runner.status).toBe('scored');
    expect(runner.active).toBe(false);
    expect(onScore).toHaveBeenCalledOnce();
  });

  it('returns to the last safe position and stops after an out', () => {
    const runner = new Runner(createScene(), player());
    runner.setPosition(BASES.first.x, BASES.first.y);
    runner.runPath([BASES.second]);
    runner.returnToBase();
    expect(runner.targetPos).toEqual(BASES.first);

    const onOut = vi.fn();
    runner.onOut = onOut;
    runner.markOut();

    expect(runner.isOut).toBe(true);
    expect(runner.active).toBe(false);
    expect(runner.targetPos).toBeNull();
    expect(onOut).toHaveBeenCalledOnce();
  });

  it('recognizes passed bases from state and target', () => {
    const runner = new Runner(createScene(), player());
    runner.setPosition(BASES.first.x, BASES.first.y);
    runner.runPath([BASES.second]);

    expect(runner.hasPassedBase('first')).toBe(true);
    expect(runner.hasPassedBase('second')).toBe(false);
    expect(runner.hasPassedBase('third')).toBe(false);
  });
});

describe('Fielder', () => {
  it('moves at a speed derived from the player attribute', () => {
    const fielder = new Fielder(createScene(), 'CF', player({ speed: 0 }));
    expect(fielder.moveSpeed).toBe(10.1);
  });

  it('moves toward a target without overshooting', () => {
    const fielder = new Fielder(createScene(), 'SS', player());
    fielder.setPosition(0, 0);
    fielder.moveTo(10, 0);
    fielder.update(0.25);
    expect(fielder.pos.x).toBeCloseTo(5);
    fielder.update(1);
    fielder.update(0.1);
    expect(fielder.pos).toEqual({ x: 10, y: 0 });
    expect(fielder.targetPos).toBeNull();
  });

  it('does not move with the ball unless explicitly allowed', () => {
    const fielder = new Fielder(createScene(), 'P', player());
    fielder.setPosition(0, 0);
    fielder.hasBall = true;
    fielder.moveTo(20, 0);
    fielder.update(1);
    expect(fielder.pos).toEqual({ x: 0, y: 0 });

    fielder.moveTo(20, 0, true);
    fielder.update(1);
    expect(fielder.pos.x).toBe(20);
  });
});
