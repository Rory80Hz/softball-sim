import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ATTRIBUTES,
  clampAttribute,
  createPlayer,
} from '../src/models/Player.js';
import {
  createDefaultTeam,
  createTeam,
  nextBattingOrder,
  unusedPosition,
} from '../src/models/Team.js';

 describe('player model', () => {
  it('creates players with defaults and supplied values', () => {
    const player = createPlayer({ name: 'Sam', position: 'SS', battingOrder: 4, attributes: { speed: 90 } });

    expect(player).toMatchObject({ name: 'Sam', position: 'SS', battingOrder: 4, number: 4 });
    expect(player.attributes).toEqual({ ...DEFAULT_ATTRIBUTES, speed: 90 });
    expect(player.id).toMatch(/^player/);
  });

  it('clamps invalid attributes to the inclusive integer range', () => {
    expect(clampAttribute(-4)).toBe(1);
    expect(clampAttribute(42.7)).toBe(43);
    expect(clampAttribute(120)).toBe(100);
    expect(clampAttribute('not a number')).toBe(1);
  });

  it('generates unique player ids', () => {
    expect(createPlayer().id).not.toBe(createPlayer().id);
  });
});

describe('team model', () => {
  it('creates an empty team with a generated id', () => {
    expect(createTeam('Test')).toEqual(expect.objectContaining({ name: 'Test', players: [] }));
  });

  it('creates a complete default roster', () => {
    const team = createDefaultTeam('Home Sluggers');

    expect(team.players).toHaveLength(10);
    expect(team.players.map(player => player.position)).toEqual([
      'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF',
    ]);
    expect(new Set(team.players.map(player => player.id)).size).toBe(10);
    expect(team.players.map(player => player.battingOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('finds the next batting order and unused position', () => {
    const team = createTeam();
    team.players = [
      createPlayer({ battingOrder: 1, position: 'P' }),
      createPlayer({ battingOrder: 3, position: 'C' }),
    ];

    expect(nextBattingOrder(team)).toBe(2);
    expect(unusedPosition(team)).toBe('1B');
  });
});
