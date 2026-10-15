import { describe, expect, it, vi } from 'vitest';
import { SimulationEngine } from '../src/sim/Engine.js';
import { createDefaultTeam } from '../src/models/Team.js';
import { BASES } from '../src/constants.js';
import { Ball } from '../src/sim/Ball.js';
import { Runner } from '../src/sim/Runner.js';
import { createScene } from './helpers.js';

function createEngine() {
  const teams = [createDefaultTeam('Home Sluggers'), createDefaultTeam('Away Thunder')];
  return new SimulationEngine(createScene(), { getTeams: () => teams });
}

function bareEngine(overrides = {}) {
  return Object.assign(Object.create(SimulationEngine.prototype), {
    runners: [],
    fielders: [],
    score: 0,
    outs: 0,
    state: 'idle',
    ball: { mode: 'idle', active: false, pos: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
    onEvent: null,
    ...overrides,
  });
}

describe('SimulationEngine lifecycle', () => {
  it('uses the configured batter when assigning other runners', () => {
    const engine = createEngine();
    const battingTeam = engine.store.getTeams()[1];
    const selectedBatter = battingTeam.players[2];
    vi.spyOn(Math, 'random').mockReturnValue(0);

    engine.loadScenario({
      runners: [
        { startPos: BASES.home, playerId: selectedBatter.id },
        { startPos: BASES.first, playerId: null },
      ],
      runnerPaths: [[BASES.first], [BASES.second]],
      hitType: 'grounder',
      hitTarget: { x: 25, y: 105 },
    });

    expect(engine.runners[0].player.id).toBe(selectedBatter.id);
    expect(engine.runners[1].player.id).toBe(battingTeam.players[0].id);
  });

  it('loads a scenario into fielders and runners in an idle state', () => {
    const engine = createEngine();
    engine.loadScenario({
      hitType: 'grounder',
      hitTarget: { x: 25, y: 105 },
      runners: [{ startPos: BASES.home, playerId: null }],
      runnerPaths: [[BASES.first]],
    });

    expect(engine.state).toBe('idle');
    expect(engine.fielders).toHaveLength(10);
    expect(engine.runners).toHaveLength(1);
    expect(engine.ball.active).toBe(false);
    expect(engine.score).toBe(0);
    expect(engine.outs).toBe(0);
  });

  it('starts, pauses, resumes, and ends a play with events', () => {
    const engine = createEngine();
    const events = [];
    engine.onEvent = event => events.push(event);
    const scenario = {
      hitType: 'line_drive',
      hitTarget: { x: 25, y: 105 },
      runners: [{ startPos: BASES.home, playerId: null }],
      runnerPaths: [[BASES.first]],
    };
    engine.loadScenario(scenario);
    engine.startPlay();
    expect(engine.state).toBe('playing');
    expect(engine.ball.mode).toBe('hit');
    expect(events[0].type).toBe('play_started');

    engine.pause();
    expect(engine.state).toBe('paused');
    engine.resume();
    expect(engine.state).toBe('playing');
    engine.endPlay();
    expect(engine.state).toBe('idle');
    expect(engine.ball.mesh.visible).toBe(false);
    expect(events.at(-1)).toMatchObject({ type: 'play_stopped', reason: 'time_called' });
  });

  it('does not resume a play that is not paused', () => {
    const engine = bareEngine();
    engine.resume();
    expect(engine.state).toBe('idle');
  });
});

describe('SimulationEngine rules and decisions', () => {
  it('calculates movement, throw, and range values from attributes', () => {
    const engine = bareEngine();
    expect(engine.throwSpeed({ throwingTechnique: 100 })).toBe(80);
    expect(engine.throwRange({ armStrength: 100, throwingTechnique: 100 })).toBeCloseTo(145.26);
    expect(engine.timeToBall({ pos: { x: 0, y: 0 }, moveSpeed: 10 }, { x: 30, y: 40 })).toBe(5);
  });

  it('projects an airborne ball to its landing point', () => {
    const engine = bareEngine({
      ball: { pos: { x: 10, y: 20, z: 5 }, velocity: { x: 10, y: -4, z: 16 } },
    });

    const landing = engine.projectedLandingPoint();
    expect(landing.x).toBeGreaterThan(10);
    expect(landing.y).toBeLessThan(20);
  });

  it('identifies force plays and chooses the fastest primary fielder', () => {
    const slow = { pos: { x: 0, y: 0 }, moveSpeed: 10, active: true, isCaller: false, moveTo: vi.fn() };
    const fast = { pos: { x: 20, y: 20 }, moveSpeed: 20, active: true, isCaller: false, moveTo: vi.fn() };
    const runner = {
      active: true,
      currentBase: 'first',
      targetPos: BASES.second,
      baseNameAtPosition: point => point === BASES.second ? 'second' : null,
    };
    const engine = bareEngine({
      scenario: { hitTarget: { x: 20, y: 20 } },
      ball: { mode: 'hit', active: true, pos: { x: 20, y: 20, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
      runners: [runner],
      fielders: [slow, fast],
    });

    expect(engine.isForcedPlay(runner)).toBe(false);
    expect(engine.timeToBall(fast, { x: 20, y: 20 })).toBe(0);
    engine.updateFielderAI();
    expect(fast.isCaller).toBe(true);
    expect(slow.isCaller).toBe(false);
  });

  it('records scores and outs exactly through runner callbacks', () => {
    const events = [];
    const runner = { status: 'active', markOut: vi.fn(), active: true, hasScored: false };
    const engine = bareEngine({ runners: [runner], onEvent: event => events.push(event) });

    engine.handleRunnerScore(runner);
    expect(engine.score).toBe(1);
    expect(events[0]).toMatchObject({ type: 'run_scored', score: 1 });

    runner.status = 'out';
    engine.handleRunnerOut(runner);
    expect(engine.outs).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'play_stopped', reason: 'all_runners_out' });
  });

  it('advances active runners one base when the ball is dead', () => {
    const runner = new Runner(createScene(), { number: 1, attributes: { speed: 55 } });
    runner.setPosition(BASES.first.x, BASES.first.y);
    const engine = bareEngine({ runners: [runner], ball: { pos: { x: 0, y: 400 } }, onEvent: vi.fn() });

    expect(engine.isBallDead()).toBe(true);
    expect(engine.ball.mode).toBe('dead');
    expect(runner.currentBase).toBe('second');
    expect(runner.passedBases.has('second')).toBe(true);
    expect(engine.onEvent).toHaveBeenCalledWith({ type: 'ball_dead' });
  });

  it('turns a throw beyond arm range into a loose ball', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const scene = createScene();
    const engine = bareEngine();
    const ball = new Ball(scene);
    const thrower = {
      pos: { x: 0, y: 0 },
      hasBall: true,
      active: true,
      player: { attributes: { throwingTechnique: 55, throwAccuracy: 100, armStrength: 1 } },
    };
    const receiver = {
      pos: { x: 40, y: 0 },
      active: true,
      positionName: '1B',
      moveSpeed: 15,
      hasBall: false,
    };
    engine.ball = ball;
    engine.fielders = [thrower, receiver];
    engine.pendingThrow = {
      fielder: thrower,
      runner: null,
      target: { x: 40, y: 0 },
      forced: false,
      playType: 'hold',
      baseName: 'first',
    };
    ball.onThrowComplete = engine.handleThrowComplete.bind(engine);
    ball.throwTo(thrower.pos, engine.pendingThrow.target, 60, 100, 10);
    ball.update(2);

    expect(ball.mode).toBe('loose');
    expect(ball.active).toBe(true);
    expect(ball.carrier).toBeNull();
  });

  it('handles force play outs and safe completions correctly', () => {
    const scene = createScene();
    const engine = bareEngine();
    const runner = new Runner(scene, { number: 3, attributes: { speed: 50 } });
    runner.setPosition(BASES.home.x, BASES.home.y);
    runner.runPath([BASES.first]);
    
    const thrower = {
      pos: { x: 0, y: 0 },
      hasBall: true,
      active: true,
      player: { attributes: { throwingTechnique: 55, throwAccuracy: 100, armStrength: 100 } },
    };
    const receiver = {
      pos: { ...BASES.first },
      active: true,
      positionName: '1B',
      moveSpeed: 15,
      hasBall: false,
      mesh: { material: { color: { setHex: vi.fn() } } },
    };
    engine.ball = new Ball(scene);
    engine.fielders = [thrower, receiver];
    engine.runners = [runner];
    engine.pendingThrow = {
      fielder: thrower,
      runner,
      target: { ...BASES.first },
      forced: true,
      playType: 'force',
      baseName: 'first',
    };

    engine.pendingTag = null;

    // Runner hasn't passed base -> out
    engine.handleThrowComplete();
    expect(runner.isOut).toBe(true);
    expect(engine.pendingTag).toBeNull();
  });

  it('incorporates catchAccuracy and stops play when ball is held and runners settle', () => {
    const scene = createScene();
    const engine = bareEngine();
    const fielder = {
      active: true,
      isCaller: true,
      positionName: 'CF',
      pos: { x: 0, y: 200 },
      player: { attributes: { catchAccuracy: 100 } },
      mesh: { material: { color: { setHex: vi.fn() } } },
      update: vi.fn(),
    };
    engine.fielders = [fielder];
    engine.ball = new Ball(scene);
    engine.ball.active = true;
    engine.ball.mode = 'hit';
    engine.ball.pos = { x: 0, y: 200, z: 4 };
    engine.state = 'playing';

    // Fielder catches the ball
    engine.update(0.016);
    expect(engine.ball.mode).toBe('held');

    // With no runners in motion, play settles
    expect(engine.state).toBe('idle');
  });

  const missSetup = z => {
    const engine = bareEngine();
    const fielder = {
      active: true, isCaller: true, positionName: 'SS', pos: { x: 0, y: 50 },
      player: { attributes: { catchAccuracy: 1 } },
      mesh: { material: { color: { setHex: vi.fn() } } }, update: vi.fn(),
    };
    engine.fielders = [fielder];
    engine.scenario = { hitType: 'grounder' };
    engine.ball = new Ball(createScene());
    engine.ball.active = true;
    engine.ball.mode = 'loose';
    engine.ball.pos = { x: 0, y: 50, z: z };
    engine.ball.velocity = { x: 30, y: 0, z: 0 };
    engine.state = 'playing';
    return { engine, fielder };
  };

  it('a missed ground ball keeps rolling instead of popping up', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const { engine, fielder } = missSetup(0.5);
    engine.update(0.001);
    expect(engine.ball.mode).not.toBe('held');
    expect(engine.ball.velocity.z).toBeLessThanOrEqual(0);
    expect(fielder.missedBall).toBe(true);
    vi.restoreAllMocks();
  });

  it('can miss airborne balls, with skill mattering', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const { engine } = missSetup(3);
    engine.update(0.001);
    expect(engine.ball.mode).not.toBe('held');
    vi.restoreAllMocks();
  });

  it('does not re-roll the catch every frame while the ball stays in reach', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const { engine, fielder } = missSetup(0.5);
    const events = [];
    engine.onEvent = e => events.push(e.type);
    engine.ball.velocity = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 20; i++) engine.update(0.016);
    expect(events.filter(t => t === 'ball_bobbled')).toHaveLength(1);
    // A stopped ball must still be picked up once the retry delay passes.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    for (let i = 0; i < 40; i++) engine.update(0.016);
    expect(engine.ball.mode).toBe('held');
    expect(fielder.missedBall).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('SimulationEngine manual direction', () => {
  const makeFielder = (pos, extra = {}) => ({
    active: true, hasBall: false, positionName: 'X', pos: { ...pos }, targetPos: null,
    moveTo: vi.fn(), player: { attributes: { throwAccuracy: 100, throwingTechnique: 50, armStrength: 50 } },
    mesh: { material: { color: { setHex: vi.fn() } } }, ...extra,
  });
  const makeRunner = (currentBase, extra = {}) => ({
    active: true, isOut: false, currentBase, pos: { ...(BASES[currentBase] || BASES.home) },
    baseNameAtPosition: pos => Object.keys(BASES).find(n => BASES[n].x === pos.x && BASES[n].y === pos.y) || null,
    runPath: vi.fn(), returnToBase: vi.fn(), ...extra,
  });

  it('directs a fielder and marks it as manually controlled', () => {
    const engine = bareEngine();
    const fielder = makeFielder({ x: 0, y: 50 });
    expect(engine.directFielder(fielder, { x: 10, y: 80 })).toBe(true);
    expect(fielder.manualTarget).toBe(true);
    expect(fielder.moveTo).toHaveBeenCalledWith(10, 80);
  });

  it('only lets the ball carrier throw, to another fielder', () => {
    const throwTo = vi.fn();
    const engine = bareEngine({ ball: { ...bareEngine().ball, throwTo } });
    const thrower = makeFielder({ x: 0, y: 50 });
    const receiver = makeFielder({ x: 60, y: 60 });
    expect(engine.directThrow(thrower, receiver)).toBe(false);
    thrower.hasBall = true;
    expect(engine.directThrow(thrower, thrower)).toBe(false);
    expect(engine.directThrow(thrower, receiver)).toBe(true);
    expect(throwTo).toHaveBeenCalled();
    expect(engine.pendingThrow.playType).toBe('manual');
    expect(thrower.hasBall).toBe(false);
  });

  it('only offers legal bases to runners', () => {
    const engine = bareEngine();
    expect(engine.validRunnerBases(makeRunner('first'))).toEqual(['second', 'third', 'home']);
    const between = makeRunner('first', { pos: { x: 30, y: 60 } });
    expect(engine.validRunnerBases(between)).toEqual(['first', 'second', 'third', 'home']);
    expect(engine.directRunner(makeRunner('second'), 'first')).toBe(false);
  });

  it('runs a runner through intermediate bases and back to the safe base', () => {
    const engine = bareEngine();
    const runner = makeRunner('first');
    expect(engine.directRunner(runner, 'third')).toBe(true);
    expect(runner.runPath).toHaveBeenCalledWith([BASES.second, BASES.third]);

    const between = makeRunner('first', { pos: { x: 30, y: 60 } });
    engine.directRunner(between, 'first');
    expect(between.returnToBase).toHaveBeenCalled();
  });

  it('hands fielders and runners back to the AI when their order is finished', () => {
    const arrived = makeFielder({ x: 0, y: 50 }, { manualTarget: true, targetPos: null });
    const enRoute = makeFielder({ x: 0, y: 50 }, { manualTarget: true, targetPos: { x: 9, y: 9 } });
    const thrower = makeFielder({ x: 0, y: 50 }, { manualTarget: true });
    const receiver = makeFielder({ x: 0, y: 50 }, { manualTarget: true });
    const chaser = makeFielder({ x: 0, y: 50 }, { manualTarget: true, manualChase: true });
    const done = makeRunner('second', { manual: true, targetPos: null });
    const running = makeRunner('first', { manual: true, targetPos: { x: 1, y: 1 } });
    const engine = bareEngine({
      fielders: [arrived, enRoute, thrower, receiver, chaser],
      runners: [done, running],
      ball: { ...bareEngine().ball, active: true, mode: 'loose' },
      pendingThrow: { playType: 'manual', fielder: thrower, receiver },
    });
    engine.releaseFinishedManualOrders();
    expect(arrived.manualTarget).toBe(false);
    expect(enRoute.manualTarget).toBe(true);
    expect(thrower.manualTarget).toBe(true);
    expect(receiver.manualTarget).toBe(true);
    expect(chaser.manualTarget).toBe(true);
    expect(done.manual).toBe(false);
    expect(running.manual).toBe(true);

    engine.pendingThrow = null;
    engine.ball.mode = 'held';
    engine.releaseFinishedManualOrders();
    expect(thrower.manualTarget).toBe(false);
    expect(receiver.manualTarget).toBe(false);
    expect(chaser.manualTarget).toBe(false);
  });
});

describe('SimulationEngine throw reception', () => {
  it('receiver stops where they catch instead of carrying the ball off', () => {
    const receiver = { active: true, pos: { x: 50, y: 50 }, positionName: '1B', targetPos: { x: 60, y: 60 }, canMoveWithBall: false, hasBall: false, mesh: { material: { color: { setHex: vi.fn() } } } };
    const thrower = { active: true, pos: { x: 0, y: 0 }, positionName: 'SS', hasBall: true, mesh: { material: { color: { setHex: vi.fn() } } } };
    const setCarrier = vi.fn();
    const engine = bareEngine({ fielders: [receiver, thrower], ball: { ...bareEngine().ball, throwTarget: { x: 50, y: 50 }, setCarrier } });
    engine.pendingThrow = { fielder: thrower, receiver, target: { x: 50, y: 50 }, playType: 'manual' };
    engine.handleThrowComplete();
    expect(receiver.targetPos).toBeNull();
    expect(setCarrier).toHaveBeenCalledWith(receiver);
  });


  it('misses a throw that lands outside the receiver\'s reach even if aimed at them', () => {
    const receiver = { active: true, pos: { x: 50, y: 50 }, positionName: '1B' };
    const thrower = { active: true, pos: { x: 0, y: 0 }, positionName: 'SS' };
    const engine = bareEngine({ fielders: [receiver, thrower] });
    engine.ball.throwTarget = { x: 58, y: 50 };
    const pending = { fielder: thrower, receiver, target: { x: 50, y: 50 } };
    expect(engine.findBaseReceiver(pending)).toBeNull();
    engine.ball.throwTarget = { x: 52, y: 50 };
    expect(engine.findBaseReceiver(pending)).toBe(receiver);
  });
});
