import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ball } from '../src/sim/Ball.js';
import { createScene } from './helpers.js';

afterEach(() => vi.restoreAllMocks());

describe('Ball', () => {
  it.each(['grounder', 'line_drive', 'blooper', 'flyball', 'pop_up'])('creates a %s trajectory', hitType => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ball = new Ball(createScene());

    ball.hit(30, 80, hitType, { battingContact: 100, battingPower: 100 });

    expect(ball.mode).toBe('hit');
    expect(ball.active).toBe(true);
    expect(ball.mesh.visible).toBe(true);
    expect(Number.isFinite(ball.velocity.x)).toBe(true);
    expect(Number.isFinite(ball.velocity.y)).toBe(true);
    expect(ball.hasLanded).toBe(hitType === 'grounder');
  });

  it('uses power for grounder speed and contact for variance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ball = new Ball(createScene());
    ball.hit(100, 0, 'grounder', { battingPower: 100, battingContact: 100 });

    expect(Math.hypot(ball.velocity.x, ball.velocity.y)).toBeCloseTo(80);
    expect(ball.pos.z).toBe(0.5);
  });

  it('slows a grounded loose ball with friction', () => {
    const ball = new Ball(createScene());
    ball.releaseAt({ x: 0, y: 0 });
    ball.velocity = { x: 35, y: 0, z: 0 };

    ball.update(0.5);

    expect(ball.velocity.x).toBeCloseTo(17.5);
    expect(ball.mode).toBe('loose');
  });

  it('sheds most forward speed when a fly ball lands, so it does not roll far', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ball = new Ball(createScene());
    ball.hit(0, 200, 'flyball', { battingPower: 55, battingContact: 100 });
    let landingSpeed = null;
    for (let i = 0; i < 2000 && ball.active; i++) {
      const before = ball.hasLanded;
      ball.update(0.01);
      if (!before && ball.hasLanded) landingSpeed = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (ball.hasLanded && Math.hypot(ball.velocity.x, ball.velocity.y) === 0) break;
    }
    expect(landingSpeed).toBeLessThan(25);
    expect(ball.pos.y).toBeLessThan(215);
    vi.restoreAllMocks();
  });

  it('transfers possession and releases a loose ball', () => {
    const scene = createScene();
    const ball = new Ball(scene);
    const fielder = { pos: { x: 4, y: 5 } };

    ball.setCarrier(fielder);
    expect(ball).toMatchObject({ mode: 'held', active: false, carrier: fielder });
    ball.releaseAt({ x: 8, y: 9 });
    expect(ball).toMatchObject({ mode: 'loose', active: true, carrier: null });
    expect(ball.pos).toEqual({ x: 8, y: 9, z: 0.5 });
  });

  it('completes finite throws and invokes the callback', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ball = new Ball(createScene());
    const callback = vi.fn();
    ball.onThrowComplete = callback;

    ball.throwTo({ x: 0, y: 0 }, { x: 20, y: 0 }, 100, 100, Infinity, 7);
    ball.update(2);

    expect(ball.mode).toBe('idle');
    expect(ball.active).toBe(false);
    expect(callback).toHaveBeenCalledOnce();
    expect(ball.pos).toMatchObject({ x: 20, y: 0, z: 4 });
  });

  it('limits a throw to arm range and marks it missed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ball = new Ball(createScene());

    ball.throwTo({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 100, 40);

    expect(ball.throwMissed).toBe(true);
    expect(ball.throwTarget.x).toBeCloseTo(40);
  });
});
